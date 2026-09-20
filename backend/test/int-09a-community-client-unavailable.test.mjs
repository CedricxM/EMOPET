import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const communitySource = readFileSync(
  new URL('../../apps/web/app/quartier/CommunitySection.tsx', import.meta.url),
  'utf8',
);

test('INT-09A Community web stays read-only until canonical authority is integrated', () => {
  assert.match(communitySource, /Aperçu prototype/);
  assert.match(communitySource, /COMMUNITY_RUNTIME_UNAVAILABLE_MESSAGE/);
  assert.match(
    communitySource,
    /actions communautaires partagées restent indisponibles tant qu une autorité Product V1 n est pas intégrée/,
  );

  assert.doesNotMatch(communitySource, /fetch\(['"]\/api\/community/);
  assert.doesNotMatch(communitySource, /localStorage/);
  assert.doesNotMatch(communitySource, /`user-\$\{Date\.now\(\)\}`/);
  assert.doesNotMatch(communitySource, /`r-\$\{Date\.now\(\)\}`/);
});

test('INT-09A shared actions cannot fabricate successful Community state', () => {
  for (const successCopy of [
    'Publication ajoutée au cercle.',
    'Événement créé — le point de RDV apparaît sur la carte',
    'Merci, votre signalement a été enregistré.',
    'Contenu masqué et transmis à la modération.',
  ]) {
    assert.equal(
      communitySource.includes(successCopy),
      false,
      `fabricated Community success copy returned: ${successCopy}`,
    );
  }

  for (const handler of [
    'function joinCircle',
    'async function createPost',
    'async function addReply',
    'async function flagPost',
    'async function createEvent',
    'function participate',
  ]) {
    assert.ok(communitySource.includes(handler), `missing handler: ${handler}`);
  }

  assert.match(
    communitySource,
    /async function createPost[\s\S]*notify\(COMMUNITY_RUNTIME_UNAVAILABLE_MESSAGE\);/,
  );
  assert.match(
    communitySource,
    /async function addReply[\s\S]*notify\(COMMUNITY_RUNTIME_UNAVAILABLE_MESSAGE\);/,
  );
  assert.match(
    communitySource,
    /async function createEvent[\s\S]*notify\(COMMUNITY_RUNTIME_UNAVAILABLE_MESSAGE\);/,
  );
});
