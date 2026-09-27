/**
 * Breiz transparency audit (#226, 2026-09-27) — regression guards.
 *
 * Enforces rules already written in docs/compliance/AI_TRANSPARENCY_BREIZ.md
 * and the #118 DÉMO convention; see docs/compliance/BREIZ_TRANSPARENCY_AUDIT_2026-09-27.md.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { askBreiz } from '../index';
import { MOCK_DOG } from '../../mock-data';

const web = (rel: string) => readFileSync(new URL(`../../../${rel}`, import.meta.url), 'utf8');

async function withFetch<T>(stub: typeof fetch, run: () => Promise<T>): Promise<T> {
  const real = globalThis.fetch;
  globalThis.fetch = stub;
  try {
    return await run();
  } finally {
    globalThis.fetch = real;
  }
}

const offline = (async () => { throw new Error('offline'); }) as typeof fetch;

test('templates carry no pseudo-source: a product rule is not a provenance', async () => {
  const vet = await withFetch(offline, () => askBreiz('Il vomit depuis ce matin, que faire ?'));
  assert.match(vet.text, /vétérinaire/);
  assert.deepEqual(vet.sources, []);

  const none = await withFetch(offline, () => askBreiz('xylophone quantique'));
  assert.match(none.text, /pas encore de fiche/);
  assert.deepEqual(none.sources, []);
});

test('the vet referral does not offer to read ELI data the fallback cannot access', async () => {
  const vet = await withFetch(offline, () => askBreiz('Il a de la fièvre ?'));
  assert.doesNotMatch(vet.text, /indicateurs ELI|vos données ELI|lecture de vos/i);
});

test('retrieval answers keep the references they were composed from', async () => {
  const answer = await withFetch(offline, () => askBreiz('signaux d’apaisement bâillements'));
  assert.ok(answer.sources.length > 0);
  for (const source of answer.sources) assert.ok(source.trim().length > 0);
});

test('breed narration never presumes the demo dog; it needs a confirmed dog', async () => {
  const calls: string[] = [];
  const breeds = (async (input: RequestInfo | URL) => {
    calls.push(String(input));
    return new Response(JSON.stringify({
      breeds: [{
        id: 'fci-1', fciStandardNumber: 1, nameOfficial: 'Labrador Retriever', nameFr: 'Labrador',
        fciGroup: '8', countryOfOrigin: 'Grande-Bretagne', coatTypeDefault: 'court', sizeCategory: 'grand',
        morphologyNotes: null, source: 'test', sourceVersion: 'test', verificationStatus: 'VERIFIED',
      }],
    }), { status: 200, headers: { 'content-type': 'application/json' } });
  }) as typeof fetch;

  const anonymous = await withFetch(breeds, () => askBreiz('Quelle est l’origine de sa race ?'));
  assert.equal(calls.filter((url) => url.includes('/api/breeds')).length, 0);
  assert.doesNotMatch(anonymous.text, new RegExp(`\\b${MOCK_DOG.name}\\b`));
  // No arbitrary breed sheet either: Breiz asks which breed instead of guessing.
  assert.match(anonymous.text, /Je ne connais pas la race de votre chien/);
  assert.doesNotMatch(anonymous.text, /groupe FCI/);
  assert.deepEqual(anonymous.sources, []);

  const named = await withFetch(offline, () => askBreiz('Parle-moi du border collie'));
  assert.match(named.text, /BORDER COLLIE/);

  const confirmed = await withFetch(breeds, () =>
    askBreiz('Quelle est l’origine de sa race ?', { confirmedDog: { name: 'Nala', breed: 'Labrador Retriever' } }));
  assert.ok(calls.some((url) => url.includes('/api/breeds?q=Labrador%20Retriever')));
  assert.match(confirmed.text, /Nala/);
});

test('every interactive web Breiz surface discloses the AI and shares the transparency tags', () => {
  const surfaces: Array<[string, RegExp]> = [
    ['app/breiz/page.tsx', /Assistant IA/],
    ['components/breiz/BreizDock.tsx', /assistant IA/i],
    ['components/breiz/LocalKnowledgePanel.tsx', /Breiz est une IA/],
  ];
  for (const [file, disclosure] of surfaces) assert.match(web(file), disclosure, file);
  assert.match(web('app/breiz/page.tsx'), /Breiz est une IA/);
  for (const file of ['app/breiz/page.tsx', 'components/breiz/BreizDock.tsx']) {
    assert.match(web(file), /<BreizMessageTags message=\{m\} \/>/, `${file} must render the shared tags`);
  }
  // The AI tag is unconditional; only the evidence level depends on metadata.
  assert.match(web('components/breiz/BreizMessageTags.tsx'), /<span style=\{TAG_STYLE\}>IA<\/span>/);
});

test('the /breiz page marks its hand-written example and never claims a live ELI state', () => {
  const page = web('app/breiz/page.tsx');
  assert.doesNotMatch(page, /label="ELI valide"/);
  assert.match(page, /label=\{`\$\{ELI_DEMO_PREFIX\}ELI valide`\}/);
  const seeded = page.slice(page.indexOf('const MESSAGES'), page.indexOf('export default function'));
  const assistantTurns = seeded.match(/from: 'bleiz'/g) ?? [];
  const demoFlags = seeded.match(/demo: true/g) ?? [];
  assert.ok(assistantTurns.length > 0);
  assert.equal(demoFlags.length, assistantTurns.length, 'every seeded Breiz turn is marked demo');
  assert.doesNotMatch(page, /croise les notes/, 'the fallback reads neither the journal nor ELI');
});

test('the model path does not cite the assistant itself as a source', () => {
  const route = web('app/api/breiz/route.ts');
  assert.doesNotMatch(route, /ancrage \$\{/);
  assert.match(route, /via: 'model'[\s\S]*?sources: \[\]/);
});
