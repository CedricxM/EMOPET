'use client';

import { CATEGORIES } from './data';
import type { CategoryId, LevelId } from './data';

/**
 * Utilitaires d'export et génération de mock data.
 * Dans un fichier dédié pour rester importable sans charger les
 * composants Modal (eux sont lazy-loadés via next/dynamic).
 */

/**
 * ⚠ DEMO MOCK — Génère des mesures fictives pour la table "Voir mes données"
 * et l'export CSV/JSON. À remplacer par un appel vers l'API
 * `/api/v6/measurements?since=...` quand le backend sera branché.
 */
export function buildMockRows(): Array<{ date: string; cat: string; value: string; level: string }> {
  const rows: Array<{ date: string; cat: string; value: string; level: string }> = [];
  const today = new Date();
  const sampleValues: Record<string, string> = {
    sommeil: '7h28 — 4 cycles',
    activite: '12.4 km · 3h08',
    agitation: '2 phases · 14 min',
    environnement: '21.4°C · 58% HR',
    profil: 'Labrador · 4 ans · M · 32 kg',
  };
  for (let i = 0; i < 30; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const isoDate = d.toISOString().slice(0, 10);
    Object.entries(sampleValues).forEach(([catId, val]) => {
      rows.push({
        date: isoDate,
        cat: CATEGORIES.find((c) => c.id === catId)?.name ?? catId,
        value: val,
        level: 'anonymise',
      });
    });
  }
  return rows;
}

/**
 * Échappe un champ pour CSV conforme RFC 4180 :
 *   - champs contenant `,` `"` `\n` ou `\r` entourés de guillemets
 *   - guillemets internes doublés.
 */
function csvField(v: string | number): string {
  const s = String(v);
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function exportData(
  format: 'csv' | 'json',
  categoryState: Record<CategoryId, { on: boolean; level: LevelId }>,
) {
  const allRows = buildMockRows().filter((r) => {
    const cat = CATEGORIES.find((c) => c.name === r.cat);
    if (!cat) return true;
    return categoryState[cat.id]?.on;
  });

  let blob: Blob;
  let filename: string;

  if (format === 'csv') {
    const header = 'date,categorie,valeur,niveau';
    const body = allRows
      .map((r) => [r.date, r.cat, r.value, r.level].map(csvField).join(','))
      .join('\r\n');
    // RFC 4180 : header + CRLF + lignes data, BOM UTF-8 pour Excel FR
    blob = new Blob(['﻿', `${header}\r\n${body}\r\n`], { type: 'text/csv;charset=utf-8' });
    filename = `emopet-export-${new Date().toISOString().slice(0, 10)}.csv`;
  } else {
    blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), rows: allRows }, null, 2)], {
      type: 'application/json',
    });
    filename = `emopet-export-${new Date().toISOString().slice(0, 10)}.json`;
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
