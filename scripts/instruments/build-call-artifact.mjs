#!/usr/bin/env node

/**
 * Assemble the demonstration for the licensing discussion.
 *
 * Four pieces, each produced by running the real code rather than describing it:
 *
 *   1. a complete sequential administration, with a cut, a mid-session pause, a
 *      resume at the exact item, and chaining to the end;
 *   2. tampering detected — first content altered after the fact, then the audit
 *      trail itself altered;
 *   3. the segmentation-effect detector, over its three passes;
 *   4. a provenance card, carrying every field a licence will require.
 *
 * What the artifact is careful NOT to claim: nothing here says anything about a
 * real instrument, about dogs, or about the absence of a position effect. The
 * items ask about the colour of a door. That the instrument is visibly fake is
 * the point, not an apology.
 *
 * Usage:
 *   node scripts/instruments/build-call-artifact.mjs
 *   node scripts/instruments/build-call-artifact.mjs --quick
 */

import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

const root = resolve('.');
const contentDir = resolve(root, 'config', 'instruments');
process.env['INSTRUMENT_CONTENT_DIR'] ??= contentDir;

const distRoot = resolve(root, 'backend', 'dist', 'api', 'services');
if (!existsSync(resolve(distRoot, 'instrument-administration.js'))) {
  console.error('The backend must be built first: pnpm --filter @emopet/api build');
  process.exit(2);
}

const store = await import(resolve(distRoot, 'instrument-content-store.js'));
const engine = await import(resolve(distRoot, 'instrument-administration.js'));
const journalModule = await import(resolve(distRoot, 'instrument-audit-journal.js'));
const controls = await import(resolve(distRoot, 'instrument-session-controls.js'));

const {
  AuditJournal, auditEvent, itemAnsweredEvent, itemPresentedEvent,
  fidelityReport, verifyChain, segmentationTable,
} = journalModule;

const quick = process.argv.includes('--quick');
const outDir = resolve(root, '.data', 'demo-p');
mkdirSync(outDir, { recursive: true });

const lines = [];
function say(text = '') {
  lines.push(text);
  console.log(text);
}

// ── Setup ───────────────────────────────────────────────────────────

const bundlePath = resolve(contentDir, 'demo-instrument-v0.json');
const rawBundle = JSON.parse(readFileSync(bundlePath, 'utf8'));
const structure = store.validateBundle(rawBundle);
const plan = engine.buildPlan(structure);
const contentStore = new store.DemoContentStore();
const reverseScored = engine.reverseScoredKeys(structure);

const HOUR = 3_600_000;
const T0 = Date.UTC(2026, 9, 15, 20, 30, 0);

const POLICY = {
  policyKey: 'SEQUENTIAL_OWNER_PACED',
  administrationMode: 'progressive',
  orderStrategy: 'canonical',
  targetSessionMinutes: 3,
  minItemsPerSession: 5,
  maxItemsPerSession: 15,
  adaptiveSizing: true,
  adaptiveSignals: ['median_session_duration', 'completion_rate', 'pause_frequency'],
  allowChaining: true,
  maxSessions: null,
  maxWindowHours: 336,
  maxSessionGapHours: 72,
  minInterItemMs: 800,
  allowResume: true,
  allowRevision: false,
  allowMidSessionPause: true,
  maxRemindersPerMissedSession: 2,
  deadlineWarningHoursBefore: 48,
  deadlineWarningCountsAsReminder: true,
  fatigueResponseMode: 'silent_flag',
  maxScientificUseStatus: 'research_only',
};

function clock(ms) {
  return new Date(ms).toISOString().slice(11, 19);
}

say('════════════════════════════════════════════════════════════════════');
say('EMOPET — démonstration d\'administration séquentielle');
say(`Instrument ${structure.versionRef} · contenu factice · aucune licence détenue`);
say('════════════════════════════════════════════════════════════════════');

// ── 1. One administration ───────────────────────────────────────────

say('');
say('1. UNE ADMINISTRATION SÉQUENTIELLE');
say('   L\'ordre des items est le même pour tous. Seules les coupures varient.');
say('');

const journal = new AuditJournal();
let state = engine.createAdministration(POLICY, plan, T0);
let now = T0;
journal.append(auditEvent('assessment_opened', now));

