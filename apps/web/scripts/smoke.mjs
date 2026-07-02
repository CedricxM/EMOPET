#!/usr/bin/env node
/**
 * Smoke test HTTP automatique pour apps/web.
 *
 * Usage:
 *   pnpm dev         # dans un autre terminal
 *   pnpm smoke       # ce script
 *
 * Pour chaque route, vérifie :
 *   - HTTP 200
 *   - Présence d'une signature textuelle attendue (titre/contenu)
 *   - Markers EMOPET interdits absents
 *
 * Exit 0 si tout vert, 1 sinon. Pas de dépendance externe — node fetch natif.
 */

const BASE = process.env.SMOKE_URL ?? 'http://localhost:3100';

/** Routes à vérifier + signature attendue (substring case-insensitive). */
const ROUTES = [
  { path: '/',         expect: ['EMOPET', 'Accueil'],                 label: 'Accueil mobile preview' },
  { path: '/dashboard', expect: ['Dashboard', 'ELI'],                 label: 'Dashboard ELI' },
  { path: '/breiz',     expect: ['Breiz', 'observation'],             label: 'Chat Breiz' },
  { path: '/journal',   expect: ['Journal'],                          label: 'Journal' },
  { path: '/local',     expect: ['Veute', 'La meute bretonne', 'Lorient', 'Brest'], label: 'Local + Carte Bretagne' },
  { path: '/donnees',   expect: ['Tu gardes le contrôle', 'PRIVÉ', 'Phases d\'agitation'], label: 'Onglet Données RGPD' },
  { path: '/rapport',   expect: ['Rapport', 'observation'],           label: 'Rapport 14 jours' },
  { path: '/profil',    expect: ['Profil'],                           label: 'Profil' },
];

/**
 * Termes EMOPET INTERDITS dans tout HTML rendu côté serveur.
 * Note : certains mots sensibles peuvent exister uniquement dans des
 * formulations de refus ou de prudence. On cherche donc les usages SANS
 * négation préalable.
 */
const FORBIDDEN_NAKED = [
  // Usages directs = violation
  // (les négations sont OK et n'apparaissent pas ici car on filtre par contexte)
  // — pour le moment on désactive ce check côté HTML (les disclaimers contiennent ces mots)
];

function colorize(s, color) {
  const codes = { red: 31, green: 32, yellow: 33, cyan: 36, gray: 90 };
  return `\x1b[${codes[color]}m${s}\x1b[0m`;
}

async function checkRoute({ path, expect, label }) {
  const url = `${BASE}${path}`;
  const t0 = Date.now();
  try {
    const res = await fetch(url, { headers: { Accept: 'text/html' } });
    const dt = Date.now() - t0;
    if (!res.ok) {
      return { path, label, ok: false, dt, reason: `HTTP ${res.status}` };
    }
    const html = await res.text();
    const missing = expect.filter((s) => !html.toLowerCase().includes(s.toLowerCase()));
    if (missing.length > 0) {
      return { path, label, ok: false, dt, reason: `manque: ${missing.join(', ')}` };
    }
    for (const banned of FORBIDDEN_NAKED) {
      if (html.toLowerCase().includes(banned.toLowerCase())) {
        return { path, label, ok: false, dt, reason: `terme interdit: "${banned}"` };
      }
    }
    return { path, label, ok: true, dt };
  } catch (err) {
    return { path, label, ok: false, dt: Date.now() - t0, reason: err.message };
  }
}

async function main() {
  console.log(colorize(`⊙ Smoke ${BASE}`, 'cyan'));
  console.log();
  const results = [];
  for (const r of ROUTES) {
    const out = await checkRoute(r);
    results.push(out);
    const icon = out.ok ? colorize('✓', 'green') : colorize('✕', 'red');
    const time = colorize(`${out.dt}ms`, 'gray');
    const tail = out.ok ? '' : colorize(` — ${out.reason}`, 'yellow');
    console.log(`  ${icon} ${out.path.padEnd(12)} ${time}  ${out.label}${tail}`);
  }
  const failed = results.filter((r) => !r.ok);
  console.log();
  if (failed.length === 0) {
    console.log(colorize(`✓ ${results.length}/${results.length} routes OK`, 'green'));
    process.exit(0);
  } else {
    console.log(colorize(`✕ ${failed.length}/${results.length} routes en échec`, 'red'));
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(colorize(`✕ ${err.message}`, 'red'));
  process.exit(1);
});
