import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('final Owner terminology boundary classifies remaining Guardian strings', async () => {
  const [languageDecision, baselineDraft, supersession, envExample] = await Promise.all([
    readFile(new URL('../../../docs/language/EMOPET_LANGUAGE_FOUNDER_DECISION_RECORD_2026-09-01.md', import.meta.url), 'utf8'),
    readFile(new URL('../../../backend/db/baseline-draft/0000_core_baseline.sql', import.meta.url), 'utf8'),
    readFile(new URL('../../../docs/records/terminology/GUARDIAN_TO_OWNER_SUPERSESSION_2026-09-11.md', import.meta.url), 'utf8'),
    readFile(new URL('../.env.example', import.meta.url), 'utf8'),
  ]);

  assert.match(languageDecision, /Owner-declared context/);
  assert.doesNotMatch(languageDecision, /Guardian-declared context/iu);
  assert.match(baselineDraft, /Owner \/ dog \/ device core/);
  assert.doesNotMatch(baselineDraft, /Guardian \/ dog \/ device core/iu);

  assert.match(supersession, /PHASE C \+ PHASE D COMPLETE \/ REMAINING OCCURRENCES CLASSIFIED/);
  assert.match(supersession, /Terminology regression\/enforcement evidence/);
  assert.match(supersession, /External proper name \/ provider brand/);
  assert.match(supersession, /GitGuardian/);
  assert.match(envExample, /API_GITGUARDIAN_ENABLED/);
});
