import { and, eq, sql } from 'drizzle-orm';
import { ActivityVariabilityFeatureObservationCreateSchema } from '@emopet/shared';

import { db } from '../../db/index.js';
import {
  devices,
  dogs,
  sensorFeatureObservations,
} from '../../db/schema/index.js';

export type ActivityFeatureIngestionFailure =
  | { ok: false; error: 'INVALID_FEATURE_ENVELOPE'; issues: string[] }
  | { ok: false; error: 'OWNER_OR_DOG_NOT_FOUND' }
  | { ok: false; error: 'DEVICE_BINDING_INVALID' }
  | { ok: false; error: 'INGESTION_CONFLICT' }
  | { ok: false; error: 'DATABASE_UNAVAILABLE'; retryable: true };

export type ActivityFeatureIngestionSuccess = {
  ok: true;
  status: 'CREATED' | 'IDEMPOTENT_REPLAY';
  observation: typeof sensorFeatureObservations.$inferSelect;
};

export type ActivityFeatureIngestionResult =
  | ActivityFeatureIngestionFailure
  | ActivityFeatureIngestionSuccess;

function fingerprint(row: {
  dogId: string;
  ingestionId: string;
  deviceId: string;
  observedAt: Date;
  source: string;
  featureKey: string;
  value: number | null;
  observationStatus: string;
  nullReason: string | null;
  featureContractVersion: string;
  windowSeconds: number;
  validSeconds: number;
  firmwareVersionAtIngest: string | null;
}): string {
  return JSON.stringify({
    dogId: row.dogId,
    ingestionId: row.ingestionId,
    deviceId: row.deviceId,
    observedAt: row.observedAt.toISOString(),
    source: row.source,
    featureKey: row.featureKey,
    value: row.value,
    observationStatus: row.observationStatus,
    nullReason: row.nullReason,
    featureContractVersion: row.featureContractVersion,
    windowSeconds: row.windowSeconds,
    validSeconds: row.validSeconds,
    firmwareVersionAtIngest: row.firmwareVersionAtIngest,
  });
}

/**
 * Canonical backend persistence primitive for #122's first deterministic feature.
 *
 * The caller must supply a canonical authenticated Owner id. No public route
 * imports this service yet. The current BLE V1 frame does not carry
 * activity_variability, so network/runtime activation remains forbidden.
 *
 * This service validates only the physical/preprocessed feature contract and
 * provenance/binding. It does not invoke ELI, derive arousal, publish an Owner
 * observation, or claim physical-device authentication (#66 remains separate).
 */
export async function persistActivityVariabilityFeatureObservation(
  ownerId: string,
  rawInput: unknown,
): Promise<ActivityFeatureIngestionResult> {
  const parsed = ActivityVariabilityFeatureObservationCreateSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: 'INVALID_FEATURE_ENVELOPE',
      issues: parsed.error.issues.map((issue) =>
        `${issue.path.join('.') || '<root>'}: ${issue.message}`
      ),
    };
  }

  const input = parsed.data;

  try {
    return await db.transaction(async (tx) => {
      await tx.execute(sql`SET LOCAL lock_timeout = '5s'`);
      await tx.execute(sql`SET LOCAL statement_timeout = '10s'`);

      const [dog] = await tx
        .select({ ownerId: dogs.ownerId })
        .from(dogs)
        .where(eq(dogs.id, input.dogId))
        .for('share')
        .limit(1);

      if (!dog || dog.ownerId !== ownerId) {
        return { ok: false, error: 'OWNER_OR_DOG_NOT_FOUND' } as const;
      }

      const [device] = await tx
        .select({
          id: devices.id,
          firmwareVersion: devices.firmwareVersion,
        })
        .from(devices)
        .where(and(
          eq(devices.id, input.deviceId),
          eq(devices.dogId, input.dogId),
          eq(devices.type, 'TAG'),
        ))
        .for('share')
        .limit(1);

      if (!device) {
        return { ok: false, error: 'DEVICE_BINDING_INVALID' } as const;
      }

      const values = {
        dogId: input.dogId,
        ingestionId: input.ingestionId,
        deviceId: device.id,
        observedAt: input.observedAt,
        source: input.source,
        featureKey: input.featureKey,
        value: input.value,
        observationStatus: input.observationStatus,
        nullReason: input.nullReason,
        featureContractVersion: input.featureContractVersion,
        windowSeconds: input.windowSeconds,
        validSeconds: input.validSeconds,
        firmwareVersionAtIngest: device.firmwareVersion,
      };

      const [created] = await tx
        .insert(sensorFeatureObservations)
        .values(values)
        .onConflictDoNothing({ target: sensorFeatureObservations.ingestionId })
        .returning();

      if (created) {
        return {
          ok: true,
          status: 'CREATED',
          observation: created,
        } as const;
      }

      const [existing] = await tx
        .select()
        .from(sensorFeatureObservations)
        .where(eq(sensorFeatureObservations.ingestionId, input.ingestionId))
        .limit(1);

      if (!existing || fingerprint(existing) !== fingerprint({
        ...values,
        firmwareVersionAtIngest: device.firmwareVersion ?? null,
      })) {
        return { ok: false, error: 'INGESTION_CONFLICT' } as const;
      }

      return {
        ok: true,
        status: 'IDEMPOTENT_REPLAY',
        observation: existing,
      } as const;
    });
  } catch {
    return {
      ok: false,
      error: 'DATABASE_UNAVAILABLE',
      retryable: true,
    };
  }
}
