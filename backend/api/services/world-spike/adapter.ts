import { randomUUID } from 'node:crypto';
import { isCanonicalUserId } from '../auth-security.js';
import { WorldError, type WorldCommand, type WorldConnection, type WorldTransport } from './contracts.js';

export function customIdentity(userId: string): string {
  if (!isCanonicalUserId(userId)) throw new WorldError('forbidden');
  return `emopet:world-spike:v1:${userId.toLowerCase()}`;
}
type Entry = {
  actor: string; connection?: WorldConnection; events: unknown[]; overflow: boolean;
  degraded: boolean; busy: boolean; expiresAt: number; timer?: ReturnType<typeof setTimeout>;
  restore: Map<string, WorldCommand>; deactivate: () => void;
};

/** Process-local, bounded synthetic harness. No protected-domain repository dependency. */
export class WorldRealtimeAdapter {
  private sessions = new Map<string, Entry>();
  private opening = new Set<string>();
  constructor(private transport: WorldTransport, private allowedUsers: Set<string>,
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
          for (const command of restore.values()) {
            await this.deadline(() => entry.connection!.execute(command, this.target(command)));
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
  private target(command: WorldCommand): string | undefined {
    if (!('targetUserId' in command)) return undefined;
    const actor = this.actor(command.targetUserId);
    const entry = [...this.sessions.values()].find(e => e.actor === actor && e.expiresAt > this.clock() && !e.degraded);
    if (!entry?.connection) throw new WorldError('unavailable');
    return entry.connection.userId;
  }
  async execute(userId: string, handle: string, command: WorldCommand) {
    const entry = this.entry(userId, handle);
    if (entry.busy) throw new WorldError('busy');
    if (entry.degraded || !entry.connection) throw new WorldError('unavailable');
    entry.busy = true;
    try {
      const target = this.target(command);
      const result = await this.deadline(() => entry.connection!.execute(command, target));
      if (this.sessions.get(handle) !== entry || entry.degraded || entry.expiresAt <= this.clock()) throw new WorldError('invalid_session');
      if (command.op === 'presence.follow') entry.restore.set(`follow:${command.targetUserId}`, command);
      if (command.op === 'presence.update') entry.restore.set('status', command);
      if (command.op === 'chat.join') entry.restore.set(`chat:${command.groupId}`, command);
      if (command.op === 'groups.leave') entry.restore.delete(`chat:${command.groupId}`);
      return result;
    } catch (error) {
      // A timeout can mean the write happened. Close and never replay it.
      entry.degraded = true; entry.connection.close();
      throw error instanceof WorldError ? error : new WorldError('unavailable');
    } finally { entry.busy = false; }
  }
  events(userId: string, handle: string) {
    const entry = this.entry(userId, handle);
    const result = { state: entry.degraded ? 'degraded' : 'connected', events: entry.events.splice(0), resyncRequired: entry.overflow };
    entry.overflow = false;
    return result;
  }
  disconnect(userId: string, handle: string) { this.entry(userId, handle); this.drop(handle); }
  close() { for (const handle of this.sessions.keys()) this.drop(handle); }
}
