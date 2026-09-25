/** Narrow Nakama JSON socket protocol, matching the official JS client's envelopes.
 * Node lifecycle implementation avoids browser-only SDK heartbeat/window handling.
 * SPIKE / NOT PRODUCTION AUTHORITY.
 */
import { WorldError } from './contracts.js';
type Pending = { resolve: (value: Record<string, unknown>) => void; reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout> };
export class NakamaSocket {
  private socket?: WebSocket;
  private pending = new Map<string, Pending>();
  private sequence = 0;
  private heartbeat?: ReturnType<typeof setInterval>;
  private ended = false;
  constructor(private event: (value: unknown) => void, private disconnected: () => void) {}
  async connect(url: string, token: string, signal: AbortSignal): Promise<void> {
    if (signal.aborted) throw new WorldError('timeout');
    const endpoint = new URL('/ws', url);
    endpoint.protocol = 'ws:';
    endpoint.searchParams.set('token', token);
    endpoint.searchParams.set('status', 'true');
    endpoint.searchParams.set('format', 'json');
    const socket = this.socket = new WebSocket(endpoint);
    await new Promise<void>((resolve, reject) => {
      const abort = () => { this.close(); reject(new WorldError('timeout')); };
      const timer = setTimeout(abort, 5000);
      const cleanup = () => { clearTimeout(timer); signal.removeEventListener('abort', abort); };
      signal.addEventListener('abort', abort, { once: true });
      socket.onopen = () => {
        cleanup();
        if (this.ended || signal.aborted) { this.close(); reject(new WorldError('timeout')); return; }
        this.heartbeat = setInterval(() => { void this.send({ ping: {} }).catch(() => this.close()); }, 5000);
        this.heartbeat.unref();
        resolve();
      };
      const failed = () => { cleanup(); this.close(); reject(new WorldError('unavailable')); };
      socket.onerror = failed;
      socket.onclose = failed;
      socket.onmessage = message => {
        if (this.ended) return;
        try {
          if (typeof message.data !== 'string' || message.data.length > 65536) throw new Error('Invalid frame');
          const envelope = JSON.parse(message.data) as Record<string, unknown>;
          if (typeof envelope['cid'] === 'string') {
            const pending = this.pending.get(envelope['cid']);
            if (!pending) return;
            this.pending.delete(envelope['cid']); clearTimeout(pending.timer);
            if (envelope['error']) pending.reject(new WorldError('invalid_request'));
            else pending.resolve(envelope);
          } else if (envelope['status_presence_event']) this.event({ type: 'presence', value: envelope['status_presence_event'] });
          else if (envelope['channel_presence_event']) this.event({ type: 'channel-presence', value: envelope['channel_presence_event'] });
          else if (envelope['channel_message']) {
            const value = envelope['channel_message'] as Record<string, unknown>;
            this.event({ type: 'chat', value: { channelId: value['channel_id'], senderId: value['sender_id'],
              messageId: value['message_id'], content: JSON.parse(String(value['content'])) } });
          }
        } catch { this.close(); }
      };
    });
  }
  private send(body: Record<string, unknown>): Promise<Record<string, unknown>> {
    if (this.ended || this.socket?.readyState !== WebSocket.OPEN) return Promise.reject(new WorldError('unavailable'));
    const cid = String(++this.sequence);
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(cid); reject(new WorldError('timeout')); this.close();
      }, 5000);
      this.pending.set(cid, { resolve, reject, timer });
      try { this.socket!.send(JSON.stringify({ cid, ...body })); }
      catch { this.close(); }
    });
  }
  close() {
    if (this.ended) return;
    this.ended = true;
    clearInterval(this.heartbeat);
    for (const pending of this.pending.values()) { clearTimeout(pending.timer); pending.reject(new WorldError('unavailable')); }
    this.pending.clear();
    this.socket?.close();
    this.disconnected();
  }
  async followUsers(ids: string[]) { return (await this.send({ status_follow: { user_ids: ids } }))['status']; }
  async updateStatus(status: string) { await this.send({ status_update: { status } }); }
  async joinChat(target: string) {
    const channel = (await this.send({ channel_join: { target, type: 3, persistence: false, hidden: false } }))['channel'] as { id?: string };
    if (!channel?.id) throw new WorldError('unavailable');
    return { id: channel.id };
  }
  async leaveChat(channelId: string) { await this.send({ channel_leave: { channel_id: channelId } }); }
  async writeChatMessage(channelId: string, content: { text: string }) {
    const ack = (await this.send({ channel_message_send: { channel_id: channelId, content: JSON.stringify(content) } }))['channel_message_ack'] as { message_id?: string };
    if (!ack?.message_id) throw new WorldError('unavailable');
    return { message_id: ack.message_id };
  }
}
