import { randomUUID } from 'node:crypto';

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
  transportVersion: number | null;
  transportBootSessionId: number | null;
  transportSequence: number | null;
  transportWindowEndMs: number | null;
  eventTimeResolution: string | null;
  clockAnchorDeviceMs: number | null;
  clockAnchorUtc: Date | null;
  eventTimeUncertaintyMs: number | null;
}): string {
  return JSON.stringify({
    dogId: row.dogId,
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
    transportVersion: row.transportVersion,
    transportBootSessionId: row.transportBootSessionId,
    transportSequence: row.transportSequence,
    transportWindowEndMs: row.transportWindowEndMs,
    eventTimeResolution: row.eventTimeResolution,
    clockAnchorDeviceMs: row.clockAnchorDeviceMs,
    clockAnchorUtc: row.clockAnchorUtc?.toISOString() ?? null,
    eventTimeUncertaintyMs: row.eventTimeUncertaintyMs,
  });
}

/**
 * Canonical backend persistence primitive for #122's first deterministic feature.
 *
 * The caller must supply a canonical authenticated Owner id. No public route
 * imports this service yet.
 *
 * Two replay identities are supported:
 * - application ingestionId, when an upstream application already owns one;
 * - the native transport tuple (deviceId, featureKey, bootSessionId, sequence).
 *
 * The backend allocates an application ingestion UUID for a first transport-only
 * persistence. Replays of the same transport tuple return that original row.
 * If application and transport identities point at different rows, ingestion
 * fails closed as an explicit conflict.
 *
 * Transport provenance is replay evidence only. It does not authenticate a
 * physical device (#66), map device boot time to wall/event time, invoke ELI,
 * derive arousal, or authorize Owner-facing publication.
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
  const transport = input.transportProvenance ?? null;
  const eventTime = input.eventTimeProvenance ?? null;

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
        ingestionId: input.ingestionId ?? randomUUID(),
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
        transportVersion: transport?.transportVersion ?? null,
        transportBootSessionId: transport?.bootSessionId ?? null,
        transportSequence: transport?.sequence ?? null,
        transportWindowEndMs: transport?.windowEndMs ?? null,
        eventTimeResolution: eventTime?.strategy ?? null,
        clockAnchorDeviceMs: eventTime?.anchorDeviceMs ?? null,
        clockAnchorUtc: eventTime?.anchorUtc ?? null,
        eventTimeUncertaintyMs: eventTime?.uncertaintyMs ?? null,
      };

      const [created] = await tx
        .insert(sensorFeatureObservations)
        .values(values)
        .onConflictDoNothing()
        .returning();

      if (created) {
        return {
          ok: true,
          status: 'CREATED',
          observation: created,
        } as const;
      }

      const [existingByIngestion] = input.ingestionId
        ? await tx
            .select()
            .from(sensorFeatureObservations)
            .where(eq(sensorFeatureObservations.ingestionId, input.ingestionId))
            .limit(1)
        : [];

      const [existingByTransport] = transport
        ? await tx
            .select()
            .from(sensorFeatureObservations)
            .where(and(
              eq(sensorFeatureObservations.deviceId, device.id),
              eq(sensorFeatureObservations.featureKey, input.featureKey),
              eq(sensorFeatureObservations.transportBootSessionId, transport.bootSessionId),
              eq(sensorFeatureObservations.transportSequence, transport.sequence),
            ))
            .limit(1)
        : [];

      if (
        existingByIngestion
        && existingByTransport
        && existingByIngestion.id !== existingByTransport.id
      ) {
        return { ok: false, error: 'INGESTION_CONFLICT' } as const;
      }

      const existing = existingByTransport ?? existingByIngestion;
      if (!existing) {
        return { ok: false, error: 'INGESTION_CONFLICT' } as const;
      }

      if (input.ingestionId && existing.ingestionId !== input.ingestionId) {
        return { ok: false, error: 'INGESTION_CONFLICT' } as const;
      }

      if (fingerprint(existing) !== fingerprint({
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
