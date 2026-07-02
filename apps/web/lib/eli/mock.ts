/**
 * Données ELI v6 simulées (Sprint 03, réaligné sur EMOPET_ELI_v6).
 *
 * Terminologie FIDÈLE au modèle :
 *  - Indicateur de bien-être global : composite issu de l'arousal/charge (0-100).
 *  - WQI = Walk Quality Index : qualité de balade = exercice (0.40) + exploration
 *    (0.35) + social (0.25). PAS l'indicateur global.
 *  - RSI = Routine Stability Index : similarité cosinus du pattern 24 h vs moyenne
 *    14 j (0-100 ; ≥80 stable, <50 trois jours → signal).
 *  - Gating de publication : PUBLISH (≥0.70) / DEGRADE (0.40-0.70) / REJECT (<0.40).
 *  - Quality tier de la fenêtre : GOLD / SILVER / BRONZE / REJECTED.
 *  - v6 : recovery speed (McEwen type 3), anticipation index, baseline freeze→véto.
 *
 * ⚠ Données SIMULÉES — PRNG déterministe. À remplacer par l'API ELI réelle.
 */

import type { ConfidenceState, FamilyId, IndicatorState } from './catalog';
import { FAMILIES, PROXIES, SUB_BASELINES, proxiesOf } from './catalog';

const DAYS = 90;
const BASELINE_DAYS = 14;

const PROXY_BASE: Record<string, { mean: number; invert?: boolean; decimals?: number }> = {
  A01: { mean: 240 }, A02: { mean: 0.8, decimals: 2 }, A03: { mean: 18 }, A04: { mean: 12, invert: true }, A05: { mean: 2.4, decimals: 2 }, A06: { mean: 0.82, decimals: 2 },
  R01: { mean: 13, decimals: 1 }, R02: { mean: 5.5, decimals: 1 }, R03: { mean: 28, invert: true }, R04: { mean: 14, invert: true }, R05: { mean: 3, invert: true }, R06: { mean: 0.78, decimals: 2 }, R07: { mean: 110 },
  G01: { mean: 22, invert: true }, G02: { mean: 0.16, invert: true, decimals: 2 }, G03: { mean: 4 }, G04: { mean: 11, invert: true }, G05: { mean: 0.86, decimals: 2 },
  S01: { mean: 3 }, S02: { mean: 7, invert: true }, S03: { mean: 320 }, S04: { mean: 9, invert: true }, S05: { mean: 0.8, decimals: 2 },
};

const FAMILY_WEIGHTS: Record<FamilyId, number> = { activite: 0.25, repos: 0.35, regulation: 0.25, sociabilite: 0.15 };

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function strSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export type DataTier = 'GOLD' | 'SILVER' | 'BRONZE' | 'REJECTED';
export type GateStatus = 'PUBLISH' | 'DEGRADE' | 'REJECT';

export interface ProxyDaily {
  value: number;
  confidenceState: ConfidenceState;
  ci: [number, number];
  dataPointsCount: number;
}

export interface DailySnapshot {
  date: string;
  proxies: Record<string, ProxyDaily>;
  /** Indicateur de bien-être global (0-100). */
  wellbeing: number;
  /** WQI — Walk Quality Index (0-100) + sous-dimensions. */
  walkQuality: { score: number; exercise: number; exploration: number; social: number };
  /** RSI — Routine Stability Index (0-100, ≈ cosine_sim×100). */
  routineStability: number;
  activeVetoes: string[];
  tier: DataTier;
}

function isoDay(offset: number): string {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - offset);
  return d.toISOString().slice(0, 10);
}

