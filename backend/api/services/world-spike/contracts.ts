/** SPIKE / NOT PRODUCTION AUTHORITY. Only synthetic social transport data. */

/**
 * Quiet Social Layer first-slice presets (#46 WP-02), the only World expression in the first
 * test (decision #48 L4, #596). Clients render the label; the transport carries only the id.
 */
export const WORLD_PRESETS = {
  'salut': 'Salut',
  'par-ici': 'Par ici',
  'trouve': 'J’ai trouvé quelque chose',
  'pret': 'Prêt·e',
  'attends': 'Attends',
  'bien-joue': 'Bien joué',
  'merci': 'Merci',
  'je-quitte': 'Je quitte',
  'pas-maintenant': 'Pas maintenant',
} as const;
export type WorldPresetId = keyof typeof WORLD_PRESETS;

export type WorldCommand =
  /** Served from canonical connections (#595); World writes no Nakama friend edge. */
  | { op: 'friends.list' }
  | { op: 'groups.create'; name: string }
  | { op: 'groups.list' }
  | { op: 'groups.join' | 'groups.leave' | 'chat.join'; groupId: string }
  | { op: 'presence.follow'; targetUserId: string }
  | { op: 'presence.update'; status: 'online' | 'away' }
  | { op: 'chat.send'; groupId: string; presetId: WorldPresetId }
  /** Free text stays behind a separate flag, off (#48 L4). */
  | { op: 'chat.send_text'; groupId: string; text: string };

/** What reaches Nakama: everything except the canonical connection list. */
export type WorldTransportCommand = Exclude<WorldCommand, { op: 'friends.list' }>;

export interface WorldConnection {
  userId: string;
  expiresAt: number;
  execute(command: WorldTransportCommand, targetNakamaId?: string): Promise<unknown>;
  close(): void;
}
export interface WorldTransport {
  connect(customId: string, signal: AbortSignal, event: (event: unknown) => void,
    disconnected: () => void): Promise<WorldConnection>;
  /** Account erasure (#48 L6): deletes the Nakama account of this identity; false if none existed. */
  deleteAccount(customId: string, signal: AbortSignal): Promise<boolean>;
}
/**
 * Canonical user-to-user blocks, read-only from World (#594, decision #48 L5). The
 * canonical implementation is the EMOPET `user_blocks` repository; World never writes blocks.
 */
export interface WorldBlockPolicy {
  isBlockedEitherWay(userA: string, userB: string): Promise<boolean>;
}
/**
 * Canonical World pilot access (#596, decisions #48 L1 + L7): invited adult tester with a live
 * login. The canonical implementation is `drizzleWorldPilotAccess`; World never grants access.
 */
export interface WorldAccessPolicy {
  isEligible(userId: string): Promise<boolean>;
}
/**
 * Canonical connections and presence consent (#595, decisions #48 L3 + L2). Implemented by
 * `social_connections` and `world_presence_consents`; World never writes the social graph.
 */
export interface WorldSocialPolicy {
  /** CONNECTED (or TRUSTED either way) and not blocked either way. */
  isMutuallyConnected(userA: string, userB: string): Promise<boolean>;
  connectedPeers(userId: string): Promise<string[]>;
  hasPresenceConsent(userId: string): Promise<boolean>;
  grantPresenceConsent(userId: string, expiresAt: Date): Promise<void>;
  withdrawPresenceConsent(userId: string): Promise<void>;
}
/** `unreachable`: target offline or blocked either way; deliberately indistinguishable. */
export class WorldError extends Error {
  constructor(public code: 'unavailable' | 'timeout' | 'invalid_session' | 'forbidden' | 'busy' | 'invalid_request' | 'unreachable') {
    super(code);
  }
}
