import { readLimitedJson } from './request-security';

export const MAX_ADMIN_POST_PATCH_BYTES = 8 * 1024;
export const ADMIN_POST_ACTIONS = ['hide', 'unhide', 'dismiss'] as const;
export type AdminPostAction = (typeof ADMIN_POST_ACTIONS)[number];

const ACTION_SET = new Set<AdminPostAction>(ADMIN_POST_ACTIONS);

export type AdminPostPatchParseResult =
  | { ok: true; action: AdminPostAction }
  | { ok: false; status: 400 | 413 };

export async function parseAdminPostPatchRequest(req: Request): Promise<AdminPostPatchParseResult> {
  const parsed = await readLimitedJson<unknown>(req, MAX_ADMIN_POST_PATCH_BYTES);
  if (!parsed.ok) return { ok: false, status: parsed.status };

  const body = parsed.data;
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, status: 400 };
  }

  const action = (body as Record<string, unknown>)['action'];
  if (typeof action !== 'string' || !ACTION_SET.has(action as AdminPostAction)) {
    return { ok: false, status: 400 };
  }

  return { ok: true, action: action as AdminPostAction };
}

export function adminPostMutationForAction(action: AdminPostAction): {
  isHidden: boolean;
  flagCount?: number;
} {
  if (action === 'hide') return { isHidden: true };
  if (action === 'unhide') return { isHidden: false };
  return { isHidden: false, flagCount: 0 };
}
