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

async function main() {
  const repository = process.env.GITHUB_REPOSITORY;
  const expectedSha = process.env.CODEQL_EXPECTED_SHA;
  const token = process.env.GITHUB_TOKEN;
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository ?? '') ||
      !/^[a-f0-9]{40}$/.test(expectedSha ?? '') || !token) {
    throw new Error('Repository, exact commit SHA and GitHub Actions read token are required.');
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
    if (!response.ok) throw new Error(`GitHub Actions evidence request failed: HTTP ${response.status}.`);
    return response.json();
  }

  // Default setup runs independently of this workflow. Missing/disabled analysis
  // times out as a failure; an older commit or a skipped job cannot satisfy it.
  const deadline = Date.now() + 8 * 60_000;
  while (Date.now() < deadline) {
    const listing = await get(`actions/runs?head_sha=${expectedSha}&per_page=100`);
    const run = selectCodeqlRun(listing.workflow_runs, expectedSha);
    if (run?.status === 'completed') {
      const jobListing = await get(`actions/runs/${run.id}/jobs?filter=latest&per_page=100`);
      if (jobListing.total_count !== jobListing.jobs.length) {
        throw new Error('Incomplete CodeQL job inventory.');
      }
      requireCodeqlAnalysis(run, jobListing.jobs, expectedSha);
      const confirmed = await get(`actions/runs/${run.id}`);
      requireCodeqlAnalysis(confirmed, jobListing.jobs, expectedSha);
      if (confirmed.run_attempt !== run.run_attempt) throw new Error('CodeQL attempt changed during verification.');

      const evidence = {
        repository, headSha: expectedSha, workflowPath,
        runId: run.id, runAttempt: run.run_attempt,
        url: `https://github.com/${repository}/actions/runs/${run.id}`,
        conclusion: run.conclusion,
        jobs: jobListing.jobs.map((job) => ({ id: job.id, name: job.name, conclusion: job.conclusion })),
      };
      writeFileSync('codeql-default-setup-evidence.json', `${JSON.stringify(evidence, null, 2)}\n`);
      if (process.env.GITHUB_STEP_SUMMARY) {
        appendFileSync(process.env.GITHUB_STEP_SUMMARY,
          `CodeQL default setup analysis/upload PASS for \`${expectedSha}\`: [run ${run.id}](${evidence.url}).\n`);
      }
      console.log(`CodeQL analysis/upload PASS for ${expectedSha}: ${evidence.url}`);
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
