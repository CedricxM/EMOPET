import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderCompanyOsViews } from './generate-company-os-views.mjs';
import { CONTROLLED_STATE_PATHS, proposeCompanyTransitions } from './propose-company-transitions.mjs';
import { prepareReviewedTransitionAppend } from './prepare-reviewed-transition-append.mjs';
import { finalizeReviewedTransitionAppend } from './finalize-reviewed-transition-append.mjs';
import { assertSourceSnapshotIncludedInBase, verifySourceSnapshotMergedInBase } from './verify-transition-source-snapshot.mjs';
import { inspectTransitionWorkflow } from './transition-workflow-status.mjs';\nimport { renderTransitionReviewPacket } from './transition-review-packet.mjs';

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
  metrics: 'state/metrics/metrics.json',
  risks: 'state/risks/risk-register.json',
  unknowns: 'state/unknowns/critical-unknowns.json',
  corporate: 'state/corporate/corporate-state.json',
  corporateSchema: 'state/corporate/corporate-state.schema.json',
  freshness: 'state/freshness/freshness-state.json',
  freshnessSchema: 'state/freshness/freshness-state.schema.json',
  schemaMap: 'state/schemas/registry-schema-map.json',
  transitions: 'state/history/company-transitions.jsonl',
  transitionSchema: 'state/history/company-transition.schema.json',
  proposalQueue: 'state/history/pending-transition-proposals.json',
  proposalSchema: 'state/history/company-transition-proposals.schema.json',
  reviewedAppendSchema: 'state/history/reviewed-transition-append.schema.json',
};

const company = readJson(paths.company);
const milestone = readJson(paths.milestone);
const matExperiment = readJson(paths.matExperiment);
const tagExperiment = readJson(paths.tagExperiment);
const finance = readJson(paths.finance);
const preseed = readJson(paths.preseed);
const metricsState = readJson(paths.metrics);
const riskState = readJson(paths.risks);
const unknownState = readJson(paths.unknowns);
const corporateState = readJson(paths.corporate);
const corporateSchema = readJson(paths.corporateSchema);
const freshnessState = readJson(paths.freshness);
const freshnessSchema = readJson(paths.freshnessSchema);
const schemaMap = readJson(paths.schemaMap);
const transitionSchema = readJson(paths.transitionSchema);
const proposalQueue = readJson(paths.proposalQueue);
const proposalSchema = readJson(paths.proposalSchema);
const reviewedAppendSchema = readJson(paths.reviewedAppendSchema);
const transitionEvents = readText(paths.transitions)
  .split(/\r?\n/)
  .filter((line) => line.trim().length > 0)
  .map((line) => JSON.parse(line));

const allObjects = [
  company.company_phase,
  ...company.workstreams,
  ...company.critical_gates,
  milestone,
  matExperiment,
  tagExperiment,
  preseed,
  ...metricsState.metrics,
  ...riskState.risks,
  ...unknownState.unknowns,
  corporateState.entity,
  corporateState.governance,
  ...corporateState.rights_gates,
];

