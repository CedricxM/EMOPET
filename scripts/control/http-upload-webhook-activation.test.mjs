import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const registry = JSON.parse(
  await readFile(
    new URL('../../config/security/http-upload-webhook-authority-v1.json', import.meta.url),
    'utf8',
  ),
);

async function walk(dir, predicate) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await walk(full, predicate));
    else if (predicate(full)) out.push(full);
  }
  return out;
}

const routeFiles = [
  ...await walk(path.join(root, 'backend/api/routes'), (file) => file.endsWith('.ts')),
  ...await walk(
    path.join(root, 'apps/web/app/api'),
    (file) => path.basename(file) === 'route.ts',
  ),
];

function rel(file) {
  return path.relative(root, file).replaceAll(path.sep, '/');
}

function normalizedRows(kind) {
  const key = kind === 'upload' ? 'uploadSurfaces' : 'webhookSurfaces';
  return registry[key] ?? [];
}

async function requireRegisteredEvidence(kind, detectedFiles) {
  const rows = normalizedRows(kind);

  for (const file of detectedFiles) {
    const row = rows.find((candidate) => candidate.routeFile === file);
    assert.ok(
      row,
      `${kind} activation detected in ${file} but no controlled registry row exists`,
    );
    assert.equal(row.status, 'ACTIVE_WITH_EVIDENCE');
    assert.equal(typeof row.evidenceTest, 'string');
    assert.ok(row.evidenceTest.length > 0);
    await access(path.join(root, row.evidenceTest));
  }

  for (const row of rows) {
    assert.ok(
      detectedFiles.includes(row.routeFile),
      `registered ${kind} surface ${row.routeFile} is not detected in active routes`,
    );
  }
}

test('active HTTP routes cannot silently introduce multipart/file-upload capability', async () => {
  const detected = [];

  for (const file of routeFiles) {
    const source = await readFile(file, 'utf8');

    const activatesFileCapableBody =
      /\.formData\s*\(/.test(source)
      || /\.parseBody\s*\(/.test(source)
      || /multipart\/form-data/i.test(source);

    if (activatesFileCapableBody) detected.push(rel(file));
  }

  await requireRegisteredEvidence('upload', detected);

  if (normalizedRows('upload').length === 0) {
    assert.deepEqual(detected, []);
  }
});

test('active HTTP routes cannot silently introduce webhook endpoints', async () => {
  const detected = [];

  for (const file of routeFiles) {
    const relative = rel(file);
    const source = await readFile(file, 'utf8');

    const pathLooksLikeWebhook = /(^|\/)webhooks?(\/|$)/i.test(relative);
    const declaredHonoWebhookPath =
      /\.(?:get|post|put|patch|delete)\s*\(\s*['"`][^'"`]*webhooks?[^'"`]*['"`]/i.test(source);

    if (pathLooksLikeWebhook || declaredHonoWebhookPath) detected.push(relative);
  }

  await requireRegisteredEvidence('webhook', detected);

  if (normalizedRows('webhook').length === 0) {
    assert.deepEqual(detected, []);
  }
});

test('authority remains explicitly non-activating while registries are empty', () => {
  assert.match(registry.status, /NO_ACTIVE_SURFACES_CONFIRMED/);
  assert.equal(registry.nonEffects.uploadRuntimeAuthorized, false);
  assert.equal(registry.nonEffects.webhookRuntimeAuthorized, false);
  assert.equal(registry.nonEffects.productionReleaseAuthorized, false);

  assert.ok(registry.requiredUploadControls.includes('BOUNDED_BODY_SIZE'));
  assert.ok(registry.requiredUploadControls.includes('CONTENT_TYPE_ALLOWLIST'));
  assert.ok(
    registry.requiredWebhookControls.includes('ORIGIN_OR_INTEGRITY_AUTHENTICATION'),
  );
  assert.ok(
    registry.requiredWebhookControls.includes('FRESHNESS_AND_REPLAY_HANDLING'),
  );
});
