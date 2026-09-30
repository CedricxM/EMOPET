import { randomUUID } from 'node:crypto';
import { isCanonicalUserId } from '../auth-security.js';
import {
  WORLD_PRESETS, WorldError, type WorldAccessPolicy, type WorldBlockPolicy, type WorldCommand, type WorldConnection,
  type WorldSocialPolicy, type WorldTransport, type WorldTransportCommand,
} from './contracts.js';

export function customIdentity(userId: string): string {
  if (!isCanonicalUserId(userId)) throw new WorldError('forbidden');
  return `emopet:world-spike:v1:${userId.toLowerCase()}`;
}
type Entry = {
  actor: string; connection?: WorldConnection; events: unknown[]; overflow: boolean;
  degraded: boolean; busy: boolean; expiresAt: number; timer?: ReturnType<typeof setTimeout>;
  restore: Map<string, WorldTransportCommand>; deactivate: () => void;
  /** Presence opt-in for this World session (#48 L2); every new session starts invisible. */
  presence: boolean;
};

/** Presence rows reveal only who and online/away: never location, dog or ELI data (#595). */
function presenceRow(row: { user_id?: unknown; status?: unknown }) {
  return { user_id: row.user_id, ...(row.status === 'online' || row.status === 'away' ? { status: row.status } : {}) };
}
/** Chat carries a preset id, or free text only when that separate flag allowed it to be sent. */
function chatContent(content: unknown, allowFreeText = false): Record<string, string> | null {
  const value = content as { preset?: unknown; text?: unknown } | null;
  if (typeof value?.preset === 'string' && Object.hasOwn(WORLD_PRESETS, value.preset)) return { preset: value.preset };
  if (allowFreeText && typeof value?.text === 'string' && value.text.length <= 1000) return { text: value.text };
  return null;
}

/**
 * Process-local, bounded synthetic harness. No protected-domain repository dependency:
 * canonical blocks arrive through the read-only WorldBlockPolicy port.
 *
 * Blocks (#594) make two participants mutually and silently invisible: targeted commands
 * are `unreachable` exactly as for an offline participant, and friend lists, presence and
 * chat events are filtered when read, so a block also covers already-buffered events.
 *
 * Access (#596, #48 L1 + L7) is canonical: the WorldAccessPolicy port is checked at bootstrap
 * and again on every request, for the actor and for any target, so a revocation made anywhere
 * takes effect at the next request. `revokeActor` (subscribed to canonical logout, logout_all
 * and pilot revocation) closes the actor's live handles at once, including a bootstrap in flight.
 *
 * Connections and presence (#595, #48 L3 + L2) are canonical through the WorldSocialPolicy port.
 * The connection list is served from it; World writes no Nakama friend edge. Presence is
 * invisible by default: a person publishes a status only after opting in for the session, may
 * be followed only by mutually connected people, and appears in presence events only to them.
 * Withdrawing consent closes the socket first, so Nakama shows the person offline at once.
 */