const usable = (await import(resolve(distRoot, 'instrument-breakpoints.js')))
  .resolveUsableBreakpoints(plan.breakpoints);
say(`   Coupures déclarées : ${plan.breakpoints.length}. Utilisables : [${usable.positions.join(', ')}].`);
say(`   ${usable.ignoredProposedCount} coupures intra-section proposées par EMOPET sont ignorées :`);
say('   personne ne les a approuvées, donc elles ne sont pas une autorité utilisable.');
say('');

/** Every wording actually displayed, so the artifact can check its own claim. */
const presentedTexts = [];

async function presentAndAnswer(value, latencyMs) {
  const session = state.sessions[state.sessions.length - 1];
  const reference = engine.nextItemReference(state);
  const sealed = await contentStore.readItem(structure.versionRef, reference.itemKey);
  presentedTexts.push(sealed.text);

  journal.append(itemPresentedEvent(
    now, session.sessionIndex, reference.itemKey, sealed.renderDigest, reference.sectionKey,
  ));
  say(`   ${clock(now)}  ┌ CARTE FIGÉE — ${reference.itemKey} (position ${reference.canonicalPosition})`);
  say(`             │ « ${sealed.text} »`);
  say(`             │ ${sealed.scaleLabels.map((label, index) => `${index}=${label.replace('DEMO — niveau ', 'n')}`).join('  ')}`);
  say(`             └ empreinte ${sealed.renderDigest.slice(0, 16)}…  ·  aucun modèle en boucle`);

  now += latencyMs;
  state = engine.recordAnswer(state, {
    itemKey: reference.itemKey, status: 'answered', value, latencyMs, now,
  });
  journal.append(itemAnsweredEvent(session.sessionIndex, state.responses[state.responses.length - 1]));
  const recorded = state.responses[state.responses.length - 1];
  say(`   ${clock(now)}    réponse ${value}  ·  position dans la séance ${recorded.positionInSession}`
    + `${recorded.crossedSectionBoundary ? '  ·  franchit une frontière de section' : ''}`);
}

// Session 1
state = engine.planNextSession(state, {}, now);
let session = state.sessions[0];
journal.append(auditEvent('session_planned', now, { sessionIndex: 1 }));
say(`   Séance 1 planifiée : ${session.plannedItemCount} items (positions ${session.startPosition}–${session.endPosition}).`);
say(`   Le dimensionnement visait ~12 items pour 3 minutes ; la liste blanche ramène à ${session.plannedItemCount}.`);
say('');

journal.append(auditEvent('frame_presented', now, {
  sessionIndex: 1, frameTemplateId: 'FRAME_OPEN_03', frameDigest: 'frame-digest', llmInvolved: true,
}));
say(`   ${clock(now)}  BREIZ (modèle autorisé ici, et seulement ici) — cadrage d'ouverture`);
say('             gabarit FRAME_OPEN_03 · aucune question · aucun item');
state = engine.openSession(state, now);
journal.append(auditEvent('session_opened', now, { sessionIndex: 1 }));
say('');

for (let index = 0; index < 4; index += 1) {
  await presentAndAnswer(1 + (index % 4), 4200 + index * 300);
  now += 11_000;
}

// Mid-session pause, then resume at the exact item.
const cursorBeforePause = state.cursor;
state = engine.pauseMidSession(state, now);
journal.append(auditEvent('mid_session_pause', now, { sessionIndex: 1 }));
say('');
say(`   ${clock(now)}  PAUSE en un geste. Aucun message culpabilisant, aucune relance.`);
say(`             Une pause n'est pas une séance manquée : elle ne consomme aucun quota.`);
now += 47 * 60_000;
state = engine.resumeSession(state, now);
journal.append(auditEvent('session_resumed', now, { sessionIndex: 1 }));
say(`   ${clock(now)}  REPRISE à l'item exact (position ${state.cursor}, inchangée depuis ${cursorBeforePause}).`);
say('');

while (state.cursor <= session.endPosition) {
  await presentAndAnswer(2 + (state.cursor % 3), 3900);
  now += 12_000;
}

