/**
 * Insight generator — transforms sensor data into human-readable observations.
 *
 * This module bridges raw numbers and Bleiz templates. It NEVER outputs
 * raw numbers to the user — everything is contextualized as comparisons,
 * trends, or qualitative descriptions.
 */

import type { AIGenerationContext } from '@emopet/shared';
import { checkAIMessageSafety } from '@emopet/shared';
import { getToneProfile, pickRandom } from '../tone/index.js';
import { getTemplates, fillTemplate } from '../templates/index.js';

// ── Qualitative Mappers ─────────────────────────────────────────

function activityComparison(distKm: number, avgKm: number): string {
  const ratio = avgKm > 0 ? distKm / avgKm : 1;
  if (ratio > 1.3) return 'plus actif que d\'habitude';
  if (ratio < 0.7) return 'plus calme que d\'habitude';
  return 'dans sa routine habituelle';
}

function matComparison(minutes: number, avgMinutes: number): string {
  const ratio = avgMinutes > 0 ? minutes / avgMinutes : 1;
  if (ratio > 1.3) return 'c\'est plus que d\'habitude';
  if (ratio < 0.7) return 'c\'est moins que d\'habitude';
  return 'c\'est dans la moyenne';
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)} minutes`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m > 0 ? `${h}h${m.toString().padStart(2, '0')}` : `${h}h`;
}

// ── Main Generator ──────────────────────────────────────────────

export interface GeneratedInsight {
  content: string;
  category: string;
  safetyPassed: boolean;
  violations: string[];
}

/**
 * Generate a daily insight message for a dog.
 */
export function generateDailyInsight(ctx: AIGenerationContext): GeneratedInsight {
  const tone = getToneProfile(ctx.toneProfile);
  const templates = getTemplates('daily_insight');

  const variables: Record<string, string> = {
    dogName: ctx.dogName,
    hedge: pickRandom(tone.hedgingPhrases),
    encouragement: pickRandom(tone.encouragement),
    detail: '',
  };

  // Choose template based on available data
  if (ctx.todayActivity) {
    variables['activityComparison'] = activityComparison(
      ctx.todayActivity.distanceKm,
      ctx.todayActivity.avgKm,
    );
    variables['detail'] = ctx.todayActivity.distanceKm > 0
      ? `${variables['hedge']} une journee a ${ctx.todayActivity.distanceKm.toFixed(1)} km de balades.`
      : '';
  }

  if (ctx.todayMat) {
    variables['matTime'] = formatDuration(ctx.todayMat.minutes);
    variables['matComparison'] = matComparison(ctx.todayMat.minutes, ctx.todayMat.avgMinutes);
  }

  // Pick a template that has its requirements met
  const usable = templates.filter((t) =>
    t.requires.every((r) => variables[r] != null && variables[r] !== ''),
  );

  if (usable.length === 0) {
    // Fallback
    const content = `${pickRandom(tone.hedgingPhrases)} ${ctx.dogName} a eu une journee tranquille. ${pickRandom(tone.encouragement)}`;
    const safety = checkAIMessageSafety(content);
    return { content, category: 'daily_insight', safetyPassed: safety.passed, violations: safety.violations };
  }

  const template = pickRandom(usable);
  const content = fillTemplate(template.template, variables);
  const safety = checkAIMessageSafety(content);

  return {
    content,
    category: 'daily_insight',
    safetyPassed: safety.passed,
    violations: safety.violations,
  };
}

/**
 * Generate a morning greeting for a dog.
 */
export function generateMorningGreeting(
  ctx: AIGenerationContext,
  nightQuality: 'bonne' | 'agitee' | 'courte',
): GeneratedInsight {
  const tone = getToneProfile(ctx.toneProfile);

  const variables: Record<string, string> = {
    dogName: ctx.dogName,
    hedge: pickRandom(tone.hedgingPhrases),
    encouragement: pickRandom(tone.encouragement),
    nightQuality,
    morningState: nightQuality === 'bonne' ? 'en pleine forme' : 'un peu fatigue(e)',
    detail: '',
  };

  if (ctx.weather) {
    const culturalNote = tone.culturalNotes.length > 0 ? pickRandom(tone.culturalNotes) : '';
    variables['detail'] = culturalNote
      ? `${culturalNote}, il fait ${ctx.weather.tempC}°C.`
      : `Il fait ${ctx.weather.tempC}°C dehors.`;
  }

  const templates = getTemplates('morning_greeting');
  const template = pickRandom(templates);
  const content = fillTemplate(template.template, variables);
  const safety = checkAIMessageSafety(content);

  return {
    content,
    category: 'morning_greeting',
    safetyPassed: safety.passed,
    violations: safety.violations,
  };
}

/**
 * Generate a record announcement.
 */
export function generateRecordAnnouncement(
  ctx: AIGenerationContext,
  recordType: string,
  value: number,
  previousValue: number,
): GeneratedInsight {
  const tone = getToneProfile(ctx.toneProfile);

  const variables: Record<string, string> = {
    dogName: ctx.dogName,
    encouragement: pickRandom(tone.encouragement),
    recordDescription: `a atteint ${value} en ${recordType}`,
    previousComparison: `Le precedent record etait de ${previousValue}.`,
  };

  const templates = getTemplates('record_announcement');
  const template = templates.length > 0 ? pickRandom(templates) : null;
  const content = template
    ? fillTemplate(template.template, variables)
    : `Nouveau record pour ${ctx.dogName} ! ${pickRandom(tone.encouragement)}`;

  const safety = checkAIMessageSafety(content);
  return {
    content,
    category: 'record_announcement',
    safetyPassed: safety.passed,
    violations: safety.violations,
  };
}
