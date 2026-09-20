/**
 * Génère docs/api-layer/API_PROVIDER_MATRIX.md À PARTIR du registre (source unique).
 * Lancer : node --import tsx scripts/gen-provider-matrix.ts
 * La matrice reste ainsi toujours synchronisée avec lib/api/providerRegistry.ts.
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { PROVIDERS } from '../lib/api/providerRegistry';

const scriptDir = dirname(process.argv[1] ?? process.cwd());

const ADAPTER_FILE: Record<string, string> = {
  'open-meteo': 'adapters/openMeteo.ts',
  openaq: 'adapters/openAQ.ts',
  'adresse-data-gouv': 'adapters/adresseDataGouv.ts',
  'geoapi-gouv': 'adapters/geoApiGouv.ts',
  'nager-date': 'adapters/nagerDate.ts',
  'dog-ceo': 'adapters/dogCeo.ts',
  libretranslate: 'adapters/libreTranslate.ts',
  disify: 'adapters/disify.ts',
  eva: 'adapters/disify.ts (repli)',
  purgomalum: 'adapters/purgoMalum.ts',
};

function markdownTableCell(value: unknown): string {
  return String(value)
    .split('\r').join(' ')
    .split('\n').join(' ')
    .split('|').join('&#124;')
    .trim();
}

const head = [
  '# API Provider Matrix — EMOPET',
  '',
  '> **Généré** depuis `apps/web/lib/api/providerRegistry.ts` via `scripts/gen-provider-matrix.ts`.',
  '> Ne pas éditer à la main : modifier le registre puis régénérer. Toutes les URL sont en HTTPS.',
  '> `status` = état runtime ; `recommandé` = stratégie d\'intégration ; `flag` = variable d\'env d\'activation.',
  '',
  `Total : **${PROVIDERS.length} providers** sur 12 catégories.`,
  '',
  '| Provider | Catégorie | URL | Auth | Free tier | Commercial | Privacy | RateLimit | Complexité | Valeur | Statut | Recommandé | Flag | Env | Adapter | Fallback |',
  '|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|',
];

const rows = PROVIDERS.map((d) =>
  [
    markdownTableCell(d.providerName),
    markdownTableCell(d.category),
    markdownTableCell(d.baseUrl),
    d.requiresAuth ? 'oui' : 'non',
    markdownTableCell(d.freeTierNotes || '—'),
    markdownTableCell(d.commercialUseRisk),
    markdownTableCell(d.privacyRisk),
    markdownTableCell(d.rateLimitRisk),
    markdownTableCell(d.implementationComplexity),
    markdownTableCell(d.productValueForEMOPET),
    markdownTableCell(d.status),
    markdownTableCell(d.recommended),
    `\`${markdownTableCell(d.flagKey)}\``,
    d.envKeys.length ? d.envKeys.map((k) => `\`${markdownTableCell(k)}\``).join(' ') : '—',
    markdownTableCell(ADAPTER_FILE[d.providerName] ?? '—'),
    markdownTableCell(d.fallbackProvider ?? '—'),
  ].join(' | '),
).map((r) => `| ${r} |`);

const out = `${head.join('\n')}\n${rows.join('\n')}\n`;
const target = join(scriptDir, '../../../docs/api-layer/API_PROVIDER_MATRIX.md');
writeFileSync(target, out, 'utf8');
console.log(`✓ Matrice écrite : ${target} (${PROVIDERS.length} providers)`);
