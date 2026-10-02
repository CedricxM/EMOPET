import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = process.cwd();
const SHA_RE = /^[0-9a-f]{40}$/;

export function parseMainSnapshotRef(sourceSnapshotRef) {
  const match = /^main@([0-9a-f]{40})$/.exec(sourceSnapshotRef ?? '');
  if (!match) {
    throw new Error('source_snapshot_ref must use main@<40-hex-sha>');
  }
  return match[1];
}

export function assertSourceSnapshotIncludedInBase(
  sourceSnapshotRef,
  baseSha,
  comparison,
) {
  const sourceSha = parseMainSnapshotRef(sourceSnapshotRef);

  if (!SHA_RE.test(baseSha ?? '')) {
    throw new Error('baseSha must be a full 40-hex commit SHA');
  }

  if (sourceSha === baseSha) {
    return {
      source_sha: sourceSha,
      base_sha: baseSha,
      status: 'identical',
    };
  }

  if (!comparison || typeof comparison !== 'object') {
    throw new Error('GitHub comparison evidence is required');
  }

  if (comparison.base_commit?.sha !== sourceSha) {
    throw new Error('GitHub comparison base does not match source_snapshot_ref');
  }

  if (comparison.merge_base_commit?.sha !== sourceSha) {
    throw new Error(
      'source_snapshot_ref is not an ancestor of the pull-request base on main',
    );
  }

  if (!['ahead', 'identical'].includes(comparison.status)) {
    throw new Error(
      `pull-request base does not contain source snapshot (status=${comparison.status ?? 'unknown'})`,
    );
  }

  return {
    source_sha: sourceSha,
    base_sha: baseSha,
    status: comparison.status,
  };
}

export async function verifySourceSnapshotMergedInBase({
  repository,
  sourceSnapshotRef,
  baseSha,
  token,
  fetchImpl = fetch,
}) {
  if (typeof repository !== 'string' || !repository.includes('/')) {
    throw new Error('repository must use owner/name');
  }

  const sourceSha = parseMainSnapshotRef(sourceSnapshotRef);
  if (!SHA_RE.test(baseSha ?? '')) {
    throw new Error('baseSha must be a full 40-hex commit SHA');
  }

  if (sourceSha === baseSha) {
    return assertSourceSnapshotIncludedInBase(
      sourceSnapshotRef,
      baseSha,
      null,
    );
  }

  const headers = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const url =
    `https://api.github.com/repos/${repository}/compare/${sourceSha}...${baseSha}`;

  const response = await fetchImpl(url, { headers });
  if (!response.ok) {
    throw new Error(
      `Failed to verify source snapshot against PR base: HTTP ${response.status}`,
    );
  }

  const comparison = await response.json();
  return assertSourceSnapshotIncludedInBase(
    sourceSnapshotRef,
    baseSha,
    comparison,
  );
}

function argValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

function pullRequestBaseFromEvent() {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!eventPath || !existsSync(eventPath)) return null;
  const event = JSON.parse(readFileSync(resolve(root, eventPath), 'utf8'));
  return event.pull_request?.base?.sha ?? null;
}

async function main() {
  const repository = argValue('--repository') ?? process.env.GITHUB_REPOSITORY;
  const sourceSnapshotRef = argValue('--source-snapshot-ref');
  const baseSha = argValue('--base-sha') ?? pullRequestBaseFromEvent();

  if (!repository) throw new Error('--repository or GITHUB_REPOSITORY is required');
  if (!sourceSnapshotRef) throw new Error('--source-snapshot-ref is required');
  if (!baseSha) throw new Error('--base-sha or pull-request event base SHA is required');

  const result = await verifySourceSnapshotMergedInBase({
    repository,
    sourceSnapshotRef,
    baseSha,
    token: process.env.GITHUB_TOKEN,
  });

  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : null;
if (invokedPath && fileURLToPath(import.meta.url) === invokedPath) {
  await main();
}
