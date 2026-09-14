import { appendFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

const workflowPath = 'dynamic/github-code-scanning/codeql';
const requiredJobs = [
  'Analyze (actions)',
  'Analyze (c-cpp)',
  'Analyze (javascript-typescript)',
  'Analyze (python)',
];

export function selectCodeqlRun(runs, expectedSha) {
  return runs
    .filter((run) => run.path === workflowPath && run.event === 'dynamic' && run.head_sha === expectedSha)
    .sort((a, b) => b.id - a.id)[0];
}

export function codeqlJobEvidenceState(jobs) {
  if (!Array.isArray(jobs)) return 'failed';

  if (jobs.some((job) => job.status === 'completed' && job.conclusion !== 'success')) {
    return 'failed';
  }
  if (jobs.some((job) => job.status !== 'completed')) return 'pending';

  for (const name of requiredJobs) {
    const job = jobs.find((candidate) => candidate.name === name);
    if (!job) return 'pending';
    const analysis = job.steps?.find((step) => step.name === 'Perform CodeQL Analysis');
    if (!analysis || analysis.status !== 'completed' || analysis.conclusion !== 'success') {
      return 'failed';
    }
  }
  return 'ready';
}

export function requireCodeqlAnalysis(run, jobs, expectedSha) {
  if (!run || run.path !== workflowPath || run.event !== 'dynamic' || run.head_sha !== expectedSha) {
    throw new Error('No GitHub-managed CodeQL run for the exact requested commit.');
  }
  if (run.status !== 'completed' || run.conclusion !== 'success') {
    throw new Error(`CodeQL run ${run.id} is ${run.status}/${run.conclusion}; successful analysis is required.`);
  }
  if (jobs.some((job) => job.status !== 'completed' || job.conclusion !== 'success')) {
    throw new Error('Every CodeQL job must complete successfully.');
  }
  for (const name of requiredJobs) {
    const job = jobs.find((candidate) => candidate.name === name);
    const analysis = job?.steps?.find((step) => step.name === 'Perform CodeQL Analysis');
    if (!job || analysis?.status !== 'completed' || analysis.conclusion !== 'success') {
      throw new Error(`Missing successful analysis/upload step: ${name}.`);
    }
  }
}

export function normalizePullRequestNumber(value) {
  if (value == null || String(value).trim() === '') return null;
  if (!/^\d+$/.test(String(value)) || Number(value) < 1 || !Number.isSafeInteger(Number(value))) {
    throw new Error('CODEQL_PR_NUMBER must be a positive integer when supplied.');
  }
  return Number(value);
}

function formatCodeqlAlert(alert) {
  const number = alert?.number ?? '?';
  const rule = alert?.rule?.id ?? alert?.rule?.name ?? 'unknown-rule';
  const location = alert?.most_recent_instance?.location;
  const where = location?.path
    ? `${location.path}:${location.start_line ?? '?'}`
    : 'unknown-location';
  return `#${number} ${rule} ${where}`;
}

export function requireCodeqlAlertInventory(alerts) {
  if (!Array.isArray(alerts)) throw new Error('CodeQL alert inventory must be an array.');
  for (const alert of alerts) {
    if (alert?.tool?.name !== 'CodeQL' || alert?.state !== 'open') {
      throw new Error('Unexpected entry in filtered CodeQL open-alert inventory.');
    }
  }
  if (alerts.length > 0) {
    const details = alerts
      .slice(0, 10)
      .map(formatCodeqlAlert)
      .join(', ');
    throw new Error(
      `CodeQL has ${alerts.length} open alert(s) in the verified target${details ? `: ${details}` : '.'}`,
    );
  }
  return alerts;
}

async function main() {
  const repository = process.env.GITHUB_REPOSITORY;
  const expectedSha = process.env.CODEQL_EXPECTED_SHA;
  const token = process.env.GITHUB_TOKEN;
  const prNumber = normalizePullRequestNumber(process.env.CODEQL_PR_NUMBER);
  const targetRef = process.env.CODEQL_REF;
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository ?? '') ||
      !/^[a-f0-9]{40}$/.test(expectedSha ?? '') || !token ||
      (!prNumber && !/^refs\/(heads|tags)\/.+/.test(targetRef ?? ''))) {
    throw new Error('Repository, exact commit SHA, GitHub token, and PR number or branch ref are required.');
  }

  async function get(path) {
    const response = await fetch(`https://api.github.com/repos/${repository}/${path}`, {
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
      },
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw new Error(`GitHub evidence request failed: HTTP ${response.status}.`);
    return response.json();
  }

  async function listOpenCodeqlAlerts() {
    const target = prNumber
      ? `pr=${prNumber}`
      : `ref=${encodeURIComponent(targetRef)}`;
    const alerts = [];
    for (let page = 1; page <= 20; page += 1) {
      const batch = await get(
        `code-scanning/alerts?${target}&state=open&tool_name=CodeQL&per_page=100&page=${page}`,
      );
      if (!Array.isArray(batch)) throw new Error('Invalid CodeQL alert inventory response.');
      alerts.push(...batch);
      if (batch.length < 100) return { alerts, target };
    }
    throw new Error('CodeQL alert inventory exceeded 2000 entries; refusing an incomplete security decision.');
  }

  // Default setup runs independently. Require all configured languages to finish
  // successfully on the exact PR head before asking GitHub's code-scanning API for
  // the native open-alert inventory. GitHub can mark the aggregate run completed a
  // few seconds before its jobs endpoint becomes fully consistent, so a completed
  // successful run with pending/missing job evidence is retried until the deadline.
  const deadline = Date.now() + 8 * 60_000;
  while (Date.now() < deadline) {
    const listing = await get(`actions/runs?head_sha=${expectedSha}&per_page=100`);
    const run = selectCodeqlRun(listing.workflow_runs, expectedSha);
    if (run?.status === 'completed') {
      if (run.conclusion !== 'success') {
        requireCodeqlAnalysis(run, [], expectedSha);
      }

      const jobListing = await get(`actions/runs/${run.id}/jobs?filter=latest&per_page=100`);
      if (jobListing.total_count !== jobListing.jobs.length) {
        console.log(`Waiting for complete CodeQL job inventory on run ${run.id}.`);
        await delay(5_000);
        continue;
      }

      const jobState = codeqlJobEvidenceState(jobListing.jobs);
      if (jobState === 'pending') {
        console.log(`Waiting for CodeQL jobs API consistency on run ${run.id}.`);
        await delay(5_000);
        continue;
      }
      if (jobState === 'failed') {
        requireCodeqlAnalysis(run, jobListing.jobs, expectedSha);
      }

      requireCodeqlAnalysis(run, jobListing.jobs, expectedSha);
      const confirmed = await get(`actions/runs/${run.id}`);
      requireCodeqlAnalysis(confirmed, jobListing.jobs, expectedSha);
      if (confirmed.run_attempt !== run.run_attempt) throw new Error('CodeQL attempt changed during verification.');

      const { alerts, target } = await listOpenCodeqlAlerts();
      requireCodeqlAlertInventory(alerts);

      const evidence = {
        repository,
        headSha: expectedSha,
        workflowPath,
        runId: run.id,
        runAttempt: run.run_attempt,
        url: `https://github.com/${repository}/actions/runs/${run.id}`,
        conclusion: run.conclusion,
        jobs: jobListing.jobs.map((job) => ({ id: job.id, name: job.name, conclusion: job.conclusion })),
        findings: {
          source: 'GitHub code-scanning alerts REST API',
          target,
          tool: 'CodeQL',
          state: 'open',
          count: alerts.length,
        },
      };
      writeFileSync('codeql-default-setup-evidence.json', `${JSON.stringify(evidence, null, 2)}\n`);
      if (process.env.GITHUB_STEP_SUMMARY) {
        appendFileSync(
          process.env.GITHUB_STEP_SUMMARY,
          `CodeQL default setup analysis/upload + open-alert inventory PASS for \`${expectedSha}\`: ` +
            `[run ${run.id}](${evidence.url}), ${target}, 0 open CodeQL alerts.\n`,
        );
      }
      console.log(
        `CodeQL analysis/upload + open-alert inventory PASS for ${expectedSha}: ` +
          `${evidence.url} / ${target} / 0 open alerts`,
      );
      return;
    }
    console.log(`Waiting for GitHub CodeQL default setup on ${expectedSha} (${run?.status ?? 'not found'}).`);
    await delay(10_000);
  }
  throw new Error('Timed out waiting for CodeQL default setup analysis/upload on the exact commit.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
