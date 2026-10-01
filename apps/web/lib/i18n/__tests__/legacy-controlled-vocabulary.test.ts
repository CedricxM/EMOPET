import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

interface LegacyVocabularyBudget {
  label: string;
  needle: string;
  maxOccurrences: number;
}

const LEGACY_VOCABULARY_BUDGETS: readonly LegacyVocabularyBudget[] = [
  {
    label: 'global ELI balance index — FR',
    needle: "Indice d'équilibre",
    maxOccurrences: 1,
  },
  {
    label: 'global ELI balance index — EN',
    needle: 'Balance index',
    maxOccurrences: 1,
  },
  {
    label: 'legacy wellbeing ELI label — FR',
    needle: 'Bien-être · ELI',
    maxOccurrences: 2,
  },
  {
    label: 'legacy wellbeing ELI label — EN',
    needle: 'Well-being · ELI',
    maxOccurrences: 2,
  },
  {
    label: 'generic wellbeing indicator claim — FR',
    needle: 'Indicateurs de bien-être',
    maxOccurrences: 1,
  },
  {
    label: 'generic wellbeing indicator claim — EN',
    needle: 'well-being indicators',
    maxOccurrences: 1,
  },
  {
    label: 'ELI dashboard navigation label',
    needle: 'ELI · Dashboard',
    maxOccurrences: 2,
  },
] as const;

function countOccurrences(haystack: string, needle: string): number {
  if (needle.length === 0) return 0;
  return haystack.split(needle).length - 1;
}

test('legacy public vocabulary can only decrease while MotsPet migration is pending', async () => {
  const source = await readFile(new URL('../dictionaries.ts', import.meta.url), 'utf8');

  for (const budget of LEGACY_VOCABULARY_BUDGETS) {
    const count = countOccurrences(source, budget.needle);
    assert.ok(
      count <= budget.maxOccurrences,
      budget.label + ': found ' + count + ' occurrences of "' + budget.needle + '", budget is ' + budget.maxOccurrences + '. ' +
        'Do not add new legacy wording; route new public terminology through the controlled language workstream.',
    );
  }
});
