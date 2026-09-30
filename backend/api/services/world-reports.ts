import { db, type Database } from '../../db/index.js';
import { communityReports } from '../../db/schema/index.js';
import { isCanonicalUserId } from './auth-security.js';

/**
 * World report intake (WORLD-SOCIAL-01 / #594) into the canonical moderation queue.
 *
 * Reports are canonical EMOPET moderation evidence: they reuse `community_reports`, so the
 * moderation-evidence retention clock and the approved reporter DETACH (#446) apply. The
 * reported person is `subject_user_id`, detached on that account's erasure (founder decision
 * #594, like reporter D4). World message content is never persisted (decision #48 L6); a
 * message report keeps only the message id and the resolved sender. The sink always writes a
 * subject; only a later erasure can leave it NULL.
 */
export const WORLD_REPORT_REASONS = ['spam', 'harassment', 'illegal', 'unsafe', 'other'] as const;
export type WorldReportReason = (typeof WORLD_REPORT_REASONS)[number];
export type WorldReportKind = 'world_user' | 'world_message';

export interface WorldReportInput {
  reporterUserId: string;
  subjectUserId: string;
  kind: WorldReportKind;
  messageId?: string;
  reason: WorldReportReason;
  details?: string;
}

export interface WorldReportRecord {
  id: string;
  kind: WorldReportKind;
  status: string;
  createdAt: Date;
}

export interface WorldReportSink {
  create(input: WorldReportInput): Promise<WorldReportRecord>;
}

export class WorldReportError extends Error {
  constructor(public code: 'invalid_report' | 'subject_not_found') { super(code); }
}

const MAX_DETAILS = 500;

/** Validates and normalises a report; the reporter always comes from the verified actor. */
export function normaliseWorldReport(input: WorldReportInput): WorldReportInput {
  const reporterUserId = String(input.reporterUserId).toLowerCase();
  const subjectUserId = String(input.subjectUserId).toLowerCase();
  if (!isCanonicalUserId(reporterUserId) || !isCanonicalUserId(subjectUserId) || reporterUserId === subjectUserId) {
    throw new WorldReportError('invalid_report');
  }
  if (!WORLD_REPORT_REASONS.includes(input.reason)) throw new WorldReportError('invalid_report');
  if (input.kind === 'world_message') {
    if (!isCanonicalUserId(input.messageId)) throw new WorldReportError('invalid_report');
  } else if (input.kind !== 'world_user' || input.messageId !== undefined) {
    throw new WorldReportError('invalid_report');
  }
  const details = input.details?.trim();
  if (details !== undefined && details.length > MAX_DETAILS) throw new WorldReportError('invalid_report');
  return {
    reporterUserId, subjectUserId, kind: input.kind, reason: input.reason,
    ...(input.kind === 'world_message' ? { messageId: String(input.messageId).toLowerCase() } : {}),
    ...(details ? { details } : {}),
  };
}

const FOREIGN_KEY_VIOLATION = '23503';

function isForeignKeyViolation(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; depth < 3 && current && typeof current === 'object'; depth++) {
    if ((current as { code?: unknown }).code === FOREIGN_KEY_VIOLATION) return true;
    current = (current as { cause?: unknown }).cause;
  }
  return false;
}

export function drizzleWorldReportSink(database: Database = db): WorldReportSink {
  return {
    async create(raw) {
      const input = normaliseWorldReport(raw);
      try {
        const [row] = await database.insert(communityReports).values({
          reporterUserId: input.reporterUserId,
          subjectUserId: input.subjectUserId,
          contentType: input.kind,
          contentId: input.kind === 'world_message' ? input.messageId! : null,
          communityId: null,
          reason: input.reason,
          details: input.details,
        }).returning({ id: communityReports.id, status: communityReports.status, createdAt: communityReports.createdAt });
        if (!row) throw new Error('report insert returned no row');
        return { id: row.id, kind: input.kind, status: row.status, createdAt: row.createdAt };
      } catch (error) {
        if (isForeignKeyViolation(error)) throw new WorldReportError('subject_not_found');
        throw error;
      }
    },
  };
}
