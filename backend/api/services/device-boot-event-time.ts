export const UINT32_MODULUS = 0x1_0000_0000;
export const UINT32_HALF_RANGE = 0x8000_0000;

export interface DeviceBootClockAnchor {
  deviceId: string;
  bootSessionId: number;
  anchorDeviceMs: number;
  anchorUtc: Date;
  /**
   * Total clock/transport uncertainty budget supplied by the anchor authority.
   * This resolver preserves it; it does not invent or tighten that bound.
   */
  uncertaintyMs: number;
}

export type BootEventTimeFailureCode =
  | 'INVALID_INPUT'
  | 'DEVICE_MISMATCH'
  | 'BOOT_SESSION_MISMATCH'
  | 'AMBIGUOUS_OR_TOO_OLD';

export type BootEventTimeResolution =
  | {
      ok: true;
      observedAt: Date;
      eventTimeProvenance: {
        strategy: 'BOOT_ANCHOR_V1';
        anchorDeviceMs: number;
        anchorUtc: Date;
        uncertaintyMs: number;
      };
      lookbackMs: number;
    }
  | {
      ok: false;
      error: BootEventTimeFailureCode;
    };

function isUint32(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0 && value <= 0xffff_ffff;
}

function validDate(value: Date): boolean {
  return value instanceof Date && Number.isFinite(value.getTime());
}

/**
 * Resolve a boot-relative feature-window end to UTC using an explicit clock
 * anchor from the same canonical device + boot session.
 *
 * The resolver always interprets the feature as occurring at-or-before the
 * anchor. maxLookbackMs must be strictly below half the uint32 clock range,
 * which prevents wrap direction from becoming mathematically ambiguous.
 *
 * No anchor is created here. No receive-time shortcut is used. Callers must
 * supply a separately governed anchor and its total uncertainty budget.
 */
export function resolveBootRelativeEventTime(input: {
  deviceId: string;
  bootSessionId: number;
  windowEndMs: number;
  anchor: DeviceBootClockAnchor;
  maxLookbackMs: number;
}): BootEventTimeResolution {
  const { deviceId, bootSessionId, windowEndMs, anchor, maxLookbackMs } = input;

  if (
    !deviceId
    || !isUint32(bootSessionId)
    || !isUint32(windowEndMs)
    || !isUint32(anchor.bootSessionId)
    || !isUint32(anchor.anchorDeviceMs)
    || !validDate(anchor.anchorUtc)
    || !Number.isSafeInteger(anchor.uncertaintyMs)
    || anchor.uncertaintyMs < 0
    || !Number.isSafeInteger(maxLookbackMs)
    || maxLookbackMs < 0
    || maxLookbackMs >= UINT32_HALF_RANGE
  ) {
    return { ok: false, error: 'INVALID_INPUT' };
  }

  if (deviceId !== anchor.deviceId) {
    return { ok: false, error: 'DEVICE_MISMATCH' };
  }

  if (bootSessionId !== anchor.bootSessionId) {
    return { ok: false, error: 'BOOT_SESSION_MISMATCH' };
  }

  const lookbackMs =
    (anchor.anchorDeviceMs - windowEndMs + UINT32_MODULUS) % UINT32_MODULUS;

  if (lookbackMs > maxLookbackMs) {
    return { ok: false, error: 'AMBIGUOUS_OR_TOO_OLD' };
  }

  const observedAtMs = anchor.anchorUtc.getTime() - lookbackMs;
  const observedAt = new Date(observedAtMs);
  if (!validDate(observedAt)) {
    return { ok: false, error: 'INVALID_INPUT' };
  }

  return {
    ok: true,
    observedAt,
    eventTimeProvenance: {
      strategy: 'BOOT_ANCHOR_V1',
      anchorDeviceMs: anchor.anchorDeviceMs,
      anchorUtc: new Date(anchor.anchorUtc.getTime()),
      uncertaintyMs: anchor.uncertaintyMs,
    },
    lookbackMs,
  };
}
