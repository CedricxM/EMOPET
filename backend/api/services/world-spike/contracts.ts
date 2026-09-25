/** SPIKE / NOT PRODUCTION AUTHORITY. Only synthetic social transport data. */
export type WorldCommand =
  | { op: 'friends.list' }
  | { op: 'friends.request' | 'friends.accept'; targetUserId: string }
  | { op: 'groups.create'; name: string }
  | { op: 'groups.list' }
  | { op: 'groups.join' | 'groups.leave' | 'chat.join'; groupId: string }
  | { op: 'presence.follow'; targetUserId: string }
  | { op: 'presence.update'; status: 'online' | 'away' }
  | { op: 'chat.send'; groupId: string; text: string };

export interface WorldConnection {
  userId: string;
  expiresAt: number;
  execute(command: WorldCommand, targetNakamaId?: string): Promise<unknown>;
  close(): void;
}
export interface WorldTransport {
  connect(customId: string, signal: AbortSignal, event: (event: unknown) => void,
    disconnected: () => void): Promise<WorldConnection>;
}
export class WorldError extends Error {
  constructor(public code: 'unavailable' | 'timeout' | 'invalid_session' | 'forbidden' | 'busy' | 'invalid_request') {
    super(code);
  }
}
