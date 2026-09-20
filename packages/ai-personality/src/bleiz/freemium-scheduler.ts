/**
 * Freemium Content Scheduler
 *
 * Runs daily to select 1-2 templates for each free-tier user.
 * No hardware required — uses only breed, age, location, and season data.
 */

import type {
  FreemiumTemplate,
  FreemiumCategory,
  Season,
  SizeClass,
  BreedKnowledge,
  WeatherData,
  SeasonalAlert,
} from '@emopet/shared';

// ─── Types ──────────────────────────────────────────────────────────

export interface FreemiumDogProfile {
  dogId: string;
  dogName: string;
  breedId: string;
  breedNameFr: string;
  sizeClass: SizeClass;
  ageMonths: number;
  location: string;
  region: string;
  furLength?: string;
}

export interface FreemiumHistoryRecord {
  templateId: string;
  sentAt: Date | string;
}

export interface FreemiumSchedulerInput {
  dog: FreemiumDogProfile;
  breed?: BreedKnowledge | null;
  templates: FreemiumTemplate[];
  history: FreemiumHistoryRecord[];
  weather?: WeatherData | null;
  activeAlerts?: SeasonalAlert[];
  now?: Date;
}

export interface ScheduledContent {
  templateId: string;
  channel: string;
  titleFr: string;
  bodyFr: string;
  category: FreemiumCategory;
  priority: number;
  isAlert: boolean;
}

// ─── Constants ──────────────────────────────────────────────────────

const CATEGORY_PRIORITY: Record<FreemiumCategory, number> = {
  health_seasonal: 500,
  health_breed: 480,
  first_aid: 460,
  behavior_education: 400,
  nutrition: 340,
  activity_exercise: 300,
  life_events: 260,
  milestone: 250,
  community: 200,
  fun_fact: 150,
};

const MAX_DAILY_CONTENT = 2;
const PUSH_EARLIEST_HOUR = 8;
const PUSH_LATEST_HOUR = 21;

// ─── Helpers ────────────────────────────────────────────────────────

function getSeason(month: number): Season {
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'autumn';
  return 'winter';
}

function hoursSince(dateStr: Date | string, now: Date): number {
  const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  return (now.getTime() - d.getTime()) / (1000 * 60 * 60);
}

function countInMonth(templateId: string, history: FreemiumHistoryRecord[], now: Date): number {
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  return history.filter((h) => {
    const d = typeof h.sentAt === 'string' ? new Date(h.sentAt) : h.sentAt;
    return h.templateId === templateId && d >= monthStart;
  }).length;
}

// ─── Personalization ────────────────────────────────────────────────

const NEVER_SAY_GLOBAL = [
  'diagnostic', 'diagnostiquer', 'maladie', 'pathologie',
  'traitement', 'medicament', 'prescription', 'symptome',
  'soigner', 'guerir', 'euthanasie', 'mort', 'mourir',
  'agressif', 'dangereux', 'certainement', 'sans aucun doute',
];

function personalize(
  text: string,
  dog: FreemiumDogProfile,
  breed?: BreedKnowledge | null,
): string {
  let result = text;
  result = result.replace(/\{dog_name\}/g, dog.dogName);
  result = result.replace(/\{breed_name\}/g, dog.breedNameFr);
  result = result.replace(/\{fur_length\}/g, breed?.furLength ?? 'moyen');
  result = result.replace(/\{size_class\}/g, dog.sizeClass);
  result = result.replace(/\{location\}/g, dog.location);
  result = result.replace(/\{region\}/g, dog.region);
  return result;
}

function checkNeverSay(text: string, neverSay: string[]): boolean {
  const lower = text.toLowerCase();
  const allBlocked = [...NEVER_SAY_GLOBAL, ...neverSay];
  return allBlocked.every((word) => !lower.includes(word.toLowerCase()));
}

// ─── Template Matching ──────────────────────────────────────────────

function matchesTemplate(
  template: FreemiumTemplate,
  dog: FreemiumDogProfile,
  season: Season,
  month: number,
): boolean {
  // Breed filter
  if (template.breedFilter.length > 0 && !template.breedFilter.includes(dog.breedId)) {
    return false;
  }

  // Size filter
  if (template.sizeFilter.length > 0 && !template.sizeFilter.includes(dog.sizeClass)) {
    return false;
  }

  // Age filter
  if (template.ageMinMonths != null && dog.ageMonths < template.ageMinMonths) {
    return false;
  }
  if (template.ageMaxMonths != null && dog.ageMonths > template.ageMaxMonths) {
    return false;
  }

  // Season filter
  if (template.seasonFilter.length > 0 && !template.seasonFilter.includes(season)) {
    return false;
  }

  // Month filter
  if (template.monthFilter.length > 0 && !template.monthFilter.includes(month)) {
    return false;
  }

  // Region filter
  if (
    template.regionFilter.length > 0 &&
    !template.regionFilter.includes('all') &&
    !template.regionFilter.includes(dog.region)
  ) {
    return false;
  }

  return true;
}

// ─── Scheduler ──────────────────────────────────────────────────────

/**
 * Schedule 1-2 freemium content items for a dog today.
 *
 * Rules:
 * 1. Check current month + season + region
 * 2. Filter templates by breed/size/age/season match
 * 3. Exclude templates sent within cooldown_hours
 * 4. Exclude templates exceeding max_per_month
 * 5. Sort by priority (health > behavior > activity > community)
 * 6. Select top 1-2
 * 7. Personalize: replace {dog_name}, {breed_name}, {fur_length}, etc.
 * 8. Apply never_say check on final text
 * 9. If severe weather alert → override with weather template
 * 10. If milestone date → include milestone template
 * 11. Never send push notifications before 8:00 or after 21:00
 */