const offer = engine.continuationOffer(state);
say('');
say(`   ${clock(now)}  CONTRÔLE DE SÉANCE (chaîne figée, jamais générée)`);
say(`             « ${controls.sessionControl('CONTINUE_OFFER').text} »`
  + `   [${controls.sessionControl('CONTINUE_ACCEPT').text}] [${controls.sessionControl('CONTINUE_DECLINE').text}]`);
say(`             offre disponible : ${offer.available} — ${offer.reason}`);
journal.append(auditEvent('continue_offered', now, { sessionIndex: 1, detailCode: 'available' }));

state = engine.closeSession(state, now);
journal.append(auditEvent('session_closed', now, { sessionIndex: 1 }));
say(`   ${clock(now)}  Le propriétaire s'arrête. ${state.responses.length}/24 items. État : ${state.lifecycleState}.`);

// Session 2, next evening, chained to the end.
now += 23 * HOUR;
say('');
say(`   ── lendemain soir ──`);
state = engine.planNextSession(state, { completion_rate: 1, median_session_duration: 240 }, now);
journal.append(auditEvent('session_planned', now, { sessionIndex: 2 }));
journal.append(auditEvent('frame_presented', now, {
  sessionIndex: 2, frameTemplateId: 'FRAME_OPEN_03', frameDigest: 'frame-digest', llmInvolved: true,
}));
state = engine.openSession(state, now);
journal.append(auditEvent('session_opened', now, { sessionIndex: 2 }));

let chains = 0;
for (;;) {
  session = state.sessions[state.sessions.length - 1];
  while (state.cursor <= session.endPosition) {
    await presentAndAnswer(1 + (state.cursor % 4), 3600);
    now += 10_000;
  }
  const next = engine.continuationOffer(state);
  if (!next.available) break;
  state = engine.acceptContinuation(state, { completion_rate: 1 }, now);
  journal.append(auditEvent('continue_accepted', now, { sessionIndex: session.sessionIndex }));
  chains += 1;
  say(`   ${clock(now)}  « ${controls.sessionControl('CONTINUE_OFFER').text} » → le propriétaire enchaîne (${chains}).`);
}

state = engine.closeSession(state, now);
journal.append(auditEvent('session_closed', now, { sessionIndex: session.sessionIndex }));
journal.append(auditEvent('assessment_completed', now));

const gate = engine.scoringGate(state, reverseScored, now);
const shape = engine.administrationShape(state);
say('');
say(`   ${clock(now)}  Administration complète : ${state.responses.length}/24 items, `
  + `${shape.sessionCount} séances, étendue ${shape.spanHours.toFixed(1)} h.`);
say(`             Porte de scoring : ${gate.allowed ? 'ouverte' : 'fermée'}`
  + `${gate.reasons.length > 0 ? ` (${gate.reasons.join(' ; ')})` : ''}`);
say(`             Statut scientifique effectif : ${gate.status}`);
say(`             La forme obtenue vaudrait « scoring_allowed », mais aucune licence ne`);
say(`             l'autorise, donc le plafond de politique la maintient à « ${gate.status} ».`);
if (gate.allowed) state = engine.markScored(state, now);

const report = fidelityReport(journal.entries());
say('');
say(`   FIDÉLITÉ — ${report.itemsPresented} présentations, `
  + `${report.itemPresentationsProven} prouvées (empreinte + attestation sans modèle).`);
say(`   Le modèle n'apparaît que sur : ${report.llmInvolvedEventTypes.join(', ')}.`);
say(`   Chaîne d'audit : ${report.chain.status}, ${report.chain.eventCount} événements.`);

// ── 2. Tampering detected ───────────────────────────────────────────

say('');
say('════════════════════════════════════════════════════════════════════');
say('2. L\'ALTÉRATION EST DÉTECTÉE');
say('');

// 2a — content changed after the fact. The journal recorded the digest of what was
// actually shown, so a later edit no longer matches what was presented.
const tempDir = mkdtempSync(resolve(tmpdir(), 'emopet-tamper-'));
copyFileSync(bundlePath, resolve(tempDir, 'demo-instrument-v0.json'));
const tampered = JSON.parse(readFileSync(resolve(tempDir, 'demo-instrument-v0.json'), 'utf8'));
const originalText = tampered.items[0].text;
tampered.items[0].text = originalText.replace('porte', 'fenêtre');
writeFileSync(
  resolve(tempDir, 'demo-instrument-v0.json'),
  JSON.stringify(tampered, null, 2),
  'utf8',
);
const tamperedStructure = store.validateBundle(tampered);

