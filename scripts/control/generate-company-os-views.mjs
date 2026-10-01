import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

function readJson(root, path) {
  return JSON.parse(readFileSync(resolve(root, path), 'utf8'));
}

function escapeCell(value) {
  return String(value ?? '')
    .replaceAll('|', '\\|')
    .replaceAll('\r\n', '\n')
    .replaceAll('\n', '<br>');
}

function renderRef(ref) {
  if (!ref) return '';
  if (ref.kind === 'path') return `\`${ref.value}\``;
  if (ref.kind === 'issue') return `issue \`${ref.value}\``;
  if (ref.kind === 'pr') return `PR \`${ref.value}\``;
  if (ref.kind === 'commit') return `commit \`${ref.value}\``;
  return `external \`${ref.value}\``;
}

function renderRefs(refs) {
  return (refs ?? []).length ? refs.map(renderRef).join(', ') : 'none recorded';
}

export function renderCompanyOsViews({ companyState, corporateState, freshnessState }) {
  const freshnessById = new Map(
    (freshnessState.objects ?? []).map((entry) => [entry.target_id, entry]),
  );
  const freshnessStatus = (id) => freshnessById.get(id)?.freshness_status ?? 'UNTRACKED';

  const stateLines = [];
  stateLines.push('# EMOPET — Current Company State');
  stateLines.push('');
  stateLines.push(`**Snapshot date:** ${companyState.snapshot.date}  `);
  stateLines.push(
    `**Snapshot base:** \`${companyState.snapshot.base_ref}@${companyState.snapshot.base_sha}\`  `,
  );
  stateLines.push('**Status:** `GENERATED COMPANY STATE PROJECTION / NOT DOMAIN AUTHORITY`  ');
  stateLines.push(
    '**Machine-readable sources:** `state/company-state.json` + `state/freshness/freshness-state.json`',
  );
  stateLines.push('');
  stateLines.push(
    '> **Generated file. Do not hand-edit.** Regenerate with `node scripts/control/generate-company-os-views.mjs`.',
  );
  stateLines.push('');
  stateLines.push(
    'This page is a generated navigation projection. The cited controlled domain authority always wins.',
  );
  stateLines.push('');
  stateLines.push('## Company phase');
  stateLines.push('');
  stateLines.push(
    `**${escapeCell(companyState.company_phase.status)}** · freshness \`${freshnessStatus(companyState.company_phase.id)}\``,
  );
  stateLines.push('');
  stateLines.push(companyState.company_phase.statement);
  stateLines.push('');
  stateLines.push(`Authority: ${renderRefs(companyState.company_phase.authority_refs)}.`);
  stateLines.push('');
  stateLines.push(`Next gate: ${companyState.company_phase.next_gate}`);
  stateLines.push('');
  stateLines.push('## Workstream snapshot');
  stateLines.push('');
  stateLines.push('| Workstream | Projection | Freshness | Next gate |');
  stateLines.push('|---|---|---|---|');
  for (const ws of companyState.workstreams) {
    stateLines.push(
      `| ${escapeCell(ws.label)} | \`${escapeCell(ws.status)}\` | \`${freshnessStatus(ws.id)}\` | ${escapeCell(ws.next_gate)} |`,
    );
  }
  stateLines.push('');
  stateLines.push('## Critical company gates');
  stateLines.push('');
  stateLines.push('| Gate | Domain | Status | Freshness | Question | References |');
  stateLines.push('|---|---|---|---|---|---|');
  for (const gate of companyState.critical_gates) {
    stateLines.push(
      `| \`${escapeCell(gate.id)}\` | ${escapeCell(gate.domain)} | \`${escapeCell(gate.status)}\` | \`${freshnessStatus(gate.id)}\` | ${escapeCell(gate.question)} | ${escapeCell(renderRefs(gate.refs))} |`,
    );
  }
  stateLines.push('');
  stateLines.push('## Freshness boundary');
  stateLines.push('');
  stateLines.push(
    'Freshness is a separate overlay. `UNREVIEWED`, `REVIEW_DUE`, and `STALE` cannot support freshness-dependent promotion into strong Company OS states. Repository recency does not reset domain freshness.',
  );
  stateLines.push('');
  stateLines.push('## Confidentiality');
  stateLines.push('');
  stateLines.push(companyState.confidentiality.rule);
  stateLines.push('');
  stateLines.push(
    'See `FRESHNESS.md`, `CORPORATE.md`, and `docs/company/EMOPET_COMPANY_OS_ARCHITECTURE_2026-10-01.md`.',
  );
  stateLines.push('');

  const corporateLines = [];
  const corporateItems = [
    corporateState.entity,
    corporateState.governance,
    ...corporateState.rights_gates,
  ];
  corporateLines.push('# EMOPET — Corporate / IP State');
  corporateLines.push('');
  corporateLines.push(`**Snapshot date:** ${corporateState.snapshot.date}  `);
  corporateLines.push(
    `**Snapshot base:** \`${corporateState.snapshot.base_ref}@${corporateState.snapshot.base_sha}\`  `,
  );
  corporateLines.push(
    '**Status:** `GENERATED PUBLIC-SAFE COMPANY OS PROJECTION / NOT LEGAL SIGN-OFF / NOT DOMAIN AUTHORITY`  ',
  );
  corporateLines.push(
    '**Machine-readable sources:** `state/corporate/corporate-state.json` + `state/freshness/freshness-state.json`',
  );
  corporateLines.push('');
  corporateLines.push(
    '> **Generated file. Do not hand-edit.** Regenerate with `node scripts/control/generate-company-os-views.mjs`.',
  );
  corporateLines.push('');
  corporateLines.push(
    'This view indexes public-safe corporate/IP state. It does not decide ownership, licensing, entity structure, equity, legal compliance or release authority.',
  );
  corporateLines.push('');
  corporateLines.push('## Current public-safe projection');
  corporateLines.push('');
  corporateLines.push('| Area | Projection | Freshness | Owner role | Authority | Next gate |');
  corporateLines.push('|---|---|---|---|---|---|');
  for (const item of corporateItems) {
    corporateLines.push(
      `| ${escapeCell(item.label)} | \`${escapeCell(item.status)}\` | \`${freshnessStatus(item.id)}\` | ${escapeCell(item.owner_role)} | ${escapeCell(renderRefs(item.authority_refs))} | ${escapeCell(item.next_gate)} |`,
    );
  }
  corporateLines.push('');
  corporateLines.push('## Confidentiality boundary');
  corporateLines.push('');
  corporateLines.push(corporateState.confidentiality.safe_projection_rule);
  corporateLines.push('');
  corporateLines.push('Forbidden public fields from the machine-readable policy:');
  corporateLines.push('');
  for (const field of corporateState.confidentiality.forbidden_public_fields) {
    corporateLines.push(`- \`${field}\``);
  }
  corporateLines.push('');
  corporateLines.push('## Decision discipline');
  corporateLines.push('');
  corporateLines.push(
    'A generated view cannot promote a declaration into chain of title, source confirmation into product-use authorization, public repository visibility into an open-source licence, or implementation into legal clearance.',
  );
  corporateLines.push('');

  const freshnessLines = [];
  const counts = new Map();
  for (const entry of [...freshnessState.objects, ...freshnessState.evidence]) {
    counts.set(entry.freshness_status, (counts.get(entry.freshness_status) ?? 0) + 1);
  }
  freshnessLines.push('# EMOPET — Freshness / STALE State');
  freshnessLines.push('');
  freshnessLines.push(`**Snapshot date:** ${freshnessState.snapshot.date}  `);
  freshnessLines.push(
    `**Snapshot base:** \`${freshnessState.snapshot.base_ref}@${freshnessState.snapshot.base_sha}\`  `,
  );
  freshnessLines.push(
    '**Status:** `GENERATED COMPANY OS FRESHNESS PROJECTION / NOT DOMAIN AUTHORITY`  ',
  );
  freshnessLines.push('**Machine-readable source:** `state/freshness/freshness-state.json`');
  freshnessLines.push('');
  freshnessLines.push(
    '> **Generated file. Do not hand-edit.** Regenerate with `node scripts/control/generate-company-os-views.mjs`.',
  );
  freshnessLines.push('');
  freshnessLines.push(
    'Freshness is orthogonal to substantive status. Git activity, a recent file edit, or a dated evidence file does not automatically make the underlying claim current.',
  );
  freshnessLines.push('');
  freshnessLines.push('## Semantics');
  freshnessLines.push('');
  freshnessLines.push('| Freshness state | Machine rule |');
  freshnessLines.push('|---|---|');
  const rules = {
    UNREVIEWED: freshnessState.semantics.unreviewed_rule,
    CURRENT: freshnessState.semantics.current_rule,
    REVIEW_DUE: freshnessState.semantics.review_due_rule,
    STALE: freshnessState.semantics.stale_rule,
    NOT_APPLICABLE:
      'Freshness does not meaningfully apply; no freshness promotion is implied.',
  };
  for (const status of freshnessState.semantics.allowed_statuses) {
    freshnessLines.push(`| \`${status}\` | ${escapeCell(rules[status] ?? '')} |`);
  }
  freshnessLines.push('');
  freshnessLines.push(`Decision rule: ${freshnessState.semantics.decision_rule}`);
  freshnessLines.push('');
  freshnessLines.push('## Coverage summary');
  freshnessLines.push('');
  freshnessLines.push(`State scope: \`${freshnessState.coverage.state_scope}\``);
  freshnessLines.push('');
  freshnessLines.push(`Evidence scope: \`${freshnessState.coverage.evidence_scope}\``);
  freshnessLines.push('');
  freshnessLines.push('| Freshness state | Count |');
  freshnessLines.push('|---|---:|');
  for (const status of freshnessState.semantics.allowed_statuses) {
    freshnessLines.push(`| \`${status}\` | ${counts.get(status) ?? 0} |`);
  }
  freshnessLines.push('');
  freshnessLines.push('## State-object freshness');
  freshnessLines.push('');
  freshnessLines.push(
    '| Target | Freshness | Last domain review | Review cadence (days) | Review due | Stale after | Decision use |',
  );
  freshnessLines.push('|---|---|---|---:|---|---|---|');
  for (const entry of freshnessState.objects) {
    freshnessLines.push(
      `| \`${entry.target_id}\` | \`${entry.freshness_status}\` | ${entry.last_domain_review_at ?? 'not recorded'} | ${entry.review_cadence_days ?? 'not recorded'} | ${entry.review_due_at ?? 'not recorded'} | ${entry.stale_after ?? 'not recorded'} | ${escapeCell(entry.decision_use)} |`,
    );
  }
  freshnessLines.push('');
  freshnessLines.push('## Evidence freshness');
  freshnessLines.push('');
  if (freshnessState.evidence.length === 0) {
    freshnessLines.push(
      'No evidence references are currently exposed by the covered Company + Corporate V2 state objects.',
    );
  } else {
    freshnessLines.push(
      '| Evidence | Freshness | Last domain review | Review due | Stale after | Decision use |',
    );
    freshnessLines.push('|---|---|---|---|---|---|');
    for (const entry of freshnessState.evidence) {
      freshnessLines.push(
        `| ${escapeCell(renderRef(entry.target_ref))} | \`${entry.freshness_status}\` | ${entry.last_domain_review_at ?? 'not recorded'} | ${entry.review_due_at ?? 'not recorded'} | ${entry.stale_after ?? 'not recorded'} | ${escapeCell(entry.decision_use)} |`,
      );
    }
  }
  freshnessLines.push('');
  freshnessLines.push('## Fail-closed rule');
  freshnessLines.push('');
  freshnessLines.push(
    'Missing review cadence stays missing. The Company OS must not invent a 30/60/90-day cycle merely to make a human view look complete.',
  );
  freshnessLines.push('');

  return {
    'STATE.md': stateLines.join('\n'),
    'CORPORATE.md': corporateLines.join('\n'),
    'FRESHNESS.md': freshnessLines.join('\n'),
  };
}

export function generateCompanyOsViews(root = process.cwd()) {
  return renderCompanyOsViews({
    companyState: readJson(root, 'state/company-state.json'),
    corporateState: readJson(root, 'state/corporate/corporate-state.json'),
    freshnessState: readJson(root, 'state/freshness/freshness-state.json'),
  });
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : null;
if (invokedPath && invokedPath === fileURLToPath(import.meta.url)) {
  const root = process.cwd();
  const views = generateCompanyOsViews(root);
  for (const [path, content] of Object.entries(views)) {
    writeFileSync(resolve(root, path), content, 'utf8');
  }
}