export function generateSnapshots(): DailySnapshot[] {
  const snapshots: DailySnapshot[] = [];

  for (let i = DAYS - 1; i >= 0; i--) {
    const date = isoDay(i);
    const dayIndex = DAYS - 1 - i;
    const proxies: Record<string, ProxyDaily> = {};
    const famSum: Record<FamilyId, { sum: number; n: number }> = {
      activite: { sum: 0, n: 0 }, repos: { sum: 0, n: 0 }, regulation: { sum: 0, n: 0 }, sociabilite: { sum: 0, n: 0 },
    };
    let suppressed = 0;
    let degraded = 0;

    for (const proxy of PROXIES) {
      const rng = mulberry32(strSeed(proxy.id) + dayIndex * 2654435761);
      const wave = 8 * Math.sin((dayIndex / 9) + (strSeed(proxy.id) % 7));
      const noise = (rng() - 0.5) * 10;
      const trend = (dayIndex - DAYS / 2) * 0.04;
      let score = 71 + wave + noise + trend;
      score = Math.max(28, Math.min(96, score));

      const r = rng();
      let confidenceState: ConfidenceState = 'VALID';
      if (r > 0.96) { confidenceState = 'SUPPRESSED'; suppressed++; }
      else if (r > 0.84) { confidenceState = 'DEGRADED'; degraded++; }

      const base = PROXY_BASE[proxy.id]!;
      const dir = base.invert ? -1 : 1;
      const factor = 1 + dir * (score - 70) / 220;
      const decimals = base.decimals ?? 0;
      const value = Number((base.mean * factor).toFixed(decimals));
      const ciW = (confidenceState === 'VALID' ? 0.05 : 0.12) * Math.abs(value || 1);
      proxies[proxy.id] = {
        value,
        confidenceState,
        ci: [Number((value - ciW).toFixed(decimals + 1)), Number((value + ciW).toFixed(decimals + 1))],
        dataPointsCount: confidenceState === 'SUPPRESSED' ? 4 : confidenceState === 'DEGRADED' ? 40 : 120,
      };
      famSum[proxy.family].sum += score;
      famSum[proxy.family].n += 1;
    }

    const famScore: Record<FamilyId, number> = {
      activite: famSum.activite.sum / famSum.activite.n,
      repos: famSum.repos.sum / famSum.repos.n,
      regulation: famSum.regulation.sum / famSum.regulation.n,
      sociabilite: famSum.sociabilite.sum / famSum.sociabilite.n,
    };
    const wellbeing =
      famScore.activite * FAMILY_WEIGHTS.activite +
      famScore.repos * FAMILY_WEIGHTS.repos +
      famScore.regulation * FAMILY_WEIGHTS.regulation +
      famScore.sociabilite * FAMILY_WEIGHTS.sociabilite;

    // WQI — Walk Quality (exercice 0.40 + exploration 0.35 + social 0.25), seedé.
    const wq = mulberry32(strSeed('wqi') + dayIndex * 40503);
    const exercise = Math.max(35, Math.min(98, 72 + 14 * Math.sin(dayIndex / 6) + (wq() - 0.5) * 16));
    const exploration = Math.max(30, Math.min(96, 66 + 12 * Math.sin(dayIndex / 5 + 1) + (wq() - 0.5) * 18));
    const social = Math.max(20, Math.min(95, 58 + 16 * Math.sin(dayIndex / 8 + 2) + (wq() - 0.5) * 20));
    const walkQualityScore = exercise * 0.40 + exploration * 0.35 + social * 0.25;

    // RSI — Routine Stability (cosine-sim mock, mostly stable 78-94).
    const rs = mulberry32(strSeed('rsi') + dayIndex * 19349663);
    const routineStability = Math.max(45, Math.min(96, 86 + 6 * Math.sin(dayIndex / 11) + (rs() - 0.5) * 8));

    const activeVetoes: string[] = [];
    if (dayIndex >= 40 && dayIndex <= 46) activeVetoes.push('V1');
    if (dayIndex >= 70 && dayIndex <= 73) activeVetoes.push('V2');
    if (dayIndex === DAYS - 2 || dayIndex === DAYS - 3) activeVetoes.push('V8');

    // Quality tier (cf. ELI v6 §11) à partir de la qualité des données du jour.
    let tier: DataTier = 'GOLD';
    if (suppressed >= 2) tier = 'REJECTED';
    else if (suppressed === 1 || degraded >= 4) tier = 'BRONZE';
    else if (degraded >= 1) tier = 'SILVER';

    snapshots.push({
      date,
      proxies,
      wellbeing: Number(wellbeing.toFixed(1)),
      walkQuality: { score: Number(walkQualityScore.toFixed(1)), exercise: Math.round(exercise), exploration: Math.round(exploration), social: Math.round(social) },
      routineStability: Number(routineStability.toFixed(1)),
      activeVetoes,
      tier,
    });
  }

  return snapshots;
}

