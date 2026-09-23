import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../../', import.meta.url);

async function text(path) {
  return readFile(new URL(path, root), 'utf8');
}

const inventory = JSON.parse(
  await text('config/privacy/non-sql-erasure-surface-inventory.json'),
);
const residue = JSON.parse(
  await text('config/privacy/erasure-residue-verification-contract.json'),
);

function surface(id) {
  const row = inventory.surfaces.find((item) => item.surface === id);
  assert.ok(row, `missing surface: ${id}`);
  return row;
}

test('non-SQL inventory remains repository-discovery evidence only', () => {
  assert.equal(
    inventory.schemaVersion,
    'emopet-non-sql-erasure-surface-inventory-v1',
  );
  assert.equal(
    inventory.status,
    'REPOSITORY_DISCOVERY_ONLY_ENVIRONMENT_AND_PROVIDER_EVIDENCE_REQUIRED',
  );
  assert.equal(inventory.claimsCompleteErasure, false);
  assert.equal(inventory.claimsProviderDeletion, false);
  assert.equal(inventory.claimsProductionAbsence, false);

  assert.deepEqual(
    inventory.surfaces.map((row) => row.surface).sort(),
    [
      'ANALYTICS_TELEMETRY',
      'BACKUPS',
      'CACHES_SEARCH_INDEXES',
      'OBJECT_MEDIA_STORAGE',
      'PROVIDER_HELD_COPIES',
    ],
  );

  for (const row of inventory.surfaces) {
    assert.equal(row.erasureProbeStatus, 'NOT_IMPLEMENTED');
    assert.equal(row.environmentEvidenceRequired, true);
    assert.ok(Array.isArray(row.requiredExternalEvidence));
    assert.ok(row.requiredExternalEvidence.length > 0);
  }
});

