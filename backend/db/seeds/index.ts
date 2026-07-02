/**
 * Master Seed Script — Freemium App Data Foundation
 *
 * Seeds all freemium data: breed knowledge, templates, directory, alerts.
 * Run with: npx tsx db/seeds/index.ts
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../schema/index.js';

// Seed data imports
import { BREED_KNOWLEDGE_PART1 } from './breed-knowledge-part1.js';
import { BREED_KNOWLEDGE_PART2 } from './breed-knowledge-part2.js';
import { HEALTH_SEASONAL_TEMPLATES } from './freemium-templates-health-seasonal.js';
import { BEHAVIOR_EDUCATION_TEMPLATES } from './freemium-templates-behavior.js';
import { NUTRITION_TEMPLATES } from './freemium-templates-nutrition.js';
import { ACTIVITY_EXERCISE_TEMPLATES } from './freemium-templates-activity.js';
import { FIRST_AID_TEMPLATES } from './freemium-templates-first-aid.js';
import { LIFE_EVENTS_TEMPLATES } from './freemium-templates-life-events.js';
import { MILESTONE_TEMPLATES } from './freemium-templates-milestone.js';
import { COMMUNITY_TEMPLATES, FUN_FACT_TEMPLATES } from './freemium-templates-community-fun.js';
import { LORIENT_DIRECTORY } from './local-directory-lorient.js';
import { SEASONAL_ALERTS_BRETAGNE } from './seasonal-alerts-bretagne.js';

const connectionString = process.env['DATABASE_URL'] ?? 'postgres://localhost:5432/emopet';
const client = postgres(connectionString);
const db = drizzle(client, { schema });

async function seed() {
  console.log('Seeding freemium data...\n');

  // 1. Breed Knowledge
  const allBreeds = [...BREED_KNOWLEDGE_PART1, ...BREED_KNOWLEDGE_PART2];
  console.log(`Seeding ${allBreeds.length} breed knowledge entries...`);
  for (const breed of allBreeds) {
    await db.insert(schema.breedKnowledge).values(breed).onConflictDoNothing();
  }
  console.log(`  Done: ${allBreeds.length} breeds`);

  // 2. Freemium Templates
  const allTemplates = [
    ...HEALTH_SEASONAL_TEMPLATES,
    ...BEHAVIOR_EDUCATION_TEMPLATES,
    ...NUTRITION_TEMPLATES,
    ...ACTIVITY_EXERCISE_TEMPLATES,
    ...FIRST_AID_TEMPLATES,
    ...LIFE_EVENTS_TEMPLATES,
    ...MILESTONE_TEMPLATES,
    ...COMMUNITY_TEMPLATES,
    ...FUN_FACT_TEMPLATES,
  ];
  console.log(`Seeding ${allTemplates.length} freemium templates...`);
  for (const template of allTemplates) {
    await db.insert(schema.bleizFreemiumTemplates).values(template).onConflictDoNothing();
  }
  console.log(`  Done: ${allTemplates.length} templates`);
  console.log(`  Breakdown:`);
  console.log(`    health_seasonal: ${HEALTH_SEASONAL_TEMPLATES.length}`);
  console.log(`    behavior_education: ${BEHAVIOR_EDUCATION_TEMPLATES.length}`);
  console.log(`    nutrition: ${NUTRITION_TEMPLATES.length}`);
  console.log(`    activity_exercise: ${ACTIVITY_EXERCISE_TEMPLATES.length}`);
  console.log(`    first_aid: ${FIRST_AID_TEMPLATES.length}`);
  console.log(`    life_events: ${LIFE_EVENTS_TEMPLATES.length}`);
  console.log(`    milestone: ${MILESTONE_TEMPLATES.length}`);
  console.log(`    community: ${COMMUNITY_TEMPLATES.length}`);
  console.log(`    fun_fact: ${FUN_FACT_TEMPLATES.length}`);

  // 3. Local Directory
  console.log(`\nSeeding ${LORIENT_DIRECTORY.length} directory entries...`);
  for (const entry of LORIENT_DIRECTORY) {
    await db.insert(schema.localDirectory).values(entry).onConflictDoNothing();
  }
  console.log(`  Done: ${LORIENT_DIRECTORY.length} entries`);

  // 4. Seasonal Alerts
  console.log(`\nSeeding ${SEASONAL_ALERTS_BRETAGNE.length} seasonal alerts...`);
  for (const alert of SEASONAL_ALERTS_BRETAGNE) {
    await db.insert(schema.seasonalAlerts).values(alert).onConflictDoNothing();
  }
  console.log(`  Done: ${SEASONAL_ALERTS_BRETAGNE.length} alerts`);

  // Summary
  console.log('\n════════════════════════════════════════════');
  console.log('Freemium seed complete:');
  console.log(`  Breeds:    ${allBreeds.length}`);
  console.log(`  Templates: ${allTemplates.length}`);
  console.log(`  Directory: ${LORIENT_DIRECTORY.length}`);
  console.log(`  Alerts:    ${SEASONAL_ALERTS_BRETAGNE.length}`);
  console.log('════════════════════════════════════════════\n');

  await client.end();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
