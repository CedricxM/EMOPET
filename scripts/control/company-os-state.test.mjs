import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();

function readJson(path) {
  return JSON.parse(readFileSync(resolve(root, path), 'utf8'));
}

function readText(path) {
  return readFileSync(resolve(root, path), 'utf8');
}

const paths = {
  company: 'state/company-state.json',
  milestone: 'state/milestones/MS-S1-PHYSICS.json',
  matExperiment: 'state/experiments/EXP-MAT-INCREMENTAL-001.json',
  tagExperiment: 'state/experiments/EXP-TAG-PHYSICAL-001.json',
  finance: 'state/finance/finance-state.json',
  preseed: 'state/finance/fundraising/PRESEED-CONDITIONAL-2027.json',
};

const company = readJson(paths.company);
const milestone = readJson(paths.milestone);
const matExperiment = readJson(paths.matExperiment);
const tagExperiment = readJson(paths.tagExperiment);
const finance = readJson(paths.finance);
const preseed = readJson(paths.preseed);

const allObjects = [
  company.company_phase,
  ...company.workstreams,
  ...company.critical_gates,
  milestone,
  matExperiment,
  tagExperiment,
  preseed,
];

function refsFrom(object) {
  return [
    ...(object.authority_refs ?? []),
    ...(object.evidence_refs ?? []),
    ...(object.refs ?? []),
    ...(object.blocking_refs ?? []),
  ];
}

function assertRef(ref, label) {
  assert.equal(typeof ref, 'object', `${label} reference must be an object`);
  assert.equal(typeof ref.kind, 'string', `${label} reference kind must be a string`);
  assert.equal(typeof ref.value, 'string', `${label} reference value must be a string`);
  assert.ok(ref.value.length > 0, `${label} reference value must not be empty`);

  if (ref.kind === 'path') {
    assert.ok(existsSync(resolve(root, ref.value)), `${label} path does not exist: ${ref.value}`);
  } else if (ref.kind === 'issue' || ref.kind === 'pr') {
    assert.match(ref.value, /^#\d+$/, `${label} ${ref.kind} must use #<number>`);
  } else if (ref.kind === 'commit') {
    assert.match(ref.value, /^[0-9a-f]{40}$/, `${label} commit must be a full SHA`);
  } else if (ref.kind === 'external') {
    assert.ok(ref.value.length > 0, `${label} external reference must not be empty`);
  } else {
    assert.fail(`${label} uses unsupported reference kind: ${ref.kind}`);
  }
}

function isStrongEvidenceState(status) {
  if (typeof status !== 'string') return false;
  return /(^|[^A-Z])(PASSED|VALIDATED|SIGNED|AWARDED|COMMITTED|REVIEWED_GO)([^A-Z]|$)/.test(
    status.toUpperCase(),
  );
}

test('Company OS machine-readable files parse and keep stable unique IDs', () => {
  assert.equal(company.schema_version, '0.1.0');
  assert.match(company.snapshot.base_sha, /^[0-9a-f]{40}$/);
  assert.equal(company.snapshot.base_ref, 'main');

  const ids = allObjects.map((object) => object?.id).filter(Boolean);
  assert.equal(ids.length, new Set(ids).size, 'Company OS object IDs must be unique');
});

test('Company OS repository references resolve without inventing external authority', () => {
  for (const object of allObjects) {
    for (const ref of refsFrom(object)) assertRef(ref, object.id ?? object.type ?? 'object');
  }

  for (const gate of milestone.required_gates) {
    assert.ok(gate.id, 'milestone gate must have an id');
    assert.equal(typeof gate.required, 'boolean');
    assert.ok(gate.experiment_ref, 'milestone gate must link to an experiment');
    for (const ref of gate.authority_refs ?? []) assertRef(ref, gate.id);
  }
});

test('strong Company OS states require evidence and cannot bypass required milestone gates', () => {
  for (const object of allObjects) {
    if (!isStrongEvidenceState(object.status)) continue;
    assert.ok(
      Array.isArray(object.evidence_refs) && object.evidence_refs.length > 0,
      `${object.id ?? object.type} has strong status ${object.status} without evidence_refs`,
    );
  }

  if (milestone.status === 'PASSED') {
    for (const gate of milestone.required_gates.filter((entry) => entry.required)) {
      assert.match(
        gate.status,
        /^(PASSED|CLOSED)$/,
        `required gate ${gate.id} must be PASSED/CLOSED before milestone passes`,
      );
      assert.ok(
        Array.isArray(gate.evidence_refs) && gate.evidence_refs.length > 0,
        `required gate ${gate.id} must carry evidence_refs before milestone passes`,
      );
    }
  }
});

test('experiments cannot acquire decisions without evidence', () => {
  for (const experiment of [matExperiment, tagExperiment]) {
    if (experiment.current_decision === null) continue;
    assert.ok(
      Array.isArray(experiment.evidence_refs) && experiment.evidence_refs.length > 0,
      `${experiment.id} cannot set current_decision without evidence_refs`,
    );
    assert.notEqual(experiment.status, 'NOT_RUN');
  }

  assert.equal(matExperiment.status, 'NOT_RUN');
  assert.equal(matExperiment.current_decision, null);
  assert.deepEqual(matExperiment.allowed_decisions, [
    'MAT_CORE',
    'MAT_OPTIONAL',
    'MAT_POST_V1',
    'MAT_REDIRECT',
    'MAT_KILL',
  ]);
});

test('finance state preserves unknown != zero and planning != commitment', () => {
  assert.equal(finance.currency, 'EUR');

  for (const [name, item] of Object.entries({
    cash_available: finance.actuals.cash_available,
    monthly_net_burn: finance.actuals.monthly_net_burn,
    runway_months: finance.actuals.runway_months,
  })) {
    if (item.value === null) {
      assert.match(item.status, /UNKNOWN/, `${name} null value must remain explicitly UNKNOWN`);
    }
  }

  for (const scenario of finance.planning_scenarios) {
    assert.match(
      scenario.classification,
      /PLANNING_ASSUMPTION/,
      `${scenario.id} must remain classified as a planning assumption`,
    );
    assert.doesNotMatch(
      scenario.readiness_status ?? '',
      /APPROVED|READY$/,
      `${scenario.id} must not imply fundraising approval`,
    );
  }

  assert.match(preseed.classification, /PLANNING_ASSUMPTION/);
  assert.match(preseed.status, /NOT_APPROVED/);
  assert.equal(preseed.committed_eur, 0);

  if (preseed.committed_eur > 0) {
    assert.ok(preseed.evidence_refs.length > 0, 'committed capital requires evidence_refs');
  }
});

test('Company OS human views disclose projection/non-authority status', () => {
  const disclosures = {
    'STATE.md': /NOT DOMAIN AUTHORITY/,
    'MILESTONES.md': /NOT DOMAIN AUTHORITY/,
    'EXPERIMENTS.md': /NOT A SUBSTITUTE FOR CONTROLLED PROTOCOLS/,
    'FINANCE_STATE.md': /NOT ACCOUNTING AUTHORITY/,
  };

  for (const [path, pattern] of Object.entries(disclosures)) {
    assert.match(readText(path), pattern, `${path} must disclose its non-authority boundary`);
  }
});

test('Company OS guard is enforced by the every-PR security workflow', () => {
  const workflow = readText('.github/workflows/security-supply-chain.yml');
  assert.match(
    workflow,
    /node --test scripts\/control\/company-os-state\.test\.mjs/,
  );
});