const presentedDigest = journal.entries()
  .find((entry) => entry.eventType === 'item_presented' && entry.itemKey === 'DEMO_ITEM_01').renderDigest;
const nowDigest = tamperedStructure.items.find((item) => item.itemKey === 'DEMO_ITEM_01').renderDigest;

say('   2a — le contenu est modifié APRÈS l\'administration');
say(`   Un mot change : « …de la ${originalText.includes('porte') ? 'porte' : '?'} » devient « …de la fenêtre ».`);
say(`   Empreinte enregistrée au moment de la présentation : ${presentedDigest.slice(0, 24)}…`);
say(`   Empreinte du contenu actuel                       : ${nowDigest.slice(0, 24)}…`);
say(`   Concordance : ${presentedDigest === nowDigest ? 'OUI' : 'NON — l\'écart est détecté'}`);
say(`   Empreinte du bundle : ${structure.contentDigest.slice(0, 24)}… → ${tamperedStructure.contentDigest.slice(0, 24)}…`);
say('   La piste d\'audit établit donc ce qui a été montré, sans conserver un seul');
say('   caractère de contenu licencié.');

// 2b — the audit trail itself is altered.
say('');
say('   2b — la piste d\'audit elle-même est modifiée');
const entries = journal.entries();
const victimIndex = entries.findIndex(
  (entry) => entry.eventType === 'item_presented' && entry.itemKey === 'DEMO_ITEM_05',
);

const rewritten = [...entries];
rewritten[victimIndex] = { ...entries[victimIndex], renderDigest: 'digest-rewritten' };
const rewrittenResult = verifyChain(rewritten);
say(`   Une ligne est réécrite (index ${victimIndex}) → ${rewrittenResult.status}`);
say(`     motif ${rewrittenResult.reason} · première rupture à l'index ${rewrittenResult.firstBrokenIndex}`);
say(`     ${rewrittenResult.detail}`);

const removed = entries.filter((_, index) => index !== victimIndex);
const removedResult = verifyChain(removed);
say(`   Une ligne est retirée              → ${removedResult.status}`);
say(`     motif ${removedResult.reason} · première rupture à l'index ${removedResult.firstBrokenIndex}`);

const covariateTampered = [...entries];
// Pick an entry whose position is not already 1, or the rewrite would be a no-op
// and the chain would rightly still verify.
const answered = entries.findIndex(
  (entry) => entry.eventType === 'item_answered'
    && entry.covariates !== null
    && entry.covariates.positionInSession > 1,
);
if (answered === -1) throw new Error('no answered entry with a position above 1 to tamper with');
const originalPosition = entries[answered].covariates.positionInSession;
covariateTampered[answered] = {
  ...entries[answered],
  covariates: { ...entries[answered].covariates, positionInSession: 1 },
};
const covariateResult = verifyChain(covariateTampered);
say(`   Une covariable est réécrite (position ${originalPosition} → 1) → ${covariateResult.status}`);
say(`     motif ${covariateResult.reason} · index ${covariateResult.firstBrokenIndex}`);
say('   Les covariables sont dans l\'empreinte : sans cela on pourrait réécrire la');
say('   position d\'un item après coup et la chaîne vérifierait quand même.');

// ── 3. The detector ─────────────────────────────────────────────────

say('');
say('════════════════════════════════════════════════════════════════════');
say('3. LE DÉTECTEUR D\'EFFET DE SEGMENTATION');
say('');

const analysisPath = resolve(outDir, 'segmentation-analysis.json');
execFileSync(
  process.execPath,
  [
    resolve(root, 'scripts', 'instruments', 'analyse-segmentation-effect.mjs'),
    ...(quick ? ['--quick'] : []),
  ],
  { cwd: root, stdio: 'pipe' },
);
const analysis = JSON.parse(readFileSync(analysisPath, 'utf8'));

