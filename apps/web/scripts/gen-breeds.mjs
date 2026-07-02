/**
 * Génère lib/breiz-rag/breeds.generated.ts à partir du référentiel FCI réel
 * (data/breed_profiles.json). Sous-ensemble curé pour garder un bundle léger.
 *
 *   node scripts/gen-breeds.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../../..');
const all = JSON.parse(fs.readFileSync(path.join(root, 'data/breed_profiles.json'), 'utf8'));

const WANT = [
  'Retriever du Labrador', 'Border Collie', 'Golden Retriever', 'Chien de Berger Australien',
  'Husky Sibérien', 'Berger Allemand', 'Épagneul Breton', 'Cavalier King Charles',
  'Bouledogue Français', 'Beagle', 'Cocker Spaniel Anglais', 'Jack Russell',
  'Chihuahua', 'Berger des Pyrénées', 'Cane Corso', 'Caniche', 'Bouvier Bernois', 'Teckel',
];

const SIZE_FR = { small: 'petit gabarit', medium: 'gabarit moyen', large: 'grand gabarit', giant: 'très grand gabarit' };

function pick(name) {
  return all.find((b) => (b.breed_name_fr || '').toLowerCase().includes(name.toLowerCase()));
}

const docs = [];
for (const name of WANT) {
  const b = pick(name);
  if (!b) continue;
  const m = b.morphology || {};
  const t = b.temperament || {};
  const desc = (t.descriptors || []).slice(0, 3).join(', ');
  const brach = m.is_brachycephalic ? ', race brachycéphale (prudence chaleur/effort)' : '';
  const coatFR = { double_short: 'double court', double_long: 'double long', smooth: 'ras', short: 'court', long: 'long', wiry: 'dur', curly: 'bouclé' };
  const text = [
    `Le ${b.breed_name_fr} (groupe FCI ${b.fci_group}, origine ${b.country_origin}) :`,
    `${SIZE_FR[m.size_class] || m.size_class || 'gabarit variable'}, poil ${coatFR[m.coat_type] || m.coat_type || 'variable'}${brach}.`,
    desc ? `Tempérament observé : ${desc}.` : '',
  ].join(' ').replace(/\s+/g, ' ').trim();

  docs.push({
    id: `breed-${b.fci_number}`,
    title: b.breed_name_fr,
    text,
    source: 'Profils de races EMOPET (référentiel FCI)',
    tags: ['race', (b.breed_name_fr || '').toLowerCase()],
  });
}

const out =
  '/**\n' +
  ' * Corpus races (R4 Breiz RAG) — extrait du référentiel FCI réel\n' +
  ' * (data/breed_profiles.json). Généré par scripts/gen-breeds.mjs. NE PAS éditer à la main.\n' +
  ' * Données factuelles, non médicales.\n' +
  ' */\n' +
  "import type { KnowledgeDoc } from './corpus';\n\n" +
  'export const BREED_DOCS: KnowledgeDoc[] = ' +
  JSON.stringify(docs, null, 2) +
  ';\n';

fs.writeFileSync(path.join(__dirname, '../lib/breiz-rag/breeds.generated.ts'), out);
console.log('wrote', docs.length, 'breed docs');
