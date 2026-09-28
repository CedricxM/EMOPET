import {
  ActivityVariabilityFeatureTransportFrameSchema,
  type ActivityVariabilityFeatureObservation,
  type ActivityVariabilityFeatureTransportFrame,
} from '@emopet/shared';

import {
  type DeviceBootClockAnchor,
  resolveBootRelativeEventTime,
} from './device-boot-event-time.js';
import {
  persistActivityVariabilityFeatureObservation,
  type ActivityFeatureIngestionResult,
} from './activity-variability-feature-ingestion.js';

export type ActivityFeatureTransportAdapterFailure =
  | { ok: false; error: 'INVALID_TRANSPORT_FRAME'; issues: string[] }
  | { ok: false; error: 'EVENT_TIME_UNRESOLVED'; reason: string };

export type ActivityFeatureTransportEnvelopeResult =
  | {
      ok: true;
      envelope: ActivityVariabilityFeatureObservation;
    }
  | ActivityFeatureTransportAdapterFailure;

export type ActivityFeatureTransportIngestResult =
  | ActivityFeatureIngestionResult
  | ActivityFeatureTransportAdapterFailure;

/**
 * Convert one already-delivered feature-summary frame into the canonical backend
 * persistence envelope.
 *
 * This is deliberately not a BLE subscription, network route, clock-anchor
 * producer or device-authentication boundary. deviceId is a canonical registry
 * identity supplied by the caller; #66 still owns physical-device trust.
 */
export function buildActivityVariabilityEnvelopeFromTransport(input: {
  dogId: string;
  deviceId: string;
  frame: ActivityVariabilityFeatureTransportFrame;
  clockAnchor: DeviceBootClockAnchor;
  maxLookbackMs: number;
}): ActivityFeatureTransportEnvelopeResult {
  const parsed = ActivityVariabilityFeatureTransportFrameSchema.safeParse(input.frame);

  if (!parsed.success) {
    return {
      ok: false,
      error: 'INVALID_TRANSPORT_FRAME',
      issues: parsed.error.issues.map((issue) =>
        `${issue.path.join('.') || '<root>'}: ${issue.message}`
      ),
    };
  }

  const frame = parsed.data;
  const resolved = resolveBootRelativeEventTime({
    deviceId: input.deviceId,
    bootSessionId: frame.bootSessionId,
    windowEndMs: frame.windowEndMs,
    anchor: input.clockAnchor,
    maxLookbackMs: input.maxLookbackMs,
  });

  if (!resolved.ok) {
    return {
      ok: false,
      error: 'EVENT_TIME_UNRESOLVED',
      reason: resolved.error,
    };
  }

  return {
    ok: true,
    envelope: {
      dogId: input.dogId,
      deviceId: input.deviceId,
      observedAt: resolved.observedAt,
      source: frame.source,
      featureKey: frame.featureKey,
      value: frame.value,
      observationStatus: frame.observationStatus,
      nullReason: frame.nullReason,
      featureContractVersion: frame.featureContractVersion,
      windowSeconds: frame.windowSeconds,
      validSeconds: frame.validSeconds,
      qualityState: frame.qualityState,
      transportProvenance: {
        transportVersion: frame.transportVersion,
        bootSessionId: frame.bootSessionId,
        sequence: frame.sequence,
        windowEndMs: frame.windowEndMs,
      },
      eventTimeProvenance: resolved.eventTimeProvenance,
    },
  };
}

/**
 * Internal-only orchestration for a validated feature frame.
 *
 * No route imports this function. It does not invoke ELI and it does not turn
 * protocol/parser acceptance into cryptographic device trust.
 */
export async function ingestActivityVariabilityTransportFrame(input: {
  ownerId: string;
  dogId: string;
  deviceId: string;
  frame: ActivityVariabilityFeatureTransportFrame;
  clockAnchor: DeviceBootClockAnchor;
  maxLookbackMs: number;
}): Promise<ActivityFeatureTransportIngestResult> {
  const built = buildActivityVariabilityEnvelopeFromTransport(input);
  if (!built.ok) return built;

  return persistActivityVariabilityFeatureObservation(
    input.ownerId,
    built.envelope,
  );
}
