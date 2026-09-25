/** SPIKE / NOT PRODUCTION AUTHORITY. All Nakama SDK use lives here. */
import { Client, Session } from '@heroiclabs/nakama-js';
import { WorldError, type WorldTransport, type WorldConnection } from './contracts.js';
import { NakamaSocket } from './socket.js';

export class NakamaTransport implements WorldTransport {
  constructor(private url: string, private httpKey: string) {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' || !['localhost', '127.0.0.1'].includes(parsed.hostname) ||
      parsed.username || parsed.password || parsed.pathname !== '/' || parsed.search || parsed.hash) {
      throw new Error('World spike requires a loopback HTTP Nakama URL');
    }
    if (httpKey.length < 32 || httpKey.startsWith('REPLACE')) throw new Error('Configure a local runtime key');
  }
  async connect(customId: string, signal: AbortSignal, event: (event: unknown) => void,
    disconnected: () => void): Promise<WorldConnection> {
    // Node >=22 supplies the WHATWG WebSocket for the server-side socket layer.
    if (typeof globalThis.WebSocket !== 'function') throw new WorldError('unavailable');
    const endpoint = new URL('/v2/rpc/emopet_bootstrap', this.url);
    endpoint.searchParams.set('unwrap', '');
    const response = await fetch(endpoint, { method: 'POST', signal, redirect: 'error',
      headers: { 'Content-Type': 'application/json',
        Authorization: `Basic ${Buffer.from(`${this.httpKey}:`).toString('base64')}` },
      body: JSON.stringify({ customId }) });
    if (!response.ok) throw new WorldError('unavailable');
    const data = await response.json() as { token?: unknown; userId?: unknown };
    if (typeof data.token !== 'string' || typeof data.userId !== 'string') throw new WorldError('unavailable');
    const session = Session.restore(data.token, '');
    if (session.user_id !== data.userId || !session.expires_at) throw new WorldError('unavailable');
    const url = new URL(this.url);
    const client = new Client('unused-server-side-bootstrap', url.hostname, url.port || '7350', false, 5000, false);
    const socket = new NakamaSocket(event, () => { closed = true; disconnected(); });
    const channels = new Map<string, string>();
    let closed = false;
    const close = () => { closed = true; socket.close(); };
    try {
      if (signal.aborted) throw new WorldError('timeout');
      await socket.connect(this.url, session.token, signal);
      if (signal.aborted || closed) throw new WorldError('unavailable');
    } catch (error) { close(); throw error; }
    return {
      userId: data.userId, expiresAt: session.expires_at * 1000, close,
      async execute(command, targetId) {
        if (closed) throw new WorldError('unavailable');
        switch (command.op) {
          case 'friends.list': return client.listFriends(session, undefined, 100);
          case 'friends.accept': {
            const pending = await client.listFriends(session, 2, 100);
            if (!pending.friends?.some(friend => friend.user?.id === targetId)) throw new WorldError('invalid_request');
            if (closed) throw new WorldError('unavailable');
            return { accepted: await client.addFriends(session, [targetId!]) };
          }
          case 'friends.request':
            if (!targetId) throw new WorldError('invalid_request');
            return { accepted: await client.addFriends(session, [targetId]) };
          case 'groups.create': {
            const group = await client.createGroup(session, { name: `spike-${command.name}`, open: true, max_count: 10 });
            return { groupId: group.id, name: group.name };
          }
          case 'groups.list': return client.listUserGroups(session, data.userId as string, undefined, 100);
          case 'groups.join': return { joined: await client.joinGroup(session, command.groupId) };
          case 'groups.leave': {
            const channel = channels.get(command.groupId);
            if (channel) await socket.leaveChat(channel);
            if (closed) throw new WorldError('unavailable');
            channels.delete(command.groupId);
            return { left: await client.leaveGroup(session, command.groupId) };
          }
          case 'presence.follow':
            if (!targetId) throw new WorldError('invalid_request');
            return socket.followUsers([targetId]);
          case 'presence.update': await socket.updateStatus(command.status); return { updated: true };
          case 'chat.join': {
            const channel = await socket.joinChat(command.groupId);
            if (closed) throw new WorldError('unavailable');
            channels.set(command.groupId, channel.id);
            return { channelId: channel.id };
          }
          case 'chat.send': {
            const channel = channels.get(command.groupId);
            if (!channel) throw new WorldError('invalid_request');
            const ack = await socket.writeChatMessage(channel, { text: command.text });
            return { messageId: ack.message_id };
          }
        }
      },
    };
  }
}
