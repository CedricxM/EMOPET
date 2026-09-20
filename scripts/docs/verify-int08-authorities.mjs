import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Documentation controls only: a PASS is not science, clinical, legal,
// manufacturing, Founder-approval or release evidence. No network or writes.
export const SOURCE = '7e0d90445a3cf03b094d7037aa6addbfa6f2cc19';
export const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const control = 'docs/control/';
const product = 'docs/product/';
const validation = 'docs/validation/';
const strategy = 'docs/strategy/';
export const CLAIMS = `${control}EMOPET_CLAIMS_REGISTRY_v0.1.md`;
export const TERMS = 'docs/records/terminology/GUARDIAN_TO_OWNER_SUPERSESSION_2026-09-11.md';
export const MAT = `${strategy}MAT_STRATEGIC_THESIS_LAUNCH_AUTHORITY_CANDIDATE_2026-09-08.md`;
export const PILOT = `${validation}EMOPET_ECOSYSTEM_CONTINUITY_90_DAY_PILOT_v0.1.md`;

// Expected metadata expresses the still-open decisions, not document approval.
const contracts = [
  [`${control}EMOPET_PRODUCT_AUTHORITY_MAP_v0.1.md`, 'PROPOSED CONTROLLED PRODUCT/DATA AUTHORITY — FOUNDER REVIEW REQUIRED', 'G-EMOPET-PRODUCT-AUTHORITY-MAP-01 = OPEN'],
  [CLAIMS, 'PROPOSED CLAIM CONTROL / NOT MARKETING OR LEGAL SIGN-OFF', 'G-EMOPET-CLAIMS-CONTROL-01 = OPEN'],
  [`${product}EMOPET_EXPERIENCE_DOCTRINE_v0.1.md`, 'PROPOSED CONTROLLED PRODUCT AUTHORITY / FOUNDER REVIEW REQUIRED', 'G-EMOPET-EXPERIENCE-DOCTRINE-01 = OPEN'],
  [`${product}EMOPET_SURFACE_NECESSITY_MATRIX_v0.1.md`, 'PROPOSED PRODUCT HARDENING AUTHORITY / REVIEW REQUIRED', 'G-EMOPET-SURFACE-NECESSITY-01 = OPEN'],
  [`${product}EMOPET_VETERINARY_SUMMARY_SCOPE_v0.1.md`, 'PRODUCT / INFORMATION-ARCHITECTURE CANDIDATE — NOT CLINICALLY VALIDATED', 'G-VETERINARY-SUMMARY-UTILITY-01 = NOT_TESTED'],
  [`${validation}EMOPET_MAT_INCREMENTAL_VALUE_PROTOCOL_v0.1.md`, 'PROPOSED FEASIBILITY / PRODUCT-VALUE PROTOCOL — NOT EXECUTED', 'G-MAT-INCREMENTAL-VALUE-01 = OPEN'],
  [`${validation}EMOPET_MAT_PHASE0_EVIDENCE_MAP_v0.1.md`, 'CONTROLLED PLANNING / NOT EXECUTED EVIDENCE', 'G-MAT-PHASE0-EVIDENCE-MAP-01 = CONTROLLED_PLAN / EVIDENCE_NOT_EXECUTED'],
  [MAT, 'CANDIDATE / OPEN / REQUIRES_FOUNDER_APPROVAL', null],
  [PILOT, 'PROPOSED CONTROLLED PRODUCT-VALIDATION PROTOCOL / NOT STARTED', 'G-EMOPET-90D-CONTINUITY-PILOT-01 = OPEN'],
  [TERMS, 'PROJECT_DECISION / TERMINOLOGY SUPERSESSION', null],
  [`${strategy}FOUNDER_STRATEGIC_LOCKS_2026-09-07.md`, 'PROJECT_DECISION / STRATEGIC AUTHORITY', null],
];
export const DOCUMENTS = contracts.map(([path]) => path);

const sourceOnly = new Set([
  'docs/control/EMOPET_GUARDIAN_AUTHORITY_MASTER_v0.1.md',
  'docs/control/EMOPET_GUARDIAN_PROFESSIONAL_SHARING_v0.1.md',
  'docs/control/EMOPET_OWNER_AUTHORITY_MASTER_v0.1.md',
  'docs/control/EMOPET_OWNER_PROFESSIONAL_SHARING_v0.1.md',
  'docs/product/EMOPET_OWNER_AUTHORITY_MASTER_v0.1.md',
  'docs/product/EMOPET_OWNER_CONTINUITY_MASTER_v0.1.md',
  'docs/qa/EMOPET_GUARDIAN_AUTHORITY_BOLA_MATRIX_v0.1.md',
  'docs/qa/EMOPET_OWNER_AUTHORITY_BOLA_MATRIX_v0.1.md',
  'docs/strategy/OWNER_RELATIONSHIP_AND_PRODUCT_SCOPE_DOCTRINE_2026-09-11.md',
]);

function metadata(text, name) {
  return text.split('\n').filter(line => line.startsWith(`**${name}:**`))
    .map(line => line.slice(`**${name}:**`.length).replaceAll('`', '').trim());
}

