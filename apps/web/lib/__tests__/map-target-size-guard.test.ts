/**
 * Garde WCAG 2.2 §2.5.8 — les spots de la carte doivent conserver une cible
 * de pointeur d'au moins 24 × 24 CSS px.
 *
 * La petite pastille SVG reste volontairement inchangée : elle encode un point
 * géographique précis et se réduit avec le viewBox. La cible interactive est
 * donc un vrai <button> HTML transparent superposé au même centre. Sa taille est
 * en pixels CSS, indépendante du facteur d'échelle du SVG.
 *
 * Cette garde ne remplace pas une mesure navigateur. Elle verrouille le
 * mécanisme qui rend la mesure possible et empêche une régression silencieuse
 * vers le <g role="button"> de ~12 px mesuré lors de la QA #708.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const webRoot = fileURLToPath(new URL('../../', import.meta.url));
const source = readFileSync(path.join(webRoot, 'components', 'bretagne-map', 'Map.tsx'), 'utf8');

function sliceBetween(startMarker: string, endMarker: string): string {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  assert.ok(start >= 0, `marqueur de début introuvable : ${startMarker}`);
  assert.ok(end > start, `marqueur de fin introuvable : ${endMarker}`);
  return source.slice(start, end);
}

test('la cible minimale des spots reste fixée à 24 CSS px', () => {
  assert.match(source, /const MIN_POINTER_TARGET_PX\s*=\s*24\s*;/);
  assert.match(source, /width:\s*MIN_POINTER_TARGET_PX/);
  assert.match(source, /height:\s*MIN_POINTER_TARGET_PX/);
  assert.match(source, /minWidth:\s*MIN_POINTER_TARGET_PX/);
  assert.match(source, /minHeight:\s*MIN_POINTER_TARGET_PX/);
});

test('les cibles sont des boutons HTML accessibles et centrés sur les coordonnées SVG', () => {
  const overlay = sliceBetween(
    '{/* WCAG 2.2 §2.5.8',
    '</div>',
  );

  assert.match(overlay, /<button/);
  assert.match(overlay, /type="button"/);
  assert.match(overlay, /aria-label=\{spot\.label\}/);
  assert.match(overlay, /onClick=\{\(\) => onSpotClick\(spot\.id\)\}/);
  assert.match(overlay, /spot\.x\s*\/\s*MAP_VIEWBOX_WIDTH/);
  assert.match(overlay, /spot\.y\s*\/\s*MAP_VIEWBOX_HEIGHT/);
  assert.match(overlay, /translate\(-50%, -50%\)/);
});

test('le pin SVG est visuel uniquement, sans deuxième cible concurrente', () => {
  const visualLayer = sliceBetween(
    '{/* Spots communautaires (Sprint 01)',
    '{/* Rose des vents',
  );

  assert.match(visualLayer, /pointerEvents="none"/);
  assert.match(visualLayer, /aria-hidden="true"/);
  assert.doesNotMatch(visualLayer, /role=\{/);
  assert.doesNotMatch(visualLayer, /tabIndex=/);
  assert.doesNotMatch(visualLayer, /onClick=/);
  assert.doesNotMatch(visualLayer, /onKeyDown=/);
});