export class WorldRealtimeAdapter {
  private sessions = new Map<string, Entry>();
  private opening = new Set<string>();
  /** Nakama transport id -> canonical actor for every participant bootstrapped in this process. */
  private transportActors = new Map<string, string>();
  /** Bumped by each revocation, so a bootstrap that started before it never registers. */
  private generations = new Map<string, number>();
  constructor(private transport: WorldTransport, private access: WorldAccessPolicy,
    private blocks: WorldBlockPolicy, private social: WorldSocialPolicy,
    private clock = Date.now, private sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms)),
    private deadlineMs = 5000, private options: { freeText?: boolean } = {}) {}

  private actor(userId: string) {
    customIdentity(userId);
    return userId.toLowerCase();
  }
  /** Canonical reads fail closed: an unknown social state is never read as permission. */
  private async canonical<T>(read: () => Promise<T>): Promise<T> {
    try { return await read(); } catch { throw new WorldError('unavailable'); }
  }
  private async eligible(actor: string): Promise<boolean> {
    try { return await this.access.isEligible(actor); }
    // An unknown access state is never read as "eligible".
    catch { throw new WorldError('unavailable'); }
  }
  /** Closes every live handle of this person, now. Safe to call for anyone, any time. */
  revokeActor(userId: string) {
    let actor: string;
    try { actor = this.actor(userId); } catch { return; }
    this.generations.set(actor, (this.generations.get(actor) ?? 0) + 1);
    for (const [handle, entry] of this.sessions) if (entry.actor === actor) this.drop(handle);
  }
  /**
   * Account erasure (#48 L6): close the person's live handles, delete their Nakama account
   * and forget the transport mapping. Chat is never persisted; any other spike data (such as
   * groups) goes with the end-of-pilot volume reset. Returns false when no Nakama account existed.
   */
  async purgeTransportAccount(userId: string): Promise<boolean> {
    const actor = this.actor(userId);
    this.revokeActor(actor);
    const deleted = await this.deadline(signal => this.transport.deleteAccount(customIdentity(actor), signal));
    for (const [transportId, canonical] of this.transportActors) if (canonical === actor) this.transportActors.delete(transportId);
    return deleted;
  }
  /** A session of a person who is still eligible; otherwise it is closed and refused. */
  private async live(userId: string, handle: string) {
    const entry = this.entry(userId, handle);
    if (!await this.eligible(entry.actor)) { this.revokeActor(entry.actor); throw new WorldError('forbidden'); }
    return entry;
  }
  private entry(userId: string, handle: string) {
    const actor = this.actor(userId);
    const entry = this.sessions.get(handle);
    if (!entry || entry.actor !== actor) throw new WorldError('invalid_session');
    if (entry.expiresAt <= this.clock()) {
      this.drop(handle); throw new WorldError('invalid_session');
    }
    return entry;
  }
  private drop(handle: string) {
    const entry = this.sessions.get(handle);
    this.sessions.delete(handle);
    if (entry) { entry.deactivate(); clearTimeout(entry.timer); entry.connection?.close(); entry.events.length = 0; }
  }
  private async deadline<T>(run: (signal: AbortSignal) => Promise<T>): Promise<T> {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([run(controller.signal), new Promise<never>((_, reject) => {
        timer = setTimeout(() => { controller.abort(); reject(new WorldError('timeout')); }, this.deadlineMs);
      })]);
    } catch (error) {
      if (error instanceof WorldError) throw error;
      throw new WorldError('unavailable');
    } finally { clearTimeout(timer); }
  }
  async bootstrap(userId: string, authExpiresAt: number, previousHandle?: string) {
    const actor = this.actor(userId);
    if (!Number.isFinite(authExpiresAt) || authExpiresAt <= this.clock()) throw new WorldError('invalid_session');
    if (this.opening.has(actor)) throw new WorldError('busy');
    const previous = previousHandle ? this.entry(actor, previousHandle) : undefined;
    if (previous?.busy) throw new WorldError('busy');
    this.opening.add(actor);
    const restore = new Map(previous?.restore);
    const generation = this.generations.get(actor) ?? 0;
    try {
      // Canonical pilot access and a live login, re-read now: an access JWT alone is not enough.
      if (!await this.eligible(actor)) { this.revokeActor(actor); throw new WorldError('forbidden'); }
      for (const [handle, entry] of this.sessions) if (entry.actor === actor) this.drop(handle);
      for (let attempt = 0; attempt < (previous ? 3 : 1); attempt++) {
        if (attempt) await this.sleep(250 * 2 ** (attempt - 1));
        if (authExpiresAt <= this.clock()) throw new WorldError('invalid_session');
        const handle = randomUUID();
        let active = true;
        const entry: Entry = { actor, events: [], overflow: false, degraded: false, busy: false,
          expiresAt: authExpiresAt, restore, deactivate: () => { active = false; }, presence: false };
        try {
          entry.connection = await this.deadline(async signal => {
            const connection = await this.transport.connect(customIdentity(actor), signal, event => {
              if (!active || entry.degraded || entry.expiresAt <= this.clock()) return;
              if (entry.events.length === 100) { entry.events.shift(); entry.overflow = true; }
              entry.events.push(event);
            }, () => { entry.degraded = true; });
            if (signal.aborted || !active) { connection.close(); throw new WorldError('timeout'); }
            return connection;
          });
          entry.expiresAt = Math.min(authExpiresAt, entry.connection.expiresAt);
          if (!Number.isFinite(entry.expiresAt) || entry.expiresAt <= this.clock()) throw new WorldError('invalid_session');
          this.transportActors.set(entry.connection.userId, actor);
          // A renewal continues the same session: its presence opt-in carries over while the
          // canonical consent is still active. A fresh bootstrap starts invisible.
          entry.presence = Boolean(previous?.presence) && await this.canonical(() => this.social.hasPresenceConsent(actor));
          for (const [key, command] of restore) {
            if (command.op === 'presence.update' && !entry.presence) { restore.delete(key); continue; }
            let target: string | undefined;
            // A followed participant may be offline or now blocked either way: drop that
            // subscription instead of failing renewal. The client re-follows when reachable.
            try { target = await this.target(actor, command); } catch { restore.delete(key); continue; }
            await this.deadline(() => entry.connection!.execute(command, target));
          }
          if (entry.degraded || entry.expiresAt <= this.clock()) throw new WorldError('unavailable');
          // Revoked while connecting (logout, pilot revocation): never register the handle.
          if ((this.generations.get(actor) ?? 0) !== generation) throw new WorldError('forbidden');
          this.sessions.set(handle, entry);
          entry.timer = setTimeout(() => { active = false; this.drop(handle); }, entry.expiresAt - this.clock());
          entry.timer.unref();
          return { handle, expiresAt: entry.expiresAt, state: 'connected' as const };
        } catch (error) {
          active = false; entry.connection?.close();
          if (!previous || attempt === 2
            || (error instanceof WorldError && (error.code === 'invalid_session' || error.code === 'forbidden'))) throw error;
        }
      }
      throw new WorldError('unavailable');
    } finally { this.opening.delete(actor); }
  }
  private async target(actor: string, command: WorldCommand): Promise<string | undefined> {
    if (!('targetUserId' in command)) return undefined;
    const target = this.actor(command.targetUserId);
    if (target === actor) throw new WorldError('invalid_request');
    const entry = [...this.sessions.values()].find(e => e.actor === target && e.expiresAt > this.clock() && !e.degraded);
    // Offline and blocked are deliberately the same answer, so a block is never revealed.
    if (!entry?.connection || await this.blockedEitherWay(actor, target)) throw new WorldError('unreachable');
    // A target whose access was revoked elsewhere is closed and looks offline too.
    if (!await this.eligible(target)) { this.revokeActor(target); throw new WorldError('unreachable'); }
    // Presence is followed only between mutually connected people, and only if the target
    // opted in; otherwise the answer is the offline one (#48 L2).
    if (command.op === 'presence.follow' && !await this.presenceVisible(actor, target)) throw new WorldError('unreachable');
    return entry.connection.userId;
  }
  private async presenceVisible(viewer: string, other: string): Promise<boolean> {
    return await this.canonical(() => this.social.isMutuallyConnected(viewer, other))
      && this.canonical(() => this.social.hasPresenceConsent(other));
  }
  private async blockedEitherWay(actor: string, other: string): Promise<boolean> {
    try { return await this.blocks.isBlockedEitherWay(actor, other); }
    // An unknown block state is never read as "not blocked".
    catch { throw new WorldError('unavailable'); }
  }
  /** Visibility of a transport id for `actor`; participants unknown to this process fail closed. */
  private visibility(actor: string, ownTransportId: string) {
    const cache = new Map<string, Promise<boolean>>();
    return (transportId: unknown): Promise<boolean> => {
      if (typeof transportId !== 'string') return Promise.resolve(false);
      if (transportId === ownTransportId) return Promise.resolve(true);
      const other = this.transportActors.get(transportId);
      if (!other) return Promise.resolve(false);
      if (!cache.has(other)) cache.set(other, this.blockedEitherWay(actor, other).then(blocked => !blocked));
      return cache.get(other)!;
    };
  }
  /**
   * Presence visibility of a transport id for `actor` (#48 L2): arrivals need a mutual connection
   * and the other person's active opt-in; departures need only the mutual connection, so people
   * who saw someone arrive also see them leave after a withdrawal. Blocks hide both.
   */
  private presenceVisibility(actor: string, ownTransportId: string) {
    const cache = new Map<string, Promise<{ mutual: boolean; consent: boolean }>>();
    return async (transportId: unknown, arrival: boolean): Promise<boolean> => {
      if (typeof transportId !== 'string') return false;
      if (transportId === ownTransportId) return true;
      const other = this.transportActors.get(transportId);
      if (!other) return false;
      if (!cache.has(other)) cache.set(other, (async () => {
        if (await this.blockedEitherWay(actor, other)) return { mutual: false, consent: false };
        const mutual = await this.canonical(() => this.social.isMutuallyConnected(actor, other));
        return { mutual, consent: mutual && await this.canonical(() => this.social.hasPresenceConsent(other)) };
      })());
      const state = await cache.get(other)!;
      return arrival ? state.consent : state.mutual;
    };
  }
  private async visibleEvents(entry: Entry, events: unknown[]): Promise<unknown[]> {
    const visible = this.visibility(entry.actor, entry.connection?.userId ?? '');
    const presence = this.presenceVisibility(entry.actor, entry.connection?.userId ?? '');
    const people = async (list: unknown, arrival: boolean) => {
      const rows = Array.isArray(list) ? list as { user_id?: unknown; status?: unknown }[] : [];
      const keep = await Promise.all(rows.map(row => presence(row?.user_id, arrival)));
      return rows.filter((_, index) => keep[index]).map(presenceRow);
    };
    const out: unknown[] = [];
    for (const event of events as { type?: unknown; value?: Record<string, unknown> }[]) {
      if (event?.type === 'chat' && event.value) {
        const content = chatContent(event.value['content'], this.options.freeText === true);
        if (content && await visible(event.value['senderId'])) {
          out.push({ type: 'chat', value: { channelId: event.value['channelId'], senderId: event.value['senderId'],
            messageId: event.value['messageId'], content } });
        }
      } else if ((event?.type === 'presence' || event?.type === 'channel-presence') && event.value) {
        const joins = await people(event.value['joins'], true);
        const leaves = await people(event.value['leaves'], false);
        // Only who and online/away: every other field of the transport event is dropped.
        if (joins.length || leaves.length) out.push({ type: event.type, value: { joins, leaves } });
      }
      // Any other event shape is dropped: only known, checkable events reach the client.
    }
    return out;
  }
  async execute(userId: string, handle: string, command: WorldCommand) {
    const entry = await this.live(userId, handle);
    if (entry.busy) throw new WorldError('busy');
    if (entry.degraded || !entry.connection) throw new WorldError('unavailable');
    entry.busy = true;
    // The connection list is canonical (#595): no transport call, no Nakama friend edge.
    if (command.op === 'friends.list') {
      try {
        const peers = await this.canonical(() => this.social.connectedPeers(entry.actor));
        return { friends: peers.map(userId => ({ userId })) };
      } finally { entry.busy = false; }
    }
    let target: string | undefined;
    // Target, block, connection and consent checks run before any transport call, so their
    // errors leave the session intact.
    try {
      target = await this.target(entry.actor, command);
      // Publishing a status needs this session's opt-in and an active canonical consent.
      if (command.op === 'presence.update'
        && !(entry.presence && await this.canonical(() => this.social.hasPresenceConsent(entry.actor)))) {
        throw new WorldError('forbidden');
      }
    } catch (error) { entry.busy = false; throw error; }
    try {
      const result = await this.deadline(() => entry.connection!.execute(command, target));
      if (this.sessions.get(handle) !== entry || entry.degraded || entry.expiresAt <= this.clock()) throw new WorldError('invalid_session');
      if (command.op === 'presence.follow') entry.restore.set(`follow:${command.targetUserId}`, command);
      if (command.op === 'presence.update') entry.restore.set('status', command);
      if (command.op === 'chat.join') entry.restore.set(`chat:${command.groupId}`, command);
      if (command.op === 'groups.leave') entry.restore.delete(`chat:${command.groupId}`);
      return result;
    } catch (error) {
      // A rejected request did not execute; keep the session. A timeout or transport failure
      // can mean the write happened: close and never replay it.
      if (error instanceof WorldError && error.code === 'invalid_request') throw error;
      entry.degraded = true; entry.connection!.close();
      throw error instanceof WorldError ? error : new WorldError('unavailable');
    } finally { entry.busy = false; }
  }
  async events(userId: string, handle: string) {
    const entry = await this.live(userId, handle);
    const pending = entry.events.splice(0);
    const overflow = entry.overflow;
    entry.overflow = false;
    let events: unknown[];
    try { events = await this.visibleEvents(entry, pending); } catch (error) {
      // Block state unknown: keep the events buffered (bounded) rather than leak or lose them.
      entry.events.unshift(...pending);
      const excess = entry.events.length - 100;
      if (excess > 0) entry.events.splice(0, excess);
      entry.overflow = overflow || excess > 0 || entry.overflow;
      throw error;
    }
    return { state: entry.degraded ? 'degraded' : 'connected', events, resyncRequired: overflow };
  }
  /**
   * Resolves who is being reported, from the verified actor's live session only.
   * `world_user` names a participant met in World (bootstrapped in this process); `world_message`
   * names the Nakama sender of a received message, translated to its canonical id. Reports ignore
   * blocks and revocations on purpose: people must be able to report someone they blocked (or who
   * blocked them), or who has just left.
   */
  async reportSubject(userId: string, handle: string, report: { kind: 'world_user'; targetUserId: string }
    | { kind: 'world_message'; senderId: string }): Promise<{ reporter: string; subject: string }> {
    const entry = await this.live(userId, handle);
    const met = new Set(this.transportActors.values());
    const subject = report.kind === 'world_user'
      ? (met.has(this.actor(report.targetUserId)) ? this.actor(report.targetUserId) : undefined)
      : this.transportActors.get(report.senderId);
    // An unknown sender cannot be attributed to a canonical person: refuse rather than guess.
    if (!subject || subject === entry.actor) throw new WorldError('invalid_request');
    return { reporter: entry.actor, subject };
  }
  /** Opt in to presence for this World session only (#48 L2), recorded canonically. */
  async showPresence(userId: string, handle: string) {
    const entry = await this.live(userId, handle);
    await this.canonical(() => this.social.grantPresenceConsent(entry.actor, new Date(entry.expiresAt)));
    entry.presence = true;
    return { presence: 'visible' as const, until: entry.expiresAt };
  }
  /**
   * Withdraw presence consent. The socket closes first, so Nakama shows the person offline at
   * once even if recording the withdrawal fails; a new bootstrap starts invisible.
   */
  async hidePresence(userId: string, handle: string) {
    const entry = this.entry(userId, handle);
    this.drop(handle);
    await this.canonical(() => this.social.withdrawPresenceConsent(entry.actor));
  }
  disconnect(userId: string, handle: string) { this.entry(userId, handle); this.drop(handle); }
  close() { for (const handle of this.sessions.keys()) this.drop(handle); }
}
