export type AdminPostAction = 'hide' | 'unhide' | 'dismiss';

export interface AdminPostPatchInput {
  action: AdminPostAction;
}

const VALID_ACTIONS = new Set<AdminPostAction>(['hide', 'unhide', 'dismiss']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Parse one untrusted privileged post-moderation PATCH body into the single
 * finite action the route may apply. Unknown fields are discarded; malformed,
 * missing or unsupported action values fail closed before store mutation.
 */
export function parseAdminPostPatch(value: unknown): AdminPostPatchInput | null {
  if (!isRecord(value)) return null;
  if (typeof value.action !== 'string') return null;
  if (!VALID_ACTIONS.has(value.action as AdminPostAction)) return null;
  return { action: value.action as AdminPostAction };
}