const passA = analysis.passA.result;
const passB = analysis.passB.result;
say(`   A — puissance     δ injecté ${analysis.options.powerDelta.toFixed(2)} → δ̂ ${passA.delta.toFixed(3)}`
  + `  IC [${passA.confidenceInterval[0].toFixed(3)}, ${passA.confidenceInterval[1].toFixed(3)}]`
  + `  ${passA.excludesZero ? 'DÉTECTÉ' : 'non détecté'}`);
say(`   B — spécificité   δ injecté 0.00 → δ̂ ${passB.delta.toFixed(3)}`
  + `  IC [${passB.confidenceInterval[0].toFixed(3)}, ${passB.confidenceInterval[1].toFixed(3)}]`
  + `  ${passB.excludesZero ? 'détecté (PROBLÈME)' : 'RIEN DÉTECTÉ'}`);
say('');
say('   C — sensibilité : à partir de quel effet et de quel volume détecte-t-on ?');
const volumes = analysis.options.sensitivityOwners;
say(`     δ      ${volumes.map((n) => String(n).padStart(8)).join('')}`);
for (const row of analysis.passC) {
  const cells = row.cells.map((cell) =>
    (cell.result.identifiable && cell.result.excludesZero ? 'oui' : 'non').padStart(8));
  say(`     ${row.delta.toFixed(2)}   ${cells.join('')}`);
}
say('');
say('   Atténuation : ' + analysis.attenuation.ratios
  .map((r) => `${r.injected.toFixed(2)}→${r.estimated.toFixed(3)}`).join('  '));
say('   δ̂ est une BORNE INFÉRIEURE de l\'effet latent, pas son estimation : l\'arrondi');
say('   sur une échelle entière et la saturation tirent vers zéro. Le détecteur');
say('   sous-estime, il ne surestime pas.');
say('');
const guard = analysis.identifiabilityGuard;
say(`   Garde d'identifiabilité : avec un profil unique pour tous, `
  + `${guard.identifiability.identifiable}/${guard.identifiability.observed} items identifiables`);
say(`   → ${guard.identifiable ? 'estimation produite' : 'AUCUNE estimation produite'}.`);
say('   Position et item sont alors parfaitement confondus. C\'est le découpage');
say('   adaptatif qui rend l\'effet mesurable : la variabilité permet de l\'auditer.');

// ── 4. Provenance ───────────────────────────────────────────────────

const scored = state.effectiveScientificUseStatus ?? gate.status;
const provenance = [
  ['Instrument', structure.instrumentCode],
  ['Version', `${structure.version} (${structure.locale})`],
  ['Référence de version', structure.versionRef],
  ['Statut de licence', structure.licenseStatus],
  ['Statut de traduction', structure.translationStatus],
  ['Empreinte du contenu', `${structure.contentDigest.slice(0, 32)}…`],
  ['Magasin de contenu', 'DemoContentStore (dépôt) — SecretStoreContentStore non implémenté'],
  ['Items', String(structure.expectedItemCount)],
  ['Jeu de coupures', `v${structure.breakpointSetVersion} · autorité emopet_proposed`],
  ['Politique', POLICY.policyKey],
  ['Mode d\'administration', POLICY.administrationMode],
  ['Méthode de scoring', 'DEMO_SUM_V0 / not-a-cbarq-scoring-rule'],
  ['Statut scientifique', scored],
  ['État de publication', 'withheld'],
  ['Attribution', rawBundle.notice.slice(0, 58) + '…'],
];

say('');
say('════════════════════════════════════════════════════════════════════');
say('4. PROVENANCE');
say('   Chaque champ qu\'une licence exigera a déjà sa place.');
say('');
const width = Math.max(...provenance.map(([label]) => label.length));
for (const [label, value] of provenance) {
  say(`   ${label.padEnd(width)}  ${value}`);
}

say('');
say('════════════════════════════════════════════════════════════════════');
say('CE QUE CETTE DÉMONSTRATION N\'ÉTABLIT PAS');
say('   · aucune validité psychométrique : les données sont synthétiques ;');
say('   · aucune preuve que la segmentation est sans effet — cela ne se tranche');
say('     que sur données réelles, sous licence, avec un volume suffisant ;');
say('   · aucune validation de traduction : cette version est un factice français ;');
say('   · aucune licence : `licenseStatus` vaut demo_only et le magasin réel est');
say('     délibérément non implémenté.');
say('════════════════════════════════════════════════════════════════════');

