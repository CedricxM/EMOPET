import { randomUUID } from 'node:crypto';
import { isCanonicalUserId } from '../auth-security.js';
import {
  WorldError, type WorldBlockPolicy, type WorldCommand, type WorldConnection, type WorldTransport,
} from './contracts.js';

export function customIdentity(userId: string): string {
  if (!isCanonicalUserId(userId)) throw new WorldError('forbidden');
  return `emopet:world-spike:v1:${userId.toLowerCase()}`;
}
type Entry = {
  actor: string; connection?: WorldConnection; events: unknown[]; overflow: boolean;
  degraded: boolean; busy: boolean; expiresAt: number; timer?: ReturnType<typeof setTimeout>;
  restore: Map<string, WorldCommand>; deactivate: () => void;
};

/**
 * Process-local, bounded synthetic harness. No protected-domain repository dependency:
 * canonical blocks arrive through the read-only WorldBlockPolicy port.
 *
 * Blocks (#594) make two participants mutually and silently invisible: targeted commands
 * are `unreachable` exactly as for an offline participant, and friend lists, presence and
 * chat events are filtered when read, so a block also covers already-buffered events.
 */
export class WorldRealtimeAdapter {
  private sessions = new Map<string, Entry>();
  private opening = new Set<string>();
  /** Nakama transport id -> canonical actor for every participant bootstrapped in this process. */
  private transportActors = new Map<string, string>();
  constructor(private transport: WorldTransport, private allowedUsers: Set<string>,
    private blocks: WorldBlockPolicy,
    private clock = Date.now, private sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms)),
    private deadlineMs = 5000) {}

  private actor(userId: string) {
    customIdentity(userId);
    const actor = userId.toLowerCase();
    if (!this.allowedUsers.has(actor)) throw new WorldError('forbidden');
    return actor;
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
    for (const [handle, entry] of this.sessions) if (entry.actor === actor) this.drop(handle);
    try {
      for (let attempt = 0; attempt < (previous ? 3 : 1); attempt++) {
        if (attempt) await this.sleep(250 * 2 ** (attempt - 1));
        if (authExpiresAt <= this.clock()) throw new WorldError('invalid_session');
        const handle = randomUUID();
        let active = true;
        const entry: Entry = { actor, events: [], overflow: false, degraded: false, busy: false,
          expiresAt: authExpiresAt, restore, deactivate: () => { active = false; } };
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
          for (const [key, command] of restore) {
            let target: string | undefined;
            // A followed participant may be offline or now blocked either way: drop that
            // subscription instead of failing renewal. The client re-follows when reachable.
            try { target = await this.target(actor, command); } catch { restore.delete(key); continue; }
            await this.deadline(() => entry.connection!.execute(command, target));
          }
          if (entry.degraded || entry.expiresAt <= this.clock()) throw new WorldError('unavailable');
          this.sessions.set(handle, entry);
          entry.timer = setTimeout(() => { active = false; this.drop(handle); }, entry.expiresAt - this.clock());
          entry.timer.unref();
          return { handle, expiresAt: entry.expiresAt, state: 'connected' as const };
        } catch (error) {
          active = false; entry.connection?.close();
          if (!previous || attempt === 2 || (error instanceof WorldError && error.code === 'invalid_session')) throw error;
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
    return entry.connection.userId;
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
  private async visibleEvents(entry: Entry, events: unknown[]): Promise<unknown[]> {
    const visible = this.visibility(entry.actor, entry.connection?.userId ?? '');
    const people = async (list: unknown) => {
      const rows = Array.isArray(list) ? list as { user_id?: unknown }[] : [];
      const keep = await Promise.all(rows.map(row => visible(row?.user_id)));
      return rows.filter((_, index) => keep[index]);
    };
    const out: unknown[] = [];
    for (const event of events as { type?: unknown; value?: Record<string, unknown> }[]) {
      if (event?.type === 'chat') {
        if (await visible(event.value?.['senderId'])) out.push(event);
      } else if ((event?.type === 'presence' || event?.type === 'channel-presence') && event.value) {
        const joins = await people(event.value['joins']);
        const leaves = await people(event.value['leaves']);
        if (joins.length || leaves.length) out.push({ ...event, value: { ...event.value, joins, leaves } });
      }
      // Any other event shape is dropped: only known, checkable events reach the client.
    }
    return out;
  }
  private async visibleFriends(entry: Entry, result: unknown) {
    const listing = result as { friends?: { user?: { id?: unknown } }[] } | null;
    if (!listing || !Array.isArray(listing.friends)) return result;
    const visible = this.visibility(entry.actor, entry.connection?.userId ?? '');
    const keep = await Promise.all(listing.friends.map(friend => visible(friend?.user?.id)));
    return { ...listing, friends: listing.friends.filter((_, index) => keep[index]) };
  }
  async execute(userId: string, handle: string, command: WorldCommand) {
    const entry = this.entry(userId, handle);
    if (entry.busy) throw new WorldError('busy');
    if (entry.degraded || !entry.connection) throw new WorldError('unavailable');
    entry.busy = true;
    let target: string | undefined;
    // Target and block checks run before any transport call, so their errors leave the session intact.
    try { target = await this.target(entry.actor, command); } catch (error) { entry.busy = false; throw error; }
    try {
      let result = await this.deadline(() => entry.connection!.execute(command, target));
      if (this.sessions.get(handle) !== entry || entry.degraded || entry.expiresAt <= this.clock()) throw new WorldError('invalid_session');
      if (command.op === 'presence.follow') entry.restore.set(`follow:${command.targetUserId}`, command);
      if (command.op === 'presence.update') entry.restore.set('status', command);
      if (command.op === 'chat.join') entry.restore.set(`chat:${command.groupId}`, command);
      if (command.op === 'groups.leave') entry.restore.delete(`chat:${command.groupId}`);
      if (command.op === 'friends.list') result = await this.visibleFriends(entry, result);
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
    const entry = this.entry(userId, handle);
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
  disconnect(userId: string, handle: string) { this.entry(userId, handle); this.drop(handle); }
  close() { for (const handle of this.sessions.keys()) this.drop(handle); }
}