export function scheduleFreemiumContent(input: FreemiumSchedulerInput): ScheduledContent[] {
  const now = input.now ?? new Date();
  const month = now.getMonth() + 1; // 1-12
  const season = getSeason(month);
  const hour = now.getHours();

  const results: ScheduledContent[] = [];

  // Step 1: Check for active seasonal alerts (override)
  if (input.activeAlerts && input.activeAlerts.length > 0) {
    const urgentAlerts = input.activeAlerts.filter((a) => a.severity === 'urgent');
    if (urgentAlerts.length > 0) {
      const alert = urgentAlerts[0]!;
      // Check if this alert was already sent recently (72h cooldown)
      const alreadySent = input.history.some(
        (h) => h.templateId === `ALERT_${alert.id}` && hoursSince(h.sentAt, now) < 72,
      );
      if (!alreadySent) {
        results.push({
          templateId: `ALERT_${alert.id}`,
          channel: alert.severity === 'urgent' ? 'push' : 'home_insight',
          titleFr: personalize(alert.titleFr, input.dog, input.breed),
          bodyFr: personalize(alert.bodyFr, input.dog, input.breed),
          category: 'health_seasonal',
          priority: 1000,
          isAlert: true,
        });
      }
    }
  }

  // Step 2: Filter matching templates
  const candidates = input.templates.filter((t) => matchesTemplate(t, input.dog, season, month));

  // Step 3: Exclude by cooldown and max_per_month
  const eligible = candidates.filter((t) => {
    // Check cooldown
    const lastSend = input.history
      .filter((h) => h.templateId === t.id)
      .sort((a, b) => {
        const da = typeof a.sentAt === 'string' ? new Date(a.sentAt) : a.sentAt;
        const db = typeof b.sentAt === 'string' ? new Date(b.sentAt) : b.sentAt;
        return db.getTime() - da.getTime();
      })[0];

    if (lastSend && hoursSince(lastSend.sentAt, now) < t.cooldownHours) {
      return false;
    }

    // Check max_per_month
    if (countInMonth(t.id, input.history, now) >= t.maxPerMonth) {
      return false;
    }

    return true;
  });

  // Step 4: Score and sort
  const scored = eligible.map((t) => {
    const categoryScore = CATEGORY_PRIORITY[t.category] ?? 100;
    const priorityScore = t.priority * 10;
    // Weather bonus: if hot and template is about heat
    let weatherBonus = 0;
    if (input.weather) {
      if (
        input.weather.temperatureC != null &&
        input.weather.temperatureC > 25 &&
        (t.subcategory?.includes('chaleur') || t.subcategory?.includes('heat'))
      ) {
        weatherBonus = 200;
      }
      if (
        input.weather.temperatureC != null &&
        input.weather.temperatureC < 0 &&
        (t.subcategory?.includes('froid') || t.subcategory?.includes('cold'))
      ) {
        weatherBonus = 200;
      }
    }

    return {
      template: t,
      score: categoryScore + priorityScore + weatherBonus,
    };
  });

  scored.sort((a, b) => b.score - a.score);

  // Step 5: Select top items (respect daily limit)
  const slotsRemaining = MAX_DAILY_CONTENT - results.length;
  const selected = scored.slice(0, Math.max(0, slotsRemaining));

  for (const { template } of selected) {
    const title = personalize(template.titleFr, input.dog, input.breed);
    let body = personalize(template.bodyFr, input.dog, input.breed);

    // Append suffix if present
    if (template.suffix) {
      body += '\n\n' + personalize(template.suffix, input.dog, input.breed);
    }

    // Safety check
    if (!checkNeverSay(body, template.neverSay)) {
      continue; // Skip unsafe content
    }

    // Push time restriction
    let channel = template.channel;
    if (channel === 'push' && (hour < PUSH_EARLIEST_HOUR || hour > PUSH_LATEST_HOUR)) {
      channel = 'home_insight';
    }

    results.push({
      templateId: template.id,
      channel,
      titleFr: title,
      bodyFr: body,
      category: template.category,
      priority: template.priority,
      isAlert: false,
    });
  }

  return results;
}

/**
 * Simulate scheduling for N days (for testing).
 * Returns all scheduled content across the period.
 */
export function simulateSchedule(
  input: Omit<FreemiumSchedulerInput, 'now' | 'history'>,
  days: number,
  startDate?: Date,
): { day: number; date: string; content: ScheduledContent[] }[] {
  const start = startDate ?? new Date();
  const history: FreemiumHistoryRecord[] = [];
  const results: { day: number; date: string; content: ScheduledContent[] }[] = [];

  for (let d = 0; d < days; d++) {
    const now = new Date(start);
    now.setDate(now.getDate() + d);
    now.setHours(7, 0, 0, 0); // 7 AM daily run

    const content = scheduleFreemiumContent({
      ...input,
      history: [...history],
      now,
    });

    // Record sent items in history
    for (const item of content) {
      history.push({ templateId: item.templateId, sentAt: now });
    }

    results.push({
      day: d + 1,
      date: now.toISOString().split('T')[0]!,
      content,
    });
  }

  return results;
}
