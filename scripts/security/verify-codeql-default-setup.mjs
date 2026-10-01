import { appendFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

const workflowPath = 'dynamic/github-code-scanning/codeql';
const requiredJobs = [
  'Analyze (actions)',
  'Analyze (c-cpp)',
  'Analyze (csharp)',
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

export function requireCodeqlRunSuccess(run, jobs, expectedSha) {
  if (!run || run.path !== workflowPath || run.event !== 'dynamic' || run.head_sha !== expectedSha) {
    throw new Error('No GitHub-managed CodeQL run for the exact requested commit.');
  }
  if (run.status !== 'completed' || run.conclusion !== 'success') {
    throw new Error(`CodeQL run ${run.id} is ${run.status}/${run.conclusion}; successful analysis is required.`);
  }
  if (!Array.isArray(jobs) || jobs.some((job) => job.status !== 'completed' || job.conclusion !== 'success')) {
    throw new Error('Every CodeQL job must complete successfully.');
  }
  for (const name of requiredJobs) {
    const job = jobs.find((candidate) => candidate.name === name);
    if (!job || job.status !== 'completed' || job.conclusion !== 'success') {
      throw new Error(`Missing successful CodeQL job: ${name}.`);
    }
  }
}

export function requireCodeqlCheckRunEvidence(checkRuns) {
  if (!Array.isArray(checkRuns)) throw new Error('CodeQL check-run inventory must be an array.');

  for (const name of requiredJobs) {
    const check = checkRuns.find((candidate) =>
      candidate.name === name &&
      candidate.app?.name === 'GitHub Actions'
    );
    if (!check || check.status !== 'completed' || check.conclusion !== 'success') {
      throw new Error(`Missing successful exact-head CodeQL check-run: ${name}.`);
    }
  }

  const aggregate = checkRuns.find((candidate) =>
    candidate.name === 'CodeQL' &&
    candidate.app?.name === 'GitHub Advanced Security'
  );
  if (!aggregate || aggregate.status !== 'completed' || aggregate.conclusion !== 'success') {
    throw new Error('Missing successful GitHub Advanced Security CodeQL check.');
  }
}

export function requireCodeqlAnalysis(run, jobs, expectedSha) {
  requireCodeqlRunSuccess(run, jobs, expectedSha);
  for (const name of requiredJobs) {
    const job = jobs.find((candidate) => candidate.name === name);
    const analysis = job?.steps?.find((step) => step.name === 'Perform CodeQL Analysis');
    if (!analysis || analysis.status !== 'completed' || analysis.conclusion !== 'success') {
      throw new Error(`Missing successful analysis/upload step: ${name}.`);
    }
  }
}

export function isRetryableGitHubEvidenceStatus(status) {
  return (
    status === 408 ||
    status === 425 ||
    status === 429 ||
    (Number.isInteger(status) && status >= 500 && status <= 599)
  );
}

export function normalizePullRequestNumber(value) {
  if (value == null || String(value).trim() === '') return null;
  if (!/^\d+$/.test(String(value)) || Number(value) < 1 || !Number.isSafeInteger(Number(value))) {
    throw new Error('CODEQL_PR_NUMBER must be a positive integer when supplied.');
  }
  return Number(value);
}

const DOCUMENTATION_ONLY_PATH = /^(?:docs\/.*\.(?:md|mdx|txt)|README\.md|ARCHITECTURE\.md|CONTRIBUTING\.md|SECURITY\.md)$/i;

export function isDocumentationOnlyPullRequestFiles(files) {
  if (!Array.isArray(files) || files.length === 0) return false;

  return files.every((file) => {
    const filename = typeof file?.filename === 'string' ? file.filename : '';
    const previous = typeof file?.previous_filename === 'string' ? file.previous_filename : null;

    if (!DOCUMENTATION_ONLY_PATH.test(filename)) return false;
    if (previous && !DOCUMENTATION_ONLY_PATH.test(previous)) return false;
    return true;
  });
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
    const url = `https://api.github.com/repos/${repository}/${path}`;
    let lastError;

    for (let attempt = 1; attempt <= 4; attempt += 1) {
      try {
        const response = await fetch(url, {
          headers: {
            Accept: 'application/vnd.github+json',
            Authorization: `Bearer ${token}`,
            'X-GitHub-Api-Version': '2022-11-28',
          },
          signal: AbortSignal.timeout(15_000),
        });

        if (response.ok) return response.json();

        const error = new Error(
          `GitHub evidence request failed: HTTP ${response.status}.`,
        );

        if (!isRetryableGitHubEvidenceStatus(response.status) || attempt === 4) {
          throw error;
        }

        lastError = error;
      } catch (error) {
        lastError = error;
        if (attempt === 4) throw error;
      }

      const waitMs = attempt * 1_000;
      console.log(
        `Retrying GitHub evidence request ${path} after attempt ${attempt} in ${waitMs}ms.`,
      );
      await delay(waitMs);
    }

    throw lastError ?? new Error('GitHub evidence request failed.');
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

  async function listPullRequestFiles(number) {
    const files = [];
    for (let page = 1; page <= 20; page += 1) {
      const batch = await get(`pulls/${number}/files?per_page=100&page=${page}`);
      if (!Array.isArray(batch)) throw new Error('Invalid pull-request file inventory response.');
      files.push(...batch);
      if (batch.length < 100) return files;
    }
    throw new Error('Pull-request file inventory exceeded 2000 entries; refusing an incomplete scope decision.');
  }

  if (prNumber) {
    const pullRequest = await get(`pulls/${prNumber}`);
    if (pullRequest?.head?.sha !== expectedSha) {
      throw new Error('Pull-request head SHA changed during CodeQL applicability verification.');
    }

    const changedFiles = await listPullRequestFiles(prNumber);
    if (isDocumentationOnlyPullRequestFiles(changedFiles)) {
      const { alerts, target } = await listOpenCodeqlAlerts();
      requireCodeqlAlertInventory(alerts);

      const evidence = {
        repository,
        headSha: expectedSha,
        workflowPath,
        runId: null,
        runAttempt: null,
        url: `https://github.com/${repository}/pull/${prNumber}/files`,
        conclusion: 'not_applicable_documentation_only',
        evidenceSource: 'exact-pr-file-scope',
        applicability: 'documentation-only',
        changedFiles: changedFiles.map((file) => ({
          filename: file.filename,
          status: file.status ?? null,
          previousFilename: file.previous_filename ?? null,
        })),
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
          `CodeQL exact-head analysis N/A for documentation-only PR #${prNumber} at \`${expectedSha}\`; ` +
            `${changedFiles.length} documentation file(s) verified and 0 open CodeQL alerts for ${target}.\n`,
        );
      }
      console.log(
        `CodeQL exact-head analysis N/A for documentation-only PR #${prNumber} at ${expectedSha}; ` +
          `${changedFiles.length} documentation file(s), ${target}, 0 open alerts.`,
      );
      return;
    }
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

      requireCodeqlRunSuccess(run, jobListing.jobs, expectedSha);
      let evidenceSource = 'jobs-api-analysis-steps';
      if (jobState === 'ready') {
        requireCodeqlAnalysis(run, jobListing.jobs, expectedSha);
      } else {
        // GitHub default setup can expose a completed successful job while its jobs API
        // retains only post-steps (or no steps at all). In that case, fail closed unless
        // the exact commit has successful language checks from GitHub Actions and the
        // aggregate CodeQL check from GitHub Advanced Security.
        const checkListing = await get(`commits/${expectedSha}/check-runs?per_page=100`);
        requireCodeqlCheckRunEvidence(checkListing.check_runs);
        evidenceSource = 'exact-head-check-runs';
      }

      const confirmed = await get(`actions/runs/${run.id}`);
      requireCodeqlRunSuccess(confirmed, jobListing.jobs, expectedSha);
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
        evidenceSource,
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
