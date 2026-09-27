import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('UPenn meeting materials do not claim endorsement or completed validation', async () => {
  for (const rel of [
    '../../docs/science/UPENN_EMOPET_ONE_PAGE_OVERVIEW_2026-09-25.md',
    '../../docs/science/UPENN_CBARQ_MEETING_PACK_2026-09-25.md',
  ]) {
    const source = await readFile(new URL(rel, import.meta.url), 'utf8');
    assert.ok(source.includes('NO PENN ENDORSEMENT') || source.includes('NO AGREEMENT IMPLIED'));
    assert.equal(/Penn validates EMOPET/i.test(source), false);
    assert.equal(/C-BARQ validates ELI/i.test(source), false);
  }
});

test('meeting pack keeps licensing and scientific collaboration separate', async () => {
  const source = await readFile(
    new URL('../../docs/science/UPENN_CBARQ_MEETING_PACK_2026-09-25.md', import.meta.url),
    'utf8',
  );
  assert.ok(source.includes('Keep collaboration separate from licence'));
  assert.ok(source.includes('WRITTEN_CONFIRMATION_REQUIRED'));
  assert.ok(source.includes('Do not convert verbal guidance into repository licence authority'));
});


test('Penn meeting pack follows current Owner terminology and current-main authority note', async () => {
  const [precall, protocol, licensing, pack] = await Promise.all([
    readFile(new URL('../../docs/science/UPENN_CBARQ_PRECALL_BRIEF_2026-09-25.md', import.meta.url), 'utf8'),
    readFile(new URL('../../docs/science/ELI_CBARQ_PROSPECTIVE_VALIDATION_PROTOCOL_DRAFT_2026-09-25.md', import.meta.url), 'utf8'),
    readFile(new URL('../../docs/science/UPENN_CBARQ_LICENSING_INPUTS_2026-09-25.md', import.meta.url), 'utf8'),
    readFile(new URL('../../docs/science/UPENN_CBARQ_MEETING_PACK_2026-09-25.md', import.meta.url), 'utf8'),
  ]);

  assert.match(precall, /Current-main synchronization — 2026-09-27/);
  assert.match(precall, /Owner-reported behavioural instrument/);
  assert.match(protocol, /Owner/);
  assert.match(licensing, /Owner/);
  assert.match(pack, /Owner/);
  assert.match(precall, /no Penn licence, research agreement, reference-data right, endorsement or validation claim has been established/i);
});
