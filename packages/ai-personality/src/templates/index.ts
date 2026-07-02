/**
 * Message templates for Bleiz AI personality.
 *
 * Templates use {{variable}} placeholders that are replaced at generation time.
 * Each template category maps to an AIMessageCategory from @emopet/shared.
 *
 * CRITICAL RULES (enforced by safety filter):
 * - NEVER say "your dog is stressed"
 * - NEVER show raw numbers alone — always contextualize
 * - NEVER claim certainty — hedging language only
 * - NEVER give medical advice
 * - ALWAYS personalize (dog name, specific behaviors)
 * - ALWAYS be kind
 */

import type { AIMessageCategory } from '@emopet/shared';

export interface MessageTemplate {
  category: AIMessageCategory;
  template: string;
  /** Minimum data requirements for this template. */
  requires: string[];
}

export const TEMPLATES: MessageTemplate[] = [
  // ── Morning Greeting ────────────────────────────────────────
  {
    category: 'morning_greeting',
    template: '{{hedge}} {{dogName}} a passe une {{nightQuality}} nuit. {{detail}} {{encouragement}}',
    requires: ['dogName', 'nightQuality'],
  },
  {
    category: 'morning_greeting',
    template: 'Bonjour ! {{hedge}} {{dogName}} est {{morningState}} ce matin. {{detail}}',
    requires: ['dogName', 'morningState'],
  },

  // ── Daily Insight ───────────────────────────────────────────
  {
    category: 'daily_insight',
    template: '{{hedge}} {{dogName}} a ete {{activityComparison}} aujourd\'hui par rapport a d\'habitude. {{detail}}',
    requires: ['dogName', 'activityComparison'],
  },
  {
    category: 'daily_insight',
    template: 'Aujourd\'hui, {{dogName}} a passe {{matTime}} sur le tapis, {{matComparison}}. {{detail}}',
    requires: ['dogName', 'matTime', 'matComparison'],
  },

  // ── Weekly Pattern ──────────────────────────────────────────
  {
    category: 'weekly_pattern',
    template: 'Cette semaine, {{hedge}} {{dogName}} {{weeklyTrend}}. {{detail}} {{encouragement}}',
    requires: ['dogName', 'weeklyTrend'],
  },

  // ── Record Announcement ─────────────────────────────────────
  {
    category: 'record_announcement',
    template: 'Nouveau record ! {{dogName}} {{recordDescription}}. {{previousComparison}} {{encouragement}}',
    requires: ['dogName', 'recordDescription'],
  },

  // ── Community Question ──────────────────────────────────────
  {
    category: 'community_question',
    template: '{{dogName}} {{observation}}. Est-ce que d\'autres membres de {{communityName}} observent la meme chose ?',
    requires: ['dogName', 'observation', 'communityName'],
  },

  // ── Community Challenge ─────────────────────────────────────
  {
    category: 'community_challenge',
    template: 'Defi de la semaine dans {{communityName}} : {{challengeDescription}}. {{dogName}} est pret(e) ?',
    requires: ['dogName', 'communityName', 'challengeDescription'],
  },

  // ── Copresence Suggestion ───────────────────────────────────
  {
    category: 'copresence_suggestion',
    template: '{{dogName}} et {{otherDogName}} se sont croises {{meetCount}} fois recemment. Peut-etre une belle amitie en devenir ?',
    requires: ['dogName', 'otherDogName', 'meetCount'],
  },

  // ── Memory Narrative ────────────────────────────────────────
  {
    category: 'memory_narrative',
    template: 'Il y a {{timeAgo}}, {{dogName}} {{pastEvent}}. Depuis, {{evolution}}.',
    requires: ['dogName', 'timeAgo', 'pastEvent', 'evolution'],
  },

  // ── Deuil Response ──────────────────────────────────────────
  {
    category: 'deuil_response',
    template: '{{dogName}} nous manque. Les moments partages restent precieux. Prenez soin de vous.',
    requires: ['dogName'],
  },
];

/**
 * Get all templates for a given category.
 */
export function getTemplates(category: AIMessageCategory): MessageTemplate[] {
  return TEMPLATES.filter((t) => t.category === category);
}

/**
 * Fill a template string with variables.
 */
export function fillTemplate(
  template: string,
  variables: Record<string, string>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
    return variables[key] ?? match;
  });
}