function refsFrom(object) {
  return [
    ...(object.authority_refs ?? []),
    ...(object.evidence_refs ?? []),
    ...(object.refs ?? []),
    ...(object.blocking_refs ?? []),
    ...(object.decision_refs ?? []),
    ...(object.mitigation_refs ?? []),
    ...(object.next_evidence_refs ?? []),
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

function resolveLocalSchemaRef(rootSchema, ref) {
  assert.match(ref, /^#\//, `only local schema refs are supported: ${ref}`);
  return ref
    .slice(2)
    .split('/')
    .map((part) => part.replaceAll('~1', '/').replaceAll('~0', '~'))
    .reduce((node, part) => node?.[part], rootSchema);
}

function schemaTypeMatches(value, type) {
  if (type === 'null') return value === null;
  if (type === 'array') return Array.isArray(value);
  if (type === 'object') return value !== null && typeof value === 'object' && !Array.isArray(value);
  if (type === 'integer') return Number.isInteger(value);
  if (type === 'number') return typeof value === 'number' && Number.isFinite(value);
  return typeof value === type;
}

function validateAgainstSchema(value, schema, rootSchema, label) {
  if (schema.$ref) {
    const resolved = resolveLocalSchemaRef(rootSchema, schema.$ref);
    assert.ok(resolved, `${label} unresolved schema ref ${schema.$ref}`);
    validateAgainstSchema(value, resolved, rootSchema, label);
    return;
  }

  if (schema.anyOf) {
    let matched = false;
    for (const candidate of schema.anyOf) {
      try {
        validateAgainstSchema(value, candidate, rootSchema, label);
        matched = true;
        break;
      } catch {
        // Try the next allowed shape.
      }
    }
    assert.ok(matched, `${label} must satisfy at least one anyOf schema`);
  }

  if (schema.type) {
    const allowed = Array.isArray(schema.type) ? schema.type : [schema.type];
    assert.ok(
      allowed.some((type) => schemaTypeMatches(value, type)),
      `${label} has invalid type; expected ${allowed.join('|')}`,
    );
  }

  if (Object.hasOwn(schema, 'const')) {
    assert.deepEqual(value, schema.const, `${label} must equal schema const`);
  }
  if (schema.enum) {
    assert.ok(schema.enum.includes(value), `${label} must be one of schema enum values`);
  }
  if (schema.pattern && typeof value === 'string') {
    assert.match(value, new RegExp(schema.pattern), `${label} does not match schema pattern`);
  }
  if (schema.minLength && typeof value === 'string') {
    assert.ok(value.length >= schema.minLength, `${label} is shorter than minLength`);
  }
  if (schema.format === 'date' && typeof value === 'string') {
    assert.match(value, /^\d{4}-\d{2}-\d{2}$/, `${label} must use YYYY-MM-DD`);
  }
  if (typeof value === 'number') {
    if (schema.minimum !== undefined) assert.ok(value >= schema.minimum, `${label} is below minimum`);
    if (schema.maximum !== undefined) assert.ok(value <= schema.maximum, `${label} exceeds maximum`);
  }

  if (Array.isArray(value)) {
    if (schema.minItems !== undefined) {
      assert.ok(value.length >= schema.minItems, `${label} has fewer than minItems`);
    }
    if (schema.uniqueItems) {
      const encoded = value.map((item) => JSON.stringify(item));
      assert.equal(encoded.length, new Set(encoded).size, `${label} must contain unique items`);
    }
    if (schema.items) {
      value.forEach((item, index) =>
        validateAgainstSchema(item, schema.items, rootSchema, `${label}[${index}]`),
      );
    }
  }

  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    for (const required of schema.required ?? []) {
      assert.ok(Object.hasOwn(value, required), `${label} missing required property ${required}`);
    }

    if (schema.minProperties !== undefined) {
      assert.ok(
        Object.keys(value).length >= schema.minProperties,
        `${label} has fewer than minProperties`,
      );
    }

    const properties = schema.properties ?? {};
    for (const [key, nested] of Object.entries(value)) {
      if (properties[key]) {
        validateAgainstSchema(nested, properties[key], rootSchema, `${label}.${key}`);
        continue;
      }

      if (schema.additionalProperties === false) {
        assert.fail(`${label} has unexpected property ${key}`);
      }
      if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
        validateAgainstSchema(
          nested,
          schema.additionalProperties,
          rootSchema,
          `${label}.${key}`,
        );
      }
    }
  }
}

test('Company OS machine-readable files parse and keep stable unique IDs', () => {
  assert.equal(company.schema_version, '0.1.0');
  assert.match(company.snapshot.base_sha, /^[0-9a-f]{40}$/);
  assert.equal(company.snapshot.base_ref, 'main');
  assert.equal(corporateState.schema_version, '0.1.0');
  assert.match(corporateState.snapshot.base_sha, /^[0-9a-f]{40}$/);
  assert.equal(corporateState.snapshot.base_ref, 'main');
  assert.equal(corporateSchema.title, 'EMOPET Corporate/IP State');
  assert.equal(freshnessState.schema_version, '0.1.0');
  assert.match(freshnessState.snapshot.base_sha, /^[0-9a-f]{40}$/);
  assert.equal(freshnessState.snapshot.base_ref, 'main');
  assert.equal(freshnessSchema.title, 'EMOPET Company OS Freshness State');
  assert.equal(schemaMap.schema_version, '0.1.0');
  assert.equal(schemaMap.authority_mode, 'SCHEMA_MAP_NOT_DOMAIN_AUTHORITY');

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


test('per-registry schemas validate mapped Company OS registries', () => {
  const expectedDataPaths = new Set([
    paths.milestone,
    paths.matExperiment,
    paths.tagExperiment,
    paths.finance,
    paths.preseed,
    paths.metrics,
    paths.risks,
    paths.unknowns,
  ]);

  const mappedDataPaths = new Set(schemaMap.registries.map((entry) => entry.data_path));
  assert.equal(
    mappedDataPaths.size,
    schemaMap.registries.length,
    'registry schema map must not duplicate data paths',
  );
  assert.deepEqual(
    mappedDataPaths,
    expectedDataPaths,
    'registry schema map must cover every V1 registry file',
  );

  const schemaTitles = new Set();
  for (const entry of schemaMap.registries) {
    assert.ok(existsSync(resolve(root, entry.data_path)), `missing registry ${entry.data_path}`);
    assert.ok(existsSync(resolve(root, entry.schema_path)), `missing schema ${entry.schema_path}`);

    const data = readJson(entry.data_path);
    const schema = readJson(entry.schema_path);
    assert.match(schema.title, /^EMOPET Company OS /, `${entry.schema_path} needs a Company OS title`);
    schemaTitles.add(schema.title);
    validateAgainstSchema(data, schema, schema, entry.data_path);
  }

  assert.ok(schemaTitles.size >= 7, 'distinct registry families must retain distinct schema contracts');
});

test('cross-object Company OS dependencies resolve semantically', () => {
  const experimentsById = new Map(
    [matExperiment, tagExperiment].map((experiment) => [experiment.id, experiment]),
  );

  for (const gate of milestone.required_gates) {
    const experiment = experimentsById.get(gate.experiment_ref);
    assert.ok(experiment, `${gate.id} references unknown experiment ${gate.experiment_ref}`);
    assert.equal(
      experiment.stage,
      milestone.stage,
      `${gate.id} experiment must belong to milestone stage ${milestone.stage}`,
    );
  }

  const mappedRegistryPaths = new Set(schemaMap.registries.map((entry) => entry.data_path));
  const allowedInternalStatePaths = new Set([
    ...mappedRegistryPaths,
    paths.company,
    paths.corporate,
    paths.freshness,
  ]);

  for (const object of allObjects) {
    for (const ref of refsFrom(object)) {
      if (ref.kind !== 'path' || !ref.value.startsWith('state/')) continue;
      assert.ok(
        allowedInternalStatePaths.has(ref.value),
        `${object.id ?? object.type} points to an unregistered internal state path: ${ref.value}`,
      );
    }
  }

  for (const scenario of finance.planning_scenarios) {
    assert.ok(
      mappedRegistryPaths.has(scenario.object_ref),
      `${scenario.id} points to an unmapped finance object ${scenario.object_ref}`,
    );
  }

  const preseedScenario = finance.planning_scenarios.find(
    (scenario) => scenario.object_ref === paths.preseed,
  );
  assert.ok(preseedScenario, 'finance state must resolve the pre-seed scenario object');
  assert.equal(preseed.currency, finance.currency, 'finance and fundraising currency must agree');
  assert.deepEqual(preseedScenario.target_eur, preseed.target, 'finance and fundraising targets must agree');
  assert.deepEqual(
    preseedScenario.intended_runway_months,
    preseed.intended_runway_months,
    'finance and fundraising runway ranges must agree',
  );

  const useOfFundsTotal = Object.values(preseed.indicative_use_of_funds).reduce(
    (sum, value) => sum + value,
    0,
  );
  assert.ok(
    Math.abs(useOfFundsTotal - 1) < 1e-9,
    'fundraising indicative use-of-funds fractions must sum to 1',
  );
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

  if (matExperiment.status === 'NOT_RUN') {
    assert.equal(
      matExperiment.current_decision,
      null,
      'MAT experiment cannot carry a decision while status is NOT_RUN',
    );
  }

  if (matExperiment.current_decision !== null) {
    assert.ok(
      matExperiment.allowed_decisions.includes(matExperiment.current_decision),
      'MAT experiment decision must be one of its predeclared allowed decisions',
    );
  }

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

  if ((preseed.evidence_refs ?? []).length === 0) {
    assert.match(
      preseed.status,
      /NOT_APPROVED|PLANNING|CONDITIONAL/,
      'unevidenced fundraising state must remain planning/not-approved/conditional',
    );
    assert.equal(
      preseed.committed_eur,
      0,
      'unevidenced fundraising state cannot record committed capital',
    );
  }

  if (preseed.committed_eur > 0) {
    assert.ok(preseed.evidence_refs.length > 0, 'committed capital requires evidence_refs');
    assert.doesNotMatch(
      preseed.status,
      /NOT_APPROVED/,
      'committed capital cannot coexist with NOT_APPROVED status',
    );
  }
});

test('metrics require evidence once measured and keep thresholds preregistered', () => {
  assert.equal(metricsState.schema_version, '0.1.0');

  for (const metric of metricsState.metrics) {
    if (metric.value !== null) {
      assert.ok(
        Array.isArray(metric.evidence_refs) && metric.evidence_refs.length > 0,
        `${metric.id} has a measured value without evidence_refs`,
      );
      assert.doesNotMatch(
        metric.status,
        /NOT_MEASURED/,
        `${metric.id} cannot keep NOT_MEASURED after receiving a value`,
      );
    }

    if (metric.target && metric.target.value !== null) {
      assert.doesNotMatch(
        metric.target.status ?? '',
        /TBD_BEFORE_RUN|NOT_DEFINED/,
        `${metric.id} has a target value while its target status is still undefined`,
      );
      assert.ok(
        Array.isArray(metric.authority_refs) && metric.authority_refs.length > 0,
        `${metric.id} target values require authority_refs`,
      );
    }
  }

  const proofVelocity = metricsState.metrics.find((metric) => metric.id === 'METRIC-PROOF-VELOCITY');
  assert.ok(proofVelocity, 'Proof Velocity metric must remain explicit');
  assert.equal(proofVelocity.value, null);
  assert.equal(proofVelocity.target, null);
  assert.match(proofVelocity.anti_gaming_rule, /KILL|REDIRECT/);
  assert.match(proofVelocity.anti_gaming_rule, /PR count|commit count|feature count/i);
});

test('risk states cannot invent probability or closure evidence', () => {
  assert.equal(riskState.schema_version, '0.1.0');

  for (const risk of riskState.risks) {
    if (risk.probability !== null) {
      assert.ok(
        Array.isArray(risk.evidence_refs) && risk.evidence_refs.length > 0,
        `${risk.id} cannot assign probability without evidence_refs`,
      );
    }

    if (risk.status === 'CLOSED') {
      assert.ok(
        Array.isArray(risk.evidence_refs) && risk.evidence_refs.length > 0,
        `${risk.id} cannot close without evidence_refs`,
      );
    }
  }
});

test('critical unknowns remain explicit until evidence resolves them', () => {
  assert.equal(unknownState.schema_version, '0.1.0');

  for (const unknown of unknownState.unknowns) {
    if (unknown.status === 'RESOLVED') {
      assert.ok(
        Array.isArray(unknown.evidence_refs) && unknown.evidence_refs.length > 0,
        `${unknown.id} cannot resolve without evidence_refs`,
      );
    }

    for (const [field, estimate] of Object.entries({
      cost_to_reduce: unknown.cost_to_reduce,
      time_to_reduce: unknown.time_to_reduce,
    })) {
      if (estimate.value === null) {
        assert.match(
          estimate.status,
          /UNKNOWN/,
          `${unknown.id} ${field} null value must remain explicitly UNKNOWN`,
        );
      }
    }
  }
});

test('corporate/IP projection stays public-safe, issue-backed and non-conclusive', () => {
  assert.equal(
    corporateState.authority_mode,
    'PUBLIC_SAFE_INDEX_PROJECTION_NOT_LEGAL_SIGN_OFF',
  );
  assert.equal(corporateState.confidentiality.repository_visibility, 'PUBLIC');

  const expectedIssueRefs = new Set(['#114', '#116', '#680']);
  const actualIssueRefs = new Set(
    corporateState.rights_gates
      .flatMap((gate) => gate.authority_refs ?? [])
      .filter((ref) => ref.kind === 'issue')
      .map((ref) => ref.value),
  );

  for (const issue of expectedIssueRefs) {
    assert.ok(actualIssueRefs.has(issue), `Corporate/IP state must retain controlling issue ${issue}`);
  }

  for (const gate of corporateState.rights_gates) {
    if ((gate.evidence_refs ?? []).length === 0) {
      assert.match(
        gate.status,
        /OPEN|HOLD|REQUIRED/,
        `${gate.id} cannot imply closure without evidence`,
      );
    }
  }
});

test('freshness overlay covers Company + Corporate V2 objects and exposed evidence refs', () => {
  assert.equal(freshnessState.authority_mode, 'FRESHNESS_INDEX_NOT_DOMAIN_AUTHORITY');

  const coveredObjects = [
    company.company_phase,
    ...company.workstreams,
    ...company.critical_gates,
    corporateState.entity,
    corporateState.governance,
    ...corporateState.rights_gates,
  ];

  const expectedIds = new Set(coveredObjects.map((object) => object.id));
  const actualIds = new Set(freshnessState.objects.map((entry) => entry.target_id));

  assert.equal(actualIds.size, freshnessState.objects.length, 'freshness object targets must be unique');
  assert.deepEqual(actualIds, expectedIds, 'freshness state must cover the complete V2 Company + Corporate scope');

  const expectedEvidence = new Set(
    coveredObjects.flatMap((object) =>
      (object.evidence_refs ?? []).map((ref) => `${ref.kind}:${ref.value}`),
    ),
  );
  const actualEvidence = new Set(
    freshnessState.evidence.map((entry) => `${entry.target_ref.kind}:${entry.target_ref.value}`),
  );
  assert.deepEqual(actualEvidence, expectedEvidence, 'freshness state must cover exposed evidence refs');
});

test('freshness statuses are date-consistent and fail closed for strong claims', () => {
  const snapshotDate = freshnessState.snapshot.date;
  const entries = [...freshnessState.objects, ...freshnessState.evidence];

  for (const entry of entries) {
    assert.ok(
      freshnessState.semantics.allowed_statuses.includes(entry.freshness_status),
      `unsupported freshness status: ${entry.freshness_status}`,
    );

    if (entry.freshness_status === 'UNREVIEWED') {
      assert.ok(
        entry.last_domain_review_at === null ||
          entry.review_cadence_days === null ||
          entry.review_due_at === null ||
          entry.stale_after === null,
        'UNREVIEWED must preserve a missing controlled review input',
      );
    }

    if (entry.freshness_status === 'CURRENT') {
      assert.ok(entry.last_domain_review_at, 'CURRENT requires last_domain_review_at');
      assert.ok(entry.review_cadence_days, 'CURRENT requires review_cadence_days');
      assert.ok(entry.review_due_at, 'CURRENT requires review_due_at');
      assert.ok(entry.stale_after, 'CURRENT requires stale_after');
      assert.ok(snapshotDate < entry.review_due_at, 'CURRENT requires snapshot before review_due_at');
      assert.ok(entry.review_due_at <= entry.stale_after, 'review_due_at must not exceed stale_after');
    }

    if (entry.freshness_status === 'REVIEW_DUE') {
      assert.ok(entry.review_due_at && entry.stale_after, 'REVIEW_DUE requires review_due_at + stale_after');
      assert.ok(entry.review_due_at <= snapshotDate, 'REVIEW_DUE requires review date reached');
      assert.ok(snapshotDate < entry.stale_after, 'REVIEW_DUE must precede stale_after');
    }

    if (entry.freshness_status === 'STALE') {
      assert.ok(entry.stale_after, 'STALE requires stale_after');
      assert.ok(entry.stale_after <= snapshotDate, 'STALE requires hard stale boundary reached');
    }

    if (['UNREVIEWED', 'REVIEW_DUE', 'STALE'].includes(entry.freshness_status)) {
      assert.match(
        entry.decision_use,
        /BLOCK|CANNOT/,
        `${entry.freshness_status} entries must fail closed for freshness-dependent decisions`,
      );
    }
  }

  const freshnessById = new Map(
    freshnessState.objects.map((entry) => [entry.target_id, entry]),
  );

  for (const object of [
    company.company_phase,
    ...company.workstreams,
    ...company.critical_gates,
    corporateState.entity,
    corporateState.governance,
    ...corporateState.rights_gates,
  ]) {
    if (!isStrongEvidenceState(object.status)) continue;
    assert.equal(
      freshnessById.get(object.id)?.freshness_status,
      'CURRENT',
      `${object.id} cannot carry strong state ${object.status} unless freshness is CURRENT`,
    );
  }
});

test('generated Company OS human views stay byte-identical to machine-readable state', () => {
  const views = renderCompanyOsViews();
  for (const [path, expected] of Object.entries(views)) {
    assert.equal(
      readText(path),
      expected,
      `${path} drifted from machine-readable Company OS state; regenerate it`,
    );
  }
});

test('redacted external Company OS views do not leak planning ranges or manufacture authority', () => {
  const investorView = readText('INVESTOR_VIEW.md');
  const supplierView = readText('SUPPLIER_VIEW.md');

  assert.match(investorView, /NOT FUNDRAISING AUTHORITY/);
  assert.match(investorView, /NOT DECISION AUTHORITY/);
  assert.match(supplierView, /NOT PROCUREMENT AUTHORITY/);
  assert.match(supplierView, /NOT RELEASE AUTHORITY/);

  for (const value of Object.values(preseed.target)) {
    assert.ok(
      !investorView.includes(String(value)),
      'redacted investor view must not expose the planning raise range',
    );
  }

  for (const value of Object.values(preseed.target)) {
    assert.ok(
      !supplierView.includes(String(value)),
      'redacted supplier view must not expose the planning raise range',
    );
  }

  assert.match(
    investorView,
    /This public view intentionally excludes:/,
    'redacted investor view must disclose its redaction boundary',
  );
  assert.match(
    supplierView,
    /This public view intentionally excludes:/,
    'redacted supplier view must disclose its redaction boundary',
  );
});


test('Company Time Machine ledger is structurally valid, ordered and correction-safe', () => {
  assert.ok(transitionEvents.length >= 1, 'transition ledger must contain a bootstrap event');

  const ids = new Set();
  let previousId = null;
  let previousDate = null;

  for (const [index, event] of transitionEvents.entries()) {
    validateAgainstSchema(event, transitionSchema, transitionSchema, `transitionEvents[${index}]`);
    assert.ok(!ids.has(event.event_id), `duplicate transition event id: ${event.event_id}`);
    ids.add(event.event_id);

    if (index === 0) {
      assert.equal(event.kind, 'BOOTSTRAP', 'first transition event must be BOOTSTRAP');
      assert.equal(event.previous_event_id, null, 'bootstrap event cannot point backward');
    } else {
      assert.equal(
        event.previous_event_id,
        previousId,
        `${event.event_id} must point to the immediately preceding event`,
      );
    }

    if (event.kind === 'CORRECTION') {
      assert.ok(event.corrects_event_id, 'CORRECTION events must identify the corrected event');
      assert.ok(ids.has(event.corrects_event_id), 'CORRECTION must target an earlier ledger event');
    } else {
      assert.equal(event.corrects_event_id, null, 'non-CORRECTION events cannot set corrects_event_id');
    }

    if (previousDate !== null) {
      assert.ok(
        previousDate <= event.recorded_on,
        'transition event dates must be non-decreasing',
      );
    }

    for (const ref of [
      ...(event.authority_refs ?? []),
      ...(event.evidence_refs ?? []),
      ...(event.decision_refs ?? []),
    ]) {
      assertRef(ref, event.event_id);
    }

    previousId = event.event_id;
    previousDate = event.recorded_on;
  }
});

async function fetchBaseTransitionLedger() {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  const repository = process.env.GITHUB_REPOSITORY;

  if (!eventPath || !repository || !existsSync(eventPath)) return null;

  const event = JSON.parse(readText(eventPath));
  const baseSha = event.pull_request?.base?.sha;
  if (!baseSha) return null;

  const url =
    `https://api.github.com/repos/${repository}/contents/${paths.transitions}?ref=${baseSha}`;
  const headers = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  const response = await fetch(url, { headers });
  if (response.status === 404) return '';

  assert.equal(
    response.status,
    200,
    `failed to fetch base transition ledger: HTTP ${response.status}`,
  );

  const payload = await response.json();
  return Buffer.from(payload.content.replaceAll('\n', ''), 'base64').toString('utf8');
}

test('Company Time Machine ledger is append-only against the pull-request base', async () => {
  const baseLedger = await fetchBaseTransitionLedger();
  if (baseLedger === null) return;

  const currentLedger = readText(paths.transitions);

  if (baseLedger.length === 0) {
    assert.equal(
      transitionEvents[0]?.kind,
      'BOOTSTRAP',
      'first ledger introduction must start with a BOOTSTRAP event',
    );
    return;
  }

  assert.ok(
    currentLedger.startsWith(baseLedger),
    'existing transition ledger bytes are immutable; append new records instead of editing history',
  );
});



test('source-snapshot verifier accepts only snapshots already contained in PR base main', async () => {
  const sourceSha = '1'.repeat(40);
  const baseSha = '2'.repeat(40);

  assert.deepEqual(
    assertSourceSnapshotIncludedInBase(
      `main@${sourceSha}`,
      baseSha,
      {
        status: 'ahead',
        base_commit: { sha: sourceSha },
        merge_base_commit: { sha: sourceSha },
      },
    ),
    {
      source_sha: sourceSha,
      base_sha: baseSha,
      status: 'ahead',
    },
  );

  assert.throws(
    () =>
      assertSourceSnapshotIncludedInBase(
        `main@${sourceSha}`,
        baseSha,
        {
          status: 'diverged',
          base_commit: { sha: sourceSha },
          merge_base_commit: { sha: '3'.repeat(40) },
        },
      ),
    /not an ancestor/,
  );

  let fetchCalled = false;
  const same = await verifySourceSnapshotMergedInBase({
    repository: 'CedricxM/EMOPET',
    sourceSnapshotRef: `main@${baseSha}`,
    baseSha,
    fetchImpl: async () => {
      fetchCalled = true;
      throw new Error('must not fetch for identical SHA');
    },
  });
  assert.equal(same.status, 'identical');
  assert.equal(fetchCalled, false);
});

async function pullRequestHistoryContext() {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  const repository = process.env.GITHUB_REPOSITORY;

  if (!eventPath || !repository || !existsSync(eventPath)) return null;

  const event = JSON.parse(readText(eventPath));
  const baseSha = event.pull_request?.base?.sha;
  if (!baseSha) return null;

  return { repository, baseSha };
}

test('new Company Time Machine events cite source snapshots already merged into PR base main', async () => {
  const context = await pullRequestHistoryContext();
  if (!context) return;

  const baseLedger = await fetchBaseTransitionLedger();
  if (baseLedger === null) return;

  const baseEvents = baseLedger
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line));

  const appendedEvents = transitionEvents.slice(baseEvents.length);

  for (const event of appendedEvents) {
    await verifySourceSnapshotMergedInBase({
      repository: context.repository,
      sourceSnapshotRef: event.source_snapshot_ref,
      baseSha: context.baseSha,
      token: process.env.GITHUB_TOKEN,
    });
  }
});

test('transition append PR template preserves human review and source-snapshot checks', () => {
  const template = readText(
    '.github/PULL_REQUEST_TEMPLATE/company-transition-append.md',
  );

  assert.match(template, /human-reviewed append/i);
  assert.match(template, /already-merged main commit/i);
  assert.match(template, /ancestor of this PR's base SHA/i);
  assert.match(template, /existing ledger lines were not edited/i);
  assert.match(template, /reviewed the underlying state change/i);
});

test('transition proposal queue is review-only and schema-valid', () => {
  validateAgainstSchema(proposalQueue, proposalSchema, proposalSchema, 'proposalQueue');
  assert.equal(
    proposalQueue.authority_mode,
    'DIFF_PROPOSALS_REQUIRE_EXPLICIT_REVIEW',
  );

  for (const proposal of proposalQueue.proposals) {
    assert.equal(proposal.review_status, 'REVIEW_REQUIRED');
    assert.equal(proposal.append_ready, false);
    assert.ok(
      CONTROLLED_STATE_PATHS.includes(proposal.source_path),
      `${proposal.proposal_id} must originate from controlled Company OS state`,
    );
    for (const ref of [
      ...(proposal.authority_refs ?? []),
      ...(proposal.evidence_refs ?? []),
      ...(proposal.decision_refs ?? []),
    ]) {
      assertRef(ref, proposal.proposal_id);
    }
  }
});

test('transition proposals are deterministic diffs and never self-approve', () => {
  const before = {
    'state/company-state.json': {
      company_phase: {
        id: 'EMO-TEST-PHASE',
        status: 'OPEN',
        authority_refs: [{ kind: 'path', value: 'COMPANY.md' }],
        evidence_refs: [],
      },
    },
  };
  const after = {
    'state/company-state.json': {
      company_phase: {
        id: 'EMO-TEST-PHASE',
        status: 'PASSED',
        authority_refs: [{ kind: 'path', value: 'COMPANY.md' }],
        evidence_refs: [{ kind: 'commit', value: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' }],
      },
    },
  };

  const queue = proposeCompanyTransitions(before, after, {
    baseRef: 'main@bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    candidateRef: 'head@cccccccccccccccccccccccccccccccccccccccc',
    generatedOn: '2026-10-01',
  });

  assert.equal(queue.proposals.length, 2);
  assert.deepEqual(
    queue.proposals.map((proposal) => [proposal.kind, proposal.field]),
    [
      ['EVIDENCE_TRANSITION', 'evidence_refs'],
      ['STATE_TRANSITION', 'status'],
    ],
  );
  assert.ok(queue.proposals.every((proposal) => proposal.review_status === 'REVIEW_REQUIRED'));
  assert.ok(queue.proposals.every((proposal) => proposal.append_ready === false));

  const unchanged = proposeCompanyTransitions(after, after, {
    baseRef: 'main@cccccccccccccccccccccccccccccccccccccccc',
    candidateRef: 'head@cccccccccccccccccccccccccccccccccccccccc',
    generatedOn: '2026-10-01',
  });
  assert.equal(unchanged.proposals.length, 0);

  assert.doesNotMatch(
    readText('scripts/control/propose-company-transitions.mjs'),
    /company-transitions\.jsonl/,
    'proposal generator must not contain an automatic append path to the canonical ledger',
  );
});

test('reviewed transition append preparation requires explicit review and never writes the ledger', () => {
  const proposalQueue = {
    schema_version: '0.1.0',
    authority_mode: 'DIFF_PROPOSALS_REQUIRE_EXPLICIT_REVIEW',
    base_ref: 'main@bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    candidate_ref: 'head@cccccccccccccccccccccccccccccccccccccccc',
    generated_on: '2026-10-02',
    proposals: [
      {
        proposal_id: 'EMO-PROPOSAL-20261002-0001',
        review_status: 'REVIEW_REQUIRED',
        kind: 'STATE_TRANSITION',
        subject_id: 'EMO-TEST-PHASE',
        field: 'status',
        before_value: 'OPEN',
        after_value: 'PASSED',
        source_path: 'state/company-state.json',
        authority_refs: [{ kind: 'path', value: 'COMPANY.md' }],
        evidence_refs: [{ kind: 'commit', value: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' }],
        decision_refs: [],
        append_ready: false,
        note: 'Synthetic review fixture.',
      },
    ],
  };

  const prepared = prepareReviewedTransitionAppend(
    proposalQueue,
    transitionEvents,
    'EMO-PROPOSAL-20261002-0001',
    {
      accept: true,
      reviewedOn: '2026-10-02',
      reviewRef: { kind: 'pr', value: '#990' },
    },
  );

  validateAgainstSchema(
    prepared,
    reviewedAppendSchema,
    reviewedAppendSchema,
    'reviewedAppendCandidate',
  );

  assert.equal(
    prepared.authority_mode,
    'REVIEWED_APPEND_CANDIDATE_REQUIRES_HUMAN_PR_APPROVAL',
  );
  assert.equal(
    prepared.review_status,
    'REVIEW_RECORDED_ACCEPTED_FOR_PREPARATION',
  );
  assert.equal(prepared.finalization.append_to_ledger, false);
  assert.equal(prepared.finalization.requires_human_pr_approval, true);
  assert.equal(prepared.finalization.event_id, null);
  assert.equal(prepared.finalization.source_snapshot_ref, null);
  assert.equal(
    prepared.append_candidate.previous_event_id,
    transitionEvents.at(-1)?.event_id ?? null,
  );
  assert.equal(prepared.append_candidate.source_candidate_ref, proposalQueue.candidate_ref);

  assert.throws(
    () =>
      prepareReviewedTransitionAppend(
        proposalQueue,
        transitionEvents,
        'EMO-PROPOSAL-20261002-0001',
        {
          accept: false,
          reviewedOn: '2026-10-02',
          reviewRef: { kind: 'pr', value: '#990' },
        },
      ),
    /Explicit accept=true/,
  );

  assert.throws(
    () =>
      prepareReviewedTransitionAppend(
        proposalQueue,
        transitionEvents,
        'EMO-PROPOSAL-20261002-0001',
        {
          accept: true,
          reviewedOn: '2026-10-02',
          reviewRef: {
            kind: 'commit',
            value: 'dddddddddddddddddddddddddddddddddddddddd',
          },
        },
      ),
    /review_ref must be a path, issue or pull request reference/,
  );

  const source = readText('scripts/control/prepare-reviewed-transition-append.mjs');
  assert.doesNotMatch(
    source,
    /appendFileSync/,
    'reviewed append preparer must not append directly to the canonical ledger',
  );
  assert.match(
    source,
    /outputPath === ledgerAbsolute/,
    'reviewed append preparer must reject the canonical ledger as its output path',
  );
});

test('transition review packet renders proposals without accepting or ranking them', () => {
  const queue = {
    schema_version: '0.1.0',
    authority_mode: 'DIFF_PROPOSALS_REQUIRE_EXPLICIT_REVIEW',
    base_ref: 'main@bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    candidate_ref: 'head@cccccccccccccccccccccccccccccccccccccccc',
    generated_on: '2026-10-02',
    proposals: [
      {
        proposal_id: 'EMO-PROPOSAL-20261002-0001',
        review_status: 'REVIEW_REQUIRED',
        kind: 'STATE_TRANSITION',
        subject_id: 'EMO-TEST-PHASE',
        field: 'status',
        before_value: 'OPEN',
        after_value: 'PASSED',
        source_path: 'state/company-state.json',
        authority_refs: [{ kind: 'path', value: 'COMPANY.md' }],
        evidence_refs: [],
        decision_refs: [],
        append_ready: false,
        note: 'Synthetic review fixture.',
      },
      {
        proposal_id: 'EMO-PROPOSAL-20261002-0002',
        review_status: 'REVIEW_REQUIRED',
        kind: 'EVIDENCE_TRANSITION',
        subject_id: 'EMO-TEST-EVIDENCE',
        field: 'evidence_refs',
        before_value: [],
        after_value: [{ kind: 'commit', value: 'a'.repeat(40) }],
        source_path: 'state/company-state.json',
        authority_refs: [],
        evidence_refs: [{ kind: 'commit', value: 'a'.repeat(40) }],
        decision_refs: [],
        append_ready: false,
        note: 'Synthetic evidence fixture.',
      },
    ],
  };

  const rendered = renderTransitionReviewPacket(queue);
  assert.match(rendered, /REVIEW REQUIRED/);
  assert.match(rendered, /NOT APPROVAL/);
  assert.match(rendered, /EMO-PROPOSAL-20261002-0001/);
  assert.match(rendered, /Synthetic review fixture/);
  assert.match(rendered, /Source order is not a priority ranking/);
  assert.match(rendered, /Do not treat this packet as that review reference/);

  const focused = renderTransitionReviewPacket(queue, {
    proposalId: 'EMO-PROPOSAL-20261002-0002',
  });
  assert.doesNotMatch(focused, /EMO-PROPOSAL-20261002-0001/);
  assert.match(focused, /EMO-PROPOSAL-20261002-0002/);

  assert.throws(
    () => renderTransitionReviewPacket(queue, { proposalId: 'UNKNOWN' }),
    /Unknown proposal ID/,
  );

  const empty = renderTransitionReviewPacket({ ...queue, proposals: [] });
  assert.match(empty, /No pending proposals/);
  assert.match(empty, /does \*\*not\*\* certify/);

  const source = readText('scripts/control/transition-review-packet.mjs');
  assert.doesNotMatch(
    source,
    /writeFileSync|appendFileSync|prepareReviewedTransitionAppend|finalizeReviewedTransitionAppend/,
    'review packet renderer must stay read-only and cannot accept, prepare, finalize or append',
  );
});

test('transition workflow status is read-only and exposes mechanical next state without approval', () => {
  const queue = {
    schema_version: '0.1.0',
    authority_mode: 'DIFF_PROPOSALS_REQUIRE_EXPLICIT_REVIEW',
    base_ref: 'main@bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    candidate_ref: 'head@cccccccccccccccccccccccccccccccccccccccc',
    generated_on: '2026-10-02',
    proposals: [
      {
        proposal_id: 'EMO-PROPOSAL-20261002-0001',
        review_status: 'REVIEW_REQUIRED',
        append_ready: false,
      },
    ],
  };

  const tail = transitionEvents.at(-1)?.event_id ?? null;

  const reviewRequired = inspectTransitionWorkflow(queue, transitionEvents);
  assert.equal(reviewRequired.mechanical_state, 'PROPOSAL_REVIEW_REQUIRED');
  assert.equal(reviewRequired.next_action_code, 'REVIEW_PROPOSAL');
  assert.equal(reviewRequired.mutates_ledger, false);
  assert.equal(reviewRequired.human_review_required, true);
  assert.equal(reviewRequired.substantive_decision_authority, false);

  const reviewedCandidate = {
    proposal_id: 'EMO-PROPOSAL-20261002-0001',
    candidate_ref: queue.candidate_ref,
    ledger_tail_event_id: tail,
    append_candidate: {
      source_candidate_ref: queue.candidate_ref,
      previous_event_id: tail,
    },
  };

  const mechanicallyReady = inspectTransitionWorkflow(
    queue,
    transitionEvents,
    reviewedCandidate,
  );
  assert.equal(
    mechanicallyReady.mechanical_state,
    'REVIEWED_CANDIDATE_READY_FOR_MANUAL_FINALIZATION_INPUTS',
  );
  assert.equal(
    mechanicallyReady.next_action_code,
    'SUPPLY_MANUAL_FINALIZATION_INPUTS',
  );
  assert.match(mechanicallyReady.next_action, /human/i);

  const stale = inspectTransitionWorkflow(
    queue,
    [
      ...transitionEvents,
      { event_id: 'EMO-TRANSITION-20261002-9999' },
    ],
    reviewedCandidate,
  );
  assert.equal(stale.mechanical_state, 'REVIEWED_CANDIDATE_STALE');

  const mismatched = inspectTransitionWorkflow(
    queue,
    transitionEvents,
    {
      ...reviewedCandidate,
      candidate_ref: 'head@dddddddddddddddddddddddddddddddddddddddd',
    },
  );
  assert.equal(
    mismatched.mechanical_state,
    'REVIEWED_CANDIDATE_SOURCE_MISMATCH',
  );

  const orphaned = inspectTransitionWorkflow(
    queue,
    transitionEvents,
    {
      ...reviewedCandidate,
      proposal_id: 'EMO-PROPOSAL-20261002-9999',
    },
  );
  assert.equal(orphaned.mechanical_state, 'REVIEWED_CANDIDATE_ORPHANED');

  const empty = inspectTransitionWorkflow(
    { ...queue, proposals: [] },
    transitionEvents,
  );
  assert.equal(empty.mechanical_state, 'NO_PENDING_PROPOSALS');

  const source = readText('scripts/control/transition-workflow-status.mjs');
  assert.doesNotMatch(
    source,
    /writeFileSync|appendFileSync|finalizeReviewedTransitionAppend/,
    'workflow status helper must stay read-only and cannot finalize or append history',
  );
  assert.match(
    source,
    /MECHANICAL_WORKFLOW_STATUS_NOT_DECISION_AUTHORITY/,
    'workflow status helper must disclose its non-authority boundary',
  );
});

test('reviewed transition finalization is explicit, manual and ledger-tail bound', () => {
  const reviewedCandidate = {
    schema_version: '0.1.0',
    authority_mode: 'REVIEWED_APPEND_CANDIDATE_REQUIRES_HUMAN_PR_APPROVAL',
    proposal_id: 'EMO-PROPOSAL-20261002-0001',
    review_status: 'REVIEW_RECORDED_ACCEPTED_FOR_PREPARATION',
    reviewed_on: '2026-10-02',
    review_ref: { kind: 'pr', value: '#1002' },
    candidate_ref: 'head@cccccccccccccccccccccccccccccccccccccccc',
    ledger_tail_event_id: transitionEvents.at(-1)?.event_id ?? null,
    append_candidate: {
      kind: 'STATE_TRANSITION',
      subject: 'EMO-TEST-PHASE',
      from_state: 'OPEN',
      to_state: 'PASSED',
      summary: 'Synthetic reviewed transition fixture.',
      source_candidate_ref: 'head@cccccccccccccccccccccccccccccccccccccccc',
      authority_refs: [{ kind: 'path', value: 'COMPANY.md' }],
      evidence_refs: [
        { kind: 'commit', value: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' },
      ],
      decision_refs: [],
      previous_event_id: transitionEvents.at(-1)?.event_id ?? null,
      corrects_event_id: null,
      confidentiality: 'PUBLIC',
    },
    finalization: {
      event_id: null,
      source_snapshot_ref: null,
      append_to_ledger: false,
      requires_human_pr_approval: true,
    },
  };

  const event = finalizeReviewedTransitionAppend(
    reviewedCandidate,
    transitionEvents,
    {
      finalize: true,
      ci: false,
      eventId: 'EMO-TRANSITION-20261002-0001',
      recordedOn: '2026-10-02',
      sourceSnapshotRef: 'main@dddddddddddddddddddddddddddddddddddddddd',
      appendPrRef: '#1010',
    },
  );

  validateAgainstSchema(event, transitionSchema, transitionSchema, 'finalizedTransition');
  assert.equal(event.previous_event_id, transitionEvents.at(-1)?.event_id ?? null);
  assert.equal(
    event.source_snapshot_ref,
    'main@dddddddddddddddddddddddddddddddddddddddd',
  );
  assert.ok(
    event.decision_refs.some((ref) => ref.kind === 'pr' && ref.value === '#1002'),
    'final event must preserve the human review reference',
  );
  assert.ok(
    event.decision_refs.some((ref) => ref.kind === 'pr' && ref.value === '#1010'),
    'final event must preserve the explicit append PR reference',
  );

  assert.throws(
    () =>
      finalizeReviewedTransitionAppend(reviewedCandidate, transitionEvents, {
        finalize: false,
        ci: false,
        eventId: 'EMO-TRANSITION-20261002-0001',
        recordedOn: '2026-10-02',
        sourceSnapshotRef: 'main@dddddddddddddddddddddddddddddddddddddddd',
        appendPrRef: '#1010',
      }),
    /Explicit finalize=true/,
  );

  assert.throws(
    () =>
      finalizeReviewedTransitionAppend(reviewedCandidate, transitionEvents, {
        finalize: true,
        ci: true,
        eventId: 'EMO-TRANSITION-20261002-0001',
        recordedOn: '2026-10-02',
        sourceSnapshotRef: 'main@dddddddddddddddddddddddddddddddddddddddd',
        appendPrRef: '#1010',
      }),
    /forbidden in CI/,
  );

  assert.throws(
    () =>
      finalizeReviewedTransitionAppend(reviewedCandidate, transitionEvents, {
        finalize: true,
        ci: false,
        eventId: 'EMO-TRANSITION-20261001-0002',
        recordedOn: '2026-10-02',
        sourceSnapshotRef: 'main@dddddddddddddddddddddddddddddddddddddddd',
        appendPrRef: '#1010',
      }),
    /eventId date must match recordedOn/,
  );

  assert.throws(
    () =>
      finalizeReviewedTransitionAppend(reviewedCandidate, transitionEvents, {
        finalize: true,
        ci: false,
        eventId: 'EMO-TRANSITION-20261002-0001',
        recordedOn: '2026-10-02',
        sourceSnapshotRef: 'head@dddddddddddddddddddddddddddddddddddddddd',
        appendPrRef: '#1010',
      }),
    /sourceSnapshotRef must use main@/,
  );

  assert.throws(
    () =>
      finalizeReviewedTransitionAppend(
        {
          ...reviewedCandidate,
          ledger_tail_event_id: 'EMO-TRANSITION-20261001-9999',
        },
        transitionEvents,
        {
          finalize: true,
          ci: false,
          eventId: 'EMO-TRANSITION-20261002-0001',
          recordedOn: '2026-10-02',
          sourceSnapshotRef: 'main@dddddddddddddddddddddddddddddddddddddddd',
          appendPrRef: '#1010',
        },
      ),
    /stale against the current ledger tail/,
  );

  assert.throws(
    () =>
      finalizeReviewedTransitionAppend(
        {
          ...reviewedCandidate,
          reviewed_on: transitionEvents[0].recorded_on,
        },
        transitionEvents,
        {
          finalize: true,
          ci: false,
          eventId: transitionEvents[0].event_id,
          recordedOn: transitionEvents[0].recorded_on,
          sourceSnapshotRef: 'main@dddddddddddddddddddddddddddddddddddddddd',
          appendPrRef: '#1010',
        },
      ),
    /Duplicate transition event ID/,
  );

  const workflow = readText('.github/workflows/security-supply-chain.yml');
  assert.doesNotMatch(
    workflow,
    /finalize-reviewed-transition-append\.mjs/,
    'CI must validate Company OS history but never invoke the transition finalizer',
  );
});

test('Company OS human views disclose projection/non-authority status', () => {
  const disclosures = {
    'STATE.md': /NOT DOMAIN AUTHORITY/,
    'MILESTONES.md': /NOT DOMAIN AUTHORITY/,
    'EXPERIMENTS.md': /NOT A SUBSTITUTE FOR CONTROLLED PROTOCOLS/,
    'FINANCE_STATE.md': /NOT ACCOUNTING AUTHORITY/,
    'METRICS.md': /NOT DOMAIN AUTHORITY/,
    'RISKS.md': /NOT DOMAIN AUTHORITY/,
    'UNKNOWNS.md': /NOT DECISION AUTHORITY/,
    'CORPORATE.md': /NOT LEGAL SIGN-OFF/,
    'FRESHNESS.md': /NOT DOMAIN AUTHORITY/,
    'FOUNDER_COCKPIT.md': /NOT DECISION AUTHORITY/,
    'INVESTOR_VIEW.md': /NOT FUNDRAISING AUTHORITY/,
    'SUPPLIER_VIEW.md': /NOT RELEASE AUTHORITY/,
    'TIME_MACHINE.md': /NOT DECISION AUTHORITY/,
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
