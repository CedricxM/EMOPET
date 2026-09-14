/**
 * Master Seed Script — controlled freemium/data foundation.
 *
 * Legacy content and local-directory datasets are no longer seeded implicitly.
 * Explicit development-only gates are required for historical/demo data paths.
 *
 * Run with: npx tsx db/seeds/index.ts
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../schema/index.js';

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
import {
  getSanitizedDemoLocalDirectorySeed,
  isDemoLocalDirectorySeedAllowed,
  LOCAL_DIRECTORY_SEED_AUTHORITY,
} from './local-directory-policy.js';
import { SEASONAL_ALERTS_BRETAGNE } from './seasonal-alerts-bretagne.js';

const connectionString = process.env['DATABASE_URL'] ?? 'postgres://localhost:5432/emopet';
const client = postgres(connectionString);
const db = drizzle(client, { schema });

const legacyFreemiumSeedRequested =
  process.env['EMOPET_ALLOW_LEGACY_FREEMIUM_TEMPLATE_SEED'] === '1';
const allowLegacyFreemiumTemplates =
  process.env['NODE_ENV'] !== 'production' && legacyFreemiumSeedRequested;

if (process.env['NODE_ENV'] === 'production' && legacyFreemiumSeedRequested) {
  console.error(
    'LEGACY FREEMIUM TEMPLATE SEED REFUSED — historical migration/dev corpus cannot be loaded in production.',
  );
  process.exit(1);
}

async function seed() {
  console.log('Seeding controlled EMOPET data...\n');

  // 1. Breed Knowledge
  const allBreeds = [...BREED_KNOWLEDGE_PART1, ...BREED_KNOWLEDGE_PART2];
  console.log(`Seeding ${allBreeds.length} breed knowledge entries...`);
  for (const breed of allBreeds) {
    await db.insert(schema.breedKnowledge).values(breed).onConflictDoNothing();
  }
  console.log(`  Done: ${allBreeds.length} breeds`);

  // 2. Historical freemium templates
  // These pre-date the canonical Breiz release authority and are quarantined by
  // default under #235. They may be loaded only for explicit non-production
  // migration/regression work and are never release content authority.
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

  if (allowLegacyFreemiumTemplates) {
    console.warn('LEGACY FREEMIUM TEMPLATE SEED ENABLED — non-production migration/regression authority only.');
    console.log(`Seeding ${allTemplates.length} historical freemium templates...`);
    for (const template of allTemplates) {
      await db.insert(schema.bleizFreemiumTemplates).values(template).onConflictDoNothing();
    }
    console.log(`  Done: ${allTemplates.length} legacy templates`);
  } else {
    console.log('Skipping legacy freemium templates (canonical Breiz release authority required).');
  }

  // 3. Local Directory
  // #116: historical Lorient seed has incomplete row-level provenance and
  // unsupported rating/verification claims. It is not seeded by default.
  const allowDemoDirectory = isDemoLocalDirectorySeedAllowed();
  const demoDirectory = allowDemoDirectory ? getSanitizedDemoLocalDirectorySeed() : [];

  if (allowDemoDirectory) {
    console.warn(`LOCAL DIRECTORY SEED ENABLED AS ${LOCAL_DIRECTORY_SEED_AUTHORITY}.`);
    console.log(`Seeding ${demoDirectory.length} sanitized demo directory entries...`);
    for (const entry of demoDirectory) {
      await db.insert(schema.localDirectory).values(entry).onConflictDoNothing();
    }
    console.log(`  Done: ${demoDirectory.length} unverified demo entries`);
  } else {
    console.log('Skipping local directory seed (#116 rights/provenance gate remains HOLD).');
  }

  // 4. Seasonal Alerts
  console.log(`\nSeeding ${SEASONAL_ALERTS_BRETAGNE.length} seasonal alerts...`);
  for (const alert of SEASONAL_ALERTS_BRETAGNE) {
    await db.insert(schema.seasonalAlerts).values(alert).onConflictDoNothing();
  }
  console.log(`  Done: ${SEASONAL_ALERTS_BRETAGNE.length} alerts`);

  console.log('\n════════════════════════════════════════════');
  console.log('Controlled seed complete:');
  console.log(`  Breeds:                    ${allBreeds.length}`);
  console.log(`  Legacy templates seeded:   ${allowLegacyFreemiumTemplates ? allTemplates.length : 0}`);
  console.log(`  Demo directory seeded:     ${allowDemoDirectory ? demoDirectory.length : 0}`);
  console.log(`  Alerts:                    ${SEASONAL_ALERTS_BRETAGNE.length}`);
  console.log('════════════════════════════════════════════\n');

  await client.end();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