export interface Baseline {
  frozenAt: string;
  values: Record<string, { mean: number; std: number; n: number }>;
  wellbeingMean: number;
  walkQualityMean: number;
  routineStabilityMean: number;
}

function meanStd(xs: number[]): { mean: number; std: number } {
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  const variance = xs.reduce((a, b) => a + (b - mean) ** 2, 0) / xs.length;
  return { mean, std: Math.sqrt(variance) };
}

export function freezeBaseline(snapshots: DailySnapshot[]): Baseline {
  const window = snapshots.slice(0, BASELINE_DAYS);
  const values: Baseline['values'] = {};
  for (const proxy of PROXIES) {
    const xs = window.map((s) => s.proxies[proxy.id]!.value);
    const { mean, std } = meanStd(xs);
    values[proxy.id] = { mean: Number(mean.toFixed(2)), std: Number(std.toFixed(2)), n: window.length };
  }
  return {
    frozenAt: window[window.length - 1]!.date,
    values,
    wellbeingMean: Number(meanStd(window.map((s) => s.wellbeing)).mean.toFixed(1)),
    walkQualityMean: Number(meanStd(window.map((s) => s.walkQuality.score)).mean.toFixed(1)),
    routineStabilityMean: Number(meanStd(window.map((s) => s.routineStability)).mean.toFixed(1)),
  };
}

function stateOf(delta: number): IndicatorState {
  if (delta >= 3) return 'amelioration';
  if (delta <= -3) return 'attention';
  return 'stable';
}

/** Gating de publication ELI v6 §13 à partir de la couverture de données. */
export function gateOf(coverage: number): GateStatus {
  if (coverage >= 0.7) return 'PUBLISH';
  if (coverage >= 0.4) return 'DEGRADE';
  return 'REJECT';
}

function coverageConfidence(coverage: number): ConfidenceState {
  if (coverage >= 0.75) return 'VALID';
  if (coverage >= 0.4) return 'DEGRADED';
  return 'SUPPRESSED';
}

export interface IndicatorScore {
  current: number;
  baselineMean: number;
  delta: number;
  state: IndicatorState;
  confidenceState: ConfidenceState;
  spark: number[];
}
export interface FamilyScore extends IndicatorScore { family: FamilyId; }
export interface WalkQualityScore extends IndicatorScore {
  exercise: number;
  exploration: number;
  social: number;
}

export interface EliSummary {
  period: { start: string; end: string; days: number };
  /** Indicateur de bien-être global (PAS le WQI). */
  wellbeing: IndicatorScore;
  /** WQI — qualité de balade. */
  wqi: WalkQualityScore;
  /** RSI — stabilité de routine. */
  rsi: IndicatorScore;
  families: Record<FamilyId, FamilyScore>;
  /** Recovery speed (min) + tendance sur 4 semaines (McEwen type 3). */
  recovery: { minutes: number; trend4wPct: number };
  /** Anticipation index (ratio) + occurrences détectées. */
  anticipation: { index: number; occurrences: number };
  activeVetoes: string[];
  dataCoverage: number;
  gate: GateStatus;
  tier: DataTier;
  baselineFrozen: boolean;
  baselineFrozenAt: string;
  /** Signal de dérive : signaux hors profil >30 j → suggestion véto factuelle. */
  driftSignal: { active: boolean; message?: string };
  /** 5 sous-baselines contextuelles (ELI v6 §4) avec recovery time + couverture. */
  subBaselines: Array<{ id: string; label: string; description: string; recoveryMin: number; sampleCount: number; confidence: ConfidenceState }>;
}