// ── Written outputs ─────────────────────────────────────────────────

writeFileSync(resolve(outDir, 'call-artifact.txt'), `${lines.join('\n')}\n`, 'utf8');
writeFileSync(
  resolve(outDir, 'call-artifact.json'),
  `${JSON.stringify({
    generatedBy: 'scripts/instruments/build-call-artifact.mjs',
    status: 'DEMO_ARTIFACT_SYNTHETIC_DATA_NO_LICENCE',
    instrument: {
      versionRef: structure.versionRef,
      licenseStatus: structure.licenseStatus,
      translationStatus: structure.translationStatus,
      contentDigest: structure.contentDigest,
      expectedItemCount: structure.expectedItemCount,
      breakpointSetVersion: structure.breakpointSetVersion,
    },
    administration: {
      responses: state.responses.length,
      shape,
      lifecycleState: state.lifecycleState,
      scoringGate: gate,
      fidelity: report,
      usableBreakpoints: usable,
    },
    tamperDetection: {
      contentAlteredAfterPresentation: {
        presentedDigest, currentDigest: nowDigest, detected: presentedDigest !== nowDigest,
      },
      trailRewritten: rewrittenResult,
      trailEntryRemoved: removedResult,
      covariateRewritten: covariateResult,
    },
    segmentationAnalysis: {
      passA: analysis.passA.result,
      passB: analysis.passB.result,
      passC: analysis.passC.map((row) => ({
        delta: row.delta,
        detected: row.cells.map((cell) => ({
          owners: cell.owners,
          detected: cell.result.identifiable && cell.result.excludesZero,
          estimate: cell.result.delta ?? null,
        })),
      })),
      attenuation: analysis.attenuation,
      identifiabilityGuard: analysis.identifiabilityGuard,
    },
    provenance: Object.fromEntries(provenance),
    doesNotEstablish: [
      'psychometric validity: the data are synthetic',
      'the absence of a position effect: only licensed data at volume can settle that',
      'translation validity: this version is a French fixture',
      'any licence: licenseStatus is demo_only and the real store is unimplemented',
    ],
  }, null, 2)}\n`,
  'utf8',
);

console.log('');
console.log(`Écrit dans ${outDir}/call-artifact.txt et call-artifact.json`);

// The artifact is only worth showing if its own claims hold.
const failures = [];
if (report.chain.status !== 'VALID') failures.push('audit chain does not verify');
if (report.itemPresentationsProven !== report.itemsPresented) failures.push('unproven presentations');
if (report.llmInvolvedEventTypes.some((type) => type !== 'frame_presented')) {
  failures.push('a model appeared outside framing');
}
if (state.responses.length !== structure.expectedItemCount) failures.push('administration incomplete');
// The artifact is the piece shown to a licensor. It must not be able to display
// anything that could pass for a real instrument, so it refuses to be produced if
// a single rendered string is not visibly a fixture.
const notVisiblyFake = presentedTexts.filter((text) => !text.startsWith('DEMO — '));
if (notVisiblyFake.length > 0) {
  failures.push(
    `${notVisiblyFake.length} displayed item(s) are not visibly fake, `
      + `starting with: ${JSON.stringify(notVisiblyFake[0].slice(0, 48))}`,
  );
}
if (presentedTexts.length !== structure.expectedItemCount) {
  failures.push('the transcript did not display every item');
}
if (presentedDigest === nowDigest) failures.push('content tampering not detected');
for (const [name, result] of [
  ['rewritten', rewrittenResult], ['removed', removedResult], ['covariate', covariateResult],
]) {
  if (result.status !== 'BROKEN') failures.push(`trail tampering not detected: ${name}`);
}
if (!passA.excludesZero) failures.push('detector missed an injected effect');
if (passB.excludesZero) failures.push('detector invented an effect');
if (analysis.identifiabilityGuard.identifiable) failures.push('identifiability guard did not refuse');

if (failures.length > 0) {
  console.error(`\n${failures.length} claim(s) in the artifact do not hold:`);
  for (const failure of failures) console.error(`  ${failure}`);
  process.exit(1);
}
