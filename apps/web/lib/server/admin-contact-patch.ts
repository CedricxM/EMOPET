import type { ContactStatus, TimeSlot } from '../contact';

export interface AdminContactPatchInput {
  status?: ContactStatus;
  scheduledSlot?: TimeSlot;
  teamNotes?: string;
}

const VALID_STATUS = new Set<ContactStatus>([
  'pending',
  'scheduled',
  'completed',
  'cancelled',
]);
const MAX_SLOT_TIMESTAMP_LENGTH = 64;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isBoundedString(value: unknown, maxLength: number): value is string {
  return typeof value === 'string' && value.length <= maxLength;
}

function parseScheduledSlot(value: unknown): TimeSlot | null {
  if (!isRecord(value)) return null;
  if (!isBoundedString(value.start, MAX_SLOT_TIMESTAMP_LENGTH)) return null;
  if (!isBoundedString(value.end, MAX_SLOT_TIMESTAMP_LENGTH)) return null;
  return { start: value.start, end: value.end };
}

/**
 * Parse one untrusted privileged contact PATCH body into the finite fields that
 * the route is allowed to persist. Unknown fields are discarded; malformed
 * known fields fail closed instead of reaching the store patch.
 */
export function parseAdminContactPatch(value: unknown): AdminContactPatchInput | null {
  if (!isRecord(value)) return null;

  const result: AdminContactPatchInput = {};

  if (value.status !== undefined) {
    if (typeof value.status !== 'string' || !VALID_STATUS.has(value.status as ContactStatus)) {
      return null;
    }
    result.status = value.status as ContactStatus;
  }

  if (value.scheduledSlot !== undefined) {
    const scheduledSlot = parseScheduledSlot(value.scheduledSlot);
    if (!scheduledSlot) return null;
    result.scheduledSlot = scheduledSlot;
  }

  if (value.teamNotes !== undefined) {
    if (typeof value.teamNotes !== 'string') return null;
    result.teamNotes = value.teamNotes;
  }

  return result;
}