function familyDayScore(snap: DailySnapshot, family: FamilyId): number {
  if (family === 'repos') {
    // Repos dérivé des proxies repos (et non plus du RSI, désormais distinct).
    const ps = proxiesOf('repos');
    let sum = 0;
    for (const p of ps) {
      const base = PROXY_BASE[p.id]!;
      const dir = base.invert ? -1 : 1;
      const v = snap.proxies[p.id]!.value;
      sum += Math.max(28, Math.min(96, 70 + dir * ((v / base.mean) - 1) * 220));
    }
    return sum / ps.length;
  }
  const ps = proxiesOf(family);
  let sum = 0;
  for (const p of ps) {
    const base = PROXY_BASE[p.id]!;
    const dir = base.invert ? -1 : 1;
    const v = snap.proxies[p.id]!.value;
    sum += Math.max(28, Math.min(96, 70 + dir * ((v / base.mean) - 1) * 220));
  }
  return sum / ps.length;
}

export function summarize(snapshots: DailySnapshot[], baseline: Baseline, periodDays: number): EliSummary {
  const window = snapshots.slice(-periodDays);
  const start = window[0]!.date;
  const end = window[window.length - 1]!.date;

  const validDays = window.filter((s) => Object.values(s.proxies).every((p) => p.confidenceState !== 'SUPPRESSED')).length;
  const dataCoverage = validDays / window.length;
  const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

  function indicator(values: number[], baselineMean: number): IndicatorScore {
    const current = Number(avg(values).toFixed(1));
    const delta = Number((current - baselineMean).toFixed(1));
    return { current, baselineMean, delta, state: stateOf(delta), confidenceState: coverageConfidence(dataCoverage), spark: values.map((v) => Number(v.toFixed(1))) };
  }

  const families = {} as Record<FamilyId, FamilyScore>;
  for (const f of FAMILIES) {
    const series = window.map((s) => familyDayScore(s, f.id));
    const baseMean = Number(avg(snapshots.slice(0, BASELINE_DAYS).map((s) => familyDayScore(s, f.id))).toFixed(1));
    families[f.id] = { ...indicator(series, baseMean), family: f.id };
  }

  const wqiBase = indicator(window.map((s) => s.walkQuality.score), baseline.walkQualityMean);
  const wqi: WalkQualityScore = {
    ...wqiBase,
    exercise: Math.round(avg(window.map((s) => s.walkQuality.exercise))),
    exploration: Math.round(avg(window.map((s) => s.walkQuality.exploration))),
    social: Math.round(avg(window.map((s) => s.walkQuality.social))),
  };

  const rsiScore = indicator(window.map((s) => s.routineStability), baseline.routineStabilityMean);

  // Recovery & anticipation — mock cohérent (v6).
  const recovery = { minutes: 13, trend4wPct: 6 };
  const anticipation = { index: 1.3, occurrences: 5 };

  const activeVetoes = Array.from(new Set(window.flatMap((s) => s.activeVetoes)));
  const lastTier = window[window.length - 1]!.tier;

  return {
    period: { start, end, days: periodDays },
    wellbeing: indicator(window.map((s) => s.wellbeing), baseline.wellbeingMean),
    wqi,
    rsi: rsiScore,
    families,
    recovery,
    anticipation,
    activeVetoes,
    dataCoverage: Number(dataCoverage.toFixed(2)),
    gate: gateOf(dataCoverage),
    tier: lastTier,
    baselineFrozen: true,
    baselineFrozenAt: baseline.frozenAt,
    driftSignal: { active: false }, // inactif dans la démo ; sinon message factuel ci-dessous
    subBaselines: SUB_BASELINES.map((sb, i) => {
      const rng = mulberry32(strSeed(sb.id));
      const samples = 40 + Math.floor(rng() * 160);
      return {
        id: sb.id,
        label: sb.label,
        description: sb.description,
        recoveryMin: 8 + Math.round(rng() * 14) + i, // mock, cohérent (McEwen type 3)
        sampleCount: samples,
        confidence: samples > 120 ? 'VALID' : samples > 60 ? 'DEGRADED' : 'SUPPRESSED',
      };
    }),
  };
}

export interface ProxyHistoryPoint {
  date: string;
  value: number;
  confidenceState: ConfidenceState;
}

export function proxyHistory(snapshots: DailySnapshot[], proxyId: string, periodDays: number): ProxyHistoryPoint[] {
  return snapshots.slice(-periodDays).map((s) => ({
    date: s.date,
    value: s.proxies[proxyId]!.value,
    confidenceState: s.proxies[proxyId]!.confidenceState,
  }));
}
