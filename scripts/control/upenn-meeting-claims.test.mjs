import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const PROHIBITED_CLAIMS = [/Penn validates EMOPET/i, /C-BARQ validates ELI/i];

// Drops the counter-example list that follows a line reading exactly `Avoid:`.
// The block is that line plus the bullet list after it: blank lines and lines
// starting with `-`, `*` or `+` are dropped, and the first other line ends the
// block and is kept. Prose on the `Avoid:` line, a paragraph after the list and
// any other list are all still matched.
function stripAvoidLists(source) {
  const kept = [];
  let inAvoidList = false;
  for (const line of source.split(/\r?\n/)) {
    if (inAvoidList) {
      if (line.trim() === '' || /^\s*[-*+]\s/.test(line)) continue;
      inAvoidList = false;
    }
    if (/^Avoid:\s*$/.test(line)) {
      inAvoidList = true;
      continue;
    }
    kept.push(line);
  }
  return kept.join('\n');
}

function prohibitedClaims(source) {
  const text = stripAvoidLists(source);
  return PROHIBITED_CLAIMS.filter((pattern) => pattern.test(text)).map(String);
}

test('UPenn meeting materials do not claim endorsement or completed validation', async () => {
  for (const rel of [
    '../../docs/science/UPENN_EMOPET_ONE_PAGE_OVERVIEW_2026-09-25.md',
    '../../docs/science/UPENN_CBARQ_MEETING_PACK_2026-09-25.md',
  ]) {
    const source = await readFile(new URL(rel, import.meta.url), 'utf8');
    assert.ok(source.includes('NO PENN ENDORSEMENT') || source.includes('NO AGREEMENT IMPLIED'));
    assert.deepEqual(prohibitedClaims(source), [], rel);
  }
});

test('only a bullet list under an exact `Avoid:` line is exempt', () => {
  const listed = 'Avoid:\n\n- “C-BARQ validates ELI”\n- “Penn validates EMOPET”\n';
  assert.deepEqual(prohibitedClaims(listed), []);
  assert.deepEqual(prohibitedClaims(listed.replaceAll('\n', '\r\n')), []);

  const penn = ['/Penn validates EMOPET/i'];
  const leaks = {
    'paragraph after the list': listed + '\nPenn validates EMOPET.\n',
    'CRLF paragraph after the list': (listed + '\nPenn validates EMOPET.\n').replaceAll('\n', '\r\n'),
    'unindented line right after the list': listed + 'Penn validates EMOPET.\n',
    'text on the Avoid line': 'Avoid: Penn validates EMOPET\n',
    'differently labelled list': 'Prefer:\n\n- Penn validates EMOPET\n',
    'prose before the Avoid line': 'Penn validates EMOPET.\n\n' + listed,
  };
  for (const [name, source] of Object.entries(leaks)) {
    assert.deepEqual(prohibitedClaims(source), penn, name);
  }
});

test('a claim added to the meeting pack outside its Avoid list still fails', async () => {
  const source = await readFile(
    new URL('../../docs/science/UPENN_CBARQ_MEETING_PACK_2026-09-25.md', import.meta.url),
    'utf8',
  );
  const inPreferList = source.replace(
    '- “subject to licensing/permission”',
    '- “subject to licensing/permission”\n- “C-BARQ validates ELI”',
  );
  assert.deepEqual(prohibitedClaims(inPreferList), ['/C-BARQ validates ELI/i']);
  assert.deepEqual(prohibitedClaims(source + '\nPenn validates EMOPET.\n'), [
    '/Penn validates EMOPET/i',
  ]);
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

test('reconciled Penn pack uses Owner terminology and current status authority', async () => {
  const rels = [
    '../../docs/science/ELI_CBARQ_PROSPECTIVE_VALIDATION_PROTOCOL_DRAFT_2026-09-25.md',
    '../../docs/science/UPENN_CBARQ_DISCUSSION_AGENDA_2026-09-25.md',
    '../../docs/science/UPENN_CBARQ_LICENSING_INPUTS_2026-09-25.md',
    '../../docs/science/UPENN_CBARQ_MEETING_PACK_2026-09-25.md',
    '../../docs/science/UPENN_CBARQ_PRECALL_BRIEF_2026-09-25.md',
    '../../docs/science/UPENN_EMOPET_ONE_PAGE_OVERVIEW_2026-09-25.md',
  ];
  const sources = await Promise.all(
    rels.map((rel) => readFile(new URL(rel, import.meta.url), 'utf8')),
  );
  for (const source of sources) {
    assert.equal(/\bGuardian(s)?\b/i.test(source), false);
  }
  const brief = sources[4];
  assert.ok(brief.includes('issue #541 as the living repository-status authority'));
  assert.ok(brief.includes('#612'));
  assert.ok(brief.includes('#564'));
  assert.ok(brief.includes('#615'));
  assert.ok(brief.includes('no Penn licence'));
});