export function verifyInt08({
  read = path => readFileSync(resolve(ROOT, path), 'utf8'),
  exists = path => existsSync(resolve(ROOT, path)),
} = {}) {
  const errors = [];
  const texts = new Map();
  const seenSource = new Set();
  const require = (ok, message) => { if (!ok) errors.push(message); };
  for (const [path, status, gate] of contracts) {
    let text;
    try { text = read(path); } catch { errors.push(`${path}: missing/unreadable document`); continue; }
    texts.set(path, text);
    const statuses = metadata(text, 'Status');
    require(statuses.length === 1 && statuses[0] === status, `${path}: changed/ambiguous status`);
    if (gate) {
      const id = gate.split(' = ')[0];
      const occurrences = [...text.matchAll(new RegExp(`${id} = [^\x60\n]+`, 'g'))];
      require(occurrences.length === 1 && occurrences[0][0].trim() === gate, `${path}: changed/ambiguous gate`);
    }
    // Only the historical supersession record may discuss legacy role names.
    if (path !== TERMS) require(!/\bGuardian\b/.test(text), `${path}: legacy active role`);

    // Markdown links must resolve locally or identify a permitted frozen-source dependency.
    const withoutLinks = text.replace(/\[[^\]]*\]\(([^)]+)\)/g, (link, target) => {
      if (/^https?:/.test(target)) {
        if (path === TERMS && target.includes('/blob/')) {
          const prefix = `https://github.com/CedricxM/EMOPET/blob/${SOURCE}/`;
          const ref = target.startsWith(prefix) ? target.slice(prefix.length) : '';
          require(sourceOnly.has(ref), `${path}: unpinned/unclassified source reference: ${target}`);
          if (sourceOnly.has(ref)) seenSource.add(ref);
        }
      } else if (!target.startsWith('#')) {
        const ref = target.split('#')[0];
        require(exists(resolve(ROOT, dirname(path), ref)), `${path}: broken link: ${target}`);
      }
      return '';
    });
    for (const [, ref] of withoutLinks.matchAll(/`([A-Za-z0-9_./-]+\.md)`/g)) {
      const local = ref.startsWith('docs/') ? ref : resolve(ROOT, dirname(path), ref);
      require(exists(local), `${path}: missing local authority: ${ref}`);
    }
  }

  require(seenSource.size === sourceOnly.size, 'terminology: missing frozen-source lineage links');
  const mat = texts.get(MAT) ?? '';
  require(JSON.stringify(metadata(mat, 'Authority effect')) === JSON.stringify(['NONE UNTIL APPROVED']), 'MAT: authority effect changed');
  const terms = texts.get(TERMS) ?? '';
  require(terms.includes('The Phase C / Phase D completion statements below describe that source snapshot only.'), 'terminology: missing source-snapshot boundary');
  for (const id of ['G-GUARDIAN-AUTHORITY-01', 'G-GUARDIAN-CONTINUITY-01', 'G-GUARDIAN-PROFESSIONAL-SHARE-01', 'G-GUARDIAN-BOLA-QA-01']) {
    require(terms.includes(id), `terminology: lost historical identifier ${id}`);
  }

  const phase0 = texts.get(`${validation}EMOPET_MAT_PHASE0_EVIDENCE_MAP_v0.1.md`) ?? '';
  for (const phrase of ['No layer may be skipped.', 'Phase 0 success is not MAT success', 'manufacturing is authorized.']) {
    require(phase0.includes(phrase), `Phase 0: missing boundary ${phrase}`);
  }
  const scoreRows = phase0.split('\n').filter(line => /^\| (Qualified rest occupancy|Rest repositioning|Environmental context|Respiratory proxy|Weight\/load observations) \|/.test(line));
  require(scoreRows.length === 5 && scoreRows.every(line => (line.match(/NOT RUN/g) ?? []).length === 3), 'Phase 0: unexecuted evidence table changed');
  require((texts.get(PILOT) ?? '').includes('**Not a clinical trial. Not scientific validation of ELI.**'), 'pilot: missing non-clinical boundary');

  const claims = texts.get(CLAIMS) ?? '';
  const rows = claims.split('\n').filter(line => line.startsWith('| ')).map(line => line.split('|').map(cell => cell.trim()));
  const restrictedClaims = [
    ['MAT improves accuracy vs wearable-only', '`EVIDENCE_REQUIRED`'],
    ['MAT + TAG are more reliable than one device', '`EVIDENCE_REQUIRED`'],
    ['EMOPET diagnoses disease', '`FORBIDDEN`'],
    ['EMOPET knows how the dog feels', '`FORBIDDEN`'],
    ['Breiz knows the dog\'s emotions', '`FORBIDDEN`'],
    ['EMOPET measures bond strength', '`FORBIDDEN`'],
    ['ELI is scientifically validated', '`EVIDENCE_REQUIRED`'],
    ['EMOPET is clinically validated', '`FORBIDDEN` currently'],
    ['EMOPET is GDPR compliant', '`EVIDENCE_REQUIRED`'],
    ['EMOPET has a scientific collaboration with Penn/Oniris/Unizar', '`EVIDENCE_REQUIRED` per institution'],
    ['A named scientist endorses EMOPET', '`FORBIDDEN` absent explicit endorsement permission'],
    ['EMOPET has a manufacturing contract/SOW with MOKO', '`FORBIDDEN` until signed operational agreement exists'],
  ];
  for (const [claim, state] of restrictedClaims) {
    const matching = rows.filter(row => row[1] === claim);
    require(matching.length === 1 && matching[0][2] === state, `claims: altered classification: ${claim}`);
  }
  for (const state of ['AUTHORIZED_DESCRIPTIVE', 'CONDITIONAL', 'EVIDENCE_REQUIRED', 'THIRD_PARTY_RIGHTS_REQUIRED', 'FORBIDDEN', 'HISTORICAL_ONLY']) {
    require(claims.includes(`- \`${state}\` —`), `claims: missing state definition ${state}`);
  }
  return errors;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const errors = verifyInt08();
  if (errors.length) {
    console.error(errors.join('\n'));
    process.exitCode = 1;
  } else {
    console.log(`PASS: INT-08 metadata, claim restrictions, terminology and references (${DOCUMENTS.length} documents).`);
    console.log('Documentation evidence only; no scientific, clinical, legal, manufacturing, Founder or release approval.');
  }
}