test('object storage remains placeholder/reference-only in repository evidence', async () => {
  const env = await text('.env.example');
  const stack = await text('docs/STACK_GAPS.md');
  const editor = await text('apps/web/components/journal/Editor.tsx');
  const dogs = await text('backend/db/schema/dogs.ts');
  const community = await text('backend/db/schema/community.ts');

  for (const key of ['S3_ENDPOINT', 'S3_BUCKET', 'S3_ACCESS_KEY', 'S3_SECRET_KEY']) {
    assert.equal(env.includes(key), true, key);
  }
  assert.match(stack, /Object storage/);
  assert.match(stack, /Cloudflare R2|UploadThing/);
  assert.match(editor, /pas d'upload S3/);
  assert.match(dogs, /photo_url/);
  assert.match(community, /media_urls/);

  assert.equal(
    surface('OBJECT_MEDIA_STORAGE').repositoryStatus,
    'PLACEHOLDER_AND_REFERENCE_FIELDS_PRESENT_NO_RUNTIME_OBJECT_STORE_FOUND',
  );
});

test('provider-held-copy inventory distinguishes active runtime integrations from placeholders', async () => {
  const notify = await text('apps/web/lib/server/notify.ts');
  const breiz = await text('apps/web/app/api/breiz/route.ts');
  const anthropicRights = await text('apps/web/lib/anthropic-rights.ts');
  const anthropicAuthority = await text('apps/web/lib/anthropic-service-authority.ts');
  const mapbox = await text('apps/web/components/bretagne-map/MapboxMap.tsx');
  const mapboxRights = await text('apps/web/lib/mapbox-rights.ts');
  const mapboxAuthority = await text('apps/web/lib/mapbox-service-authority.ts');
  const stack = await text('docs/STACK_GAPS.md');
  const securityDiscovery = await text(
    'docs/security/PRIV_SECURITY_AUDIT_SINK_DISCOVERY_2026-09-21.md',
  );

  assert.match(notify, /https:\/\/api\.resend\.com\/emails/);
  assert.match(notify, /req\.contactValue/);
  assert.match(breiz, /https:\/\/api\.anthropic\.com\/v1\/messages/);
  assert.match(breiz, /userMessage/);
  assert.match(breiz, /getControlledAnthropicEgress/);
  assert.match(anthropicRights, /EMOPET_ANTHROPIC_EGRESS_GATE/);
  assert.match(anthropicRights, /ANTHROPIC_API_KEY/);
  assert.match(anthropicAuthority, /disposition:\s*'HOLD'/);
  assert.match(mapbox, /getControlledMapboxToken/);
  assert.match(mapboxRights, /NEXT_PUBLIC_MAPBOX_TOKEN/);
  assert.match(mapboxRights, /NEXT_PUBLIC_EMOPET_MAPBOX_RIGHTS_GATE/);
  assert.match(mapboxAuthority, /disposition:\s*'HOLD'/);
  assert.match(stack, /Paiement.*schéma freemium en DB, rien de branché/s);
  assert.match(securityDiscovery, /Sentry.*PLACEHOLDER_ONLY/s);
  assert.match(securityDiscovery, /PostHog.*PLACEHOLDER_ONLY/s);

  const providers = Object.fromEntries(
    surface('PROVIDER_HELD_COPIES').providers.map((row) => [row.provider, row]),
  );
  assert.equal(providers.Resend.repositoryStatus, 'ACTIVE_ENV_GATED_RUNTIME_INTEGRATION');
  assert.equal(
    providers.Anthropic.repositoryStatus,
    'REVIEWED_AUTHORITY_GATED_RUNTIME_INTEGRATION_CURRENTLY_HOLD',
  );
  assert.equal(
    providers.Mapbox.repositoryStatus,
    'REVIEWED_AUTHORITY_GATED_CLIENT_INTEGRATION_CURRENTLY_HOLD',
  );
  assert.equal(
    providers.Stripe.repositoryStatus,
    'SCHEMA_AND_CONFIG_PLACEHOLDER_NO_RUNTIME_PAYMENT_INTEGRATION_FOUND',
  );
  assert.equal(providers.Sentry.repositoryStatus, 'PLACEHOLDER_ONLY');
  assert.equal(providers.PostHog.repositoryStatus, 'PLACEHOLDER_ONLY');

  assert.equal(
    providers['Open-Meteo'].deletionEvidence,
    'PUBLIC_TTL_POLICY_FOUND_OPERATIONAL_RECEIPT_UNVERIFIED',
  );
  assert.equal(
    providers.OpenWeatherMap.deletionEvidence,
    'AUTHORITATIVE_RETENTION_AND_SUBJECT_ERASURE_POLICY_UNVERIFIED',
  );

  for (const provider of Object.values(providers)) {
    assert.notEqual(provider.deletionEvidence, 'VERIFIED');
    assert.notEqual(provider.deletionEvidence, 'EXECUTED');
  }
});

test('cache/search inventory does not convert repository absence into production absence', async () => {
  const env = await text('.env.example');
  assert.match(env, /REDIS_URL/);

  const caches = surface('CACHES_SEARCH_INDEXES');
  assert.equal(
    caches.repositoryStatus,
    'NO_ACTIVE_REPOSITORY_INTEGRATION_FOUND_PLACEHOLDER_CONFIG_DOES_NOT_PROVE_ABSENCE',
  );
  assert.equal(inventory.claimsProductionAbsence, false);
});

test('Plausible is a real env-gated analytics integration while Sentry/PostHog remain placeholders', async () => {
  const layout = await text('apps/web/app/layout.tsx');
  const securityDiscovery = await text(
    'docs/security/PRIV_SECURITY_AUDIT_SINK_DISCOVERY_2026-09-21.md',
  );

  assert.match(layout, /NEXT_PUBLIC_PLAUSIBLE_DOMAIN/);
  assert.match(layout, /https:\/\/plausible\.io\/js\/script\.js/);
  assert.match(securityDiscovery, /Sentry.*PLACEHOLDER_ONLY/s);
  assert.match(securityDiscovery, /PostHog.*PLACEHOLDER_ONLY/s);

  assert.equal(
    surface('ANALYTICS_TELEMETRY').repositoryStatus,
    'PLAUSIBLE_ENV_GATED_RUNTIME_PRESENT_OTHER_MONITORING_PLACEHOLDERS_ONLY',
  );
});

test('backup inventory distinguishes candidate policy from disposable schema-only QA dumps', async () => {
  const schedule = JSON.parse(await text('config/privacy/retention-schedule.json'));
  const workflow = await text('.github/workflows/p0-db-baseline.yml');

  const backup = schedule.categories.find((row) => row.id === 'backups');
  assert.ok(backup);
  assert.deepEqual(backup.activeRetention, {
    mode: 'ROLLING_DURATION',
    value: 30,
    unit: 'DAYS',
  });
  assert.equal(backup.archive, 'RESTORE_ONLY_NO_PRODUCT_ANALYTICS_USE');

  assert.match(workflow, /pg_dump --schema-only/);
  assert.equal(
    surface('BACKUPS').repositoryStatus,
    'POLICY_CANDIDATE_PRESENT_NO_PRODUCT_BACKUP_LIFECYCLE_OR_ERASURE_PROOF_FOUND',
  );
});

test('repository discovery never upgrades non-SQL erasure probes', () => {
  const bySurface = Object.fromEntries(
    residue.nonSqlProbes.map((row) => [row.surface, row]),
  );

  for (const row of inventory.surfaces) {
    assert.ok(bySurface[row.surface]);
    assert.equal(bySurface[row.surface].probeStatus, 'NOT_IMPLEMENTED');
  }

  assert.equal(residue.claimsExecutableErasure, false);
  assert.equal(residue.claimsCompleteErasure, false);
});
