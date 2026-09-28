import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Affirmative endorsement/validation claims that must never appear in Penn
// meeting material (authority §12 lists "Penn validated EMOPET" as not allowed).
const FORBIDDEN_CLAIMS = [/Penn validate[sd] EMOPET/i, /C-BARQ validate[sd] ELI/i];

const RED_LINE_HEADING = /^#{1,6}\s+(?:\d+\.\s+)?Red-line language\b/i;
const HEADING = /^#{1,6}\s/;
const QUOTED_AVOID_ITEM = /^(\s*-\s+)(“[^”]*”|"[^"]*")/;

// The meeting pack quotes the forbidden phrases in its own red-line list so
// speakers know what not to say. Mask exactly that: the leading quoted phrase
// of each contiguous list item under `Avoid:` inside a "Red-line language"
// section. Anything else — prose, unquoted items, text after the quote, an
// `Avoid:` list in any other section — is still scanned.
function maskRedLineAvoidPhrases(source) {
  const masked = [];
  let inRedLine = false;
  let state = 'outside'; // outside | after-label | in-list
  const lines = source.split(/\r?\n/).map((line) => {
    if (HEADING.test(line)) {
      inRedLine = RED_LINE_HEADING.test(line);
      state = 'outside';
      return line;
    }
    if (inRedLine && line.trim() === 'Avoid:') {
      state = 'after-label';
      return line;
    }
    if (state === 'after-label' && line.trim() === '') return line;
    if (state !== 'outside') {
      const item = QUOTED_AVOID_ITEM.exec(line);
      if (item) {
        state = 'in-list';
        masked.push(item[2].slice(1, -1));
        return item[1] + '“”' + line.slice(item[0].length);
      }
      state = 'outside';
    }
    return line;
  });
  return { text: lines.join('\n'), masked };
}

function findForbiddenClaims(source) {
  const { text } = maskRedLineAvoidPhrases(source);
  return FORBIDDEN_CLAIMS.filter((re) => re.test(text)).map(String);
}

test('UPenn meeting materials do not claim endorsement or completed validation', async () => {
  for (const rel of [
    '../../docs/science/UPENN_EMOPET_ONE_PAGE_OVERVIEW_2026-09-25.md',
    '../../docs/science/UPENN_CBARQ_MEETING_PACK_2026-09-25.md',
  ]) {
    const source = await readFile(new URL(rel, import.meta.url), 'utf8');
    assert.ok(source.includes('NO PENN ENDORSEMENT') || source.includes('NO AGREEMENT IMPLIED'));
    assert.deepEqual(findForbiddenClaims(source), [], rel);
  }
});

test('meeting pack red-line list still prohibits the validation claims it quotes', async () => {
  const source = await readFile(
    new URL('../../docs/science/UPENN_CBARQ_MEETING_PACK_2026-09-25.md', import.meta.url),
    'utf8',
  );
  const { masked } = maskRedLineAvoidPhrases(source);
  assert.ok(masked.includes('Penn validates EMOPET'));
  assert.ok(masked.includes('C-BARQ validates ELI'));
});

const RED_LINE_FIXTURE = [
  '## 7. Red-line language during the meeting',
  '',
  'Prefer:',
  '',
  '- “not yet validated”',
  '',
  'Avoid:',
  '',
  '- “C-BARQ validates ELI”',
  '- “Penn validates EMOPET”',
  '- “partnership with Penn” unless formally agreed.',
  '',
  '## 8. Next section',
  '',
].join('\n');

test('red-line mask covers only the quoted Avoid phrases', () => {
  assert.deepEqual(findForbiddenClaims(RED_LINE_FIXTURE), []);
  assert.deepEqual(findForbiddenClaims(RED_LINE_FIXTURE.replace(/\n/g, '\r\n')), []);
});

test('affirmative claims outside the red-line Avoid list still fail', () => {
  const cases = {
    'prose elsewhere': RED_LINE_FIXTURE + 'Penn validates EMOPET for this study.\n',
    'prose inside the red-line section, after the list': RED_LINE_FIXTURE.replace(
      '\n## 8.',
      'We confirm C-BARQ validates ELI.\n\n## 8.',
    ),
    'unquoted item in the Avoid list': RED_LINE_FIXTURE.replace(
      '- “Penn validates EMOPET”',
      '- Penn validates EMOPET',
    ),
    'text after the quoted phrase': RED_LINE_FIXTURE.replace(
      '- “C-BARQ validates ELI”',
      '- “C-BARQ validates ELI” — but Penn validates EMOPET',
    ),
    'Avoid list outside a red-line section': RED_LINE_FIXTURE.replace(
      '## 7. Red-line language during the meeting',
      '## 7. Talking points',
    ),
    'past-tense claim': RED_LINE_FIXTURE + 'Penn validated EMOPET in 2026.\n',
  };
  for (const [name, source] of Object.entries(cases)) {
    assert.notDeepEqual(findForbiddenClaims(source), [], name);
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
