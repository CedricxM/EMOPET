'use client';

import { useCallback, useEffect, useState } from 'react';
import { ContentShell } from '../../components/content-shell';
import { Button, Card, Eyebrow, H1, H2, Lead, P, P2 } from '../../components/ui';
import { CHANNEL_LABELS, REASON_LABELS, STATUS_LABELS, formatSlot } from '../../lib/contact';
import type { ContactRequest, ContactStatus } from '../../lib/contact';
import { POST_TYPE_LABELS } from '../../lib/community';
import type { CirclePost } from '../../lib/community';

const TOKEN_KEY = 'breiz-admin-token';

interface ModerationData {
  adminConfigured: boolean;
  contactRequests: ContactRequest[];
  flaggedPosts: CirclePost[];
}

export default function AdminPage() {
  const [token, setToken] = useState('');
  const [data, setData] = useState<ModerationData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try { const t = sessionStorage.getItem(TOKEN_KEY); if (t) setToken(t); } catch {}
  }, []);

  const headers = useCallback((): HeadersInit => (token ? { 'x-admin-token': token, 'content-type': 'application/json' } : { 'content-type': 'application/json' }), [token]);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch('/api/admin/moderation', { headers: headers() });
      if (res.status === 401) { setError('Token admin requis ou invalide.'); setData(null); return; }
      if (res.ok) { setData((await res.json()) as ModerationData); }
    } catch { setError('Serveur injoignable.'); }
  }, [headers]);

  useEffect(() => { void load(); }, [load]);

  async function setStatus(r: ContactRequest, status: ContactStatus) {
    const body: Record<string, unknown> = { status };
    if (status === 'scheduled' && r.proposedSlots[0]) body.scheduledSlot = r.proposedSlots[0];
    await fetch(`/api/admin/contact/${r.id}`, { method: 'PATCH', headers: headers(), body: JSON.stringify(body) });
    void load();
  }
  async function moderate(id: string, action: 'hide' | 'unhide' | 'dismiss') {
    await fetch(`/api/admin/posts/${id}`, { method: 'PATCH', headers: headers(), body: JSON.stringify({ action }) });
    void load();
  }

  function saveToken() {
    try {
      sessionStorage.setItem(TOKEN_KEY, token);
      document.cookie = `${TOKEN_KEY}=${encodeURIComponent(token)}; path=/admin; sameSite=strict`;
    } catch {}
    void load();
  }

  return (
    <ContentShell>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 720 }}>
        <header style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <Eyebrow tone="accent">âŠ™ Ã‰quipe Â· modÃ©ration</Eyebrow>
          <H1>File de modÃ©ration</H1>
          <Lead>Demandes de contact Ã  traiter et publications signalÃ©es.</Lead>
        </header>

        {/* Gate token */}
        <Card tone="sunk" bordered={false}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 200 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--fg-muted)' }}>Token admin (si configurÃ©)</span>
              <input value={token} onChange={(e) => setToken(e.target.value)} placeholder="x-admin-token" style={{ padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--surface)', fontFamily: 'var(--font-mono)', fontSize: 13 }} />
            </label>
            <Button kind="secondary" onClick={saveToken}>Charger</Button>
          </div>
          {data && !data.adminConfigured && (
            <P2 style={{ color: 'var(--orange-pro)', marginTop: 8 }}>ADMIN_TOKEN non configure : les routes admin restent fermees. Definissez-le avant usage equipe.</P2>
          )}
        </Card>

        {error && <P2 style={{ color: 'var(--rouge)' }}>{error}</P2>}

        {data && (
          <>
            <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <H2 style={{ fontSize: 'var(--text-xl)' }}>Demandes de contact ({data.contactRequests.length})</H2>
              {data.contactRequests.length === 0 && <P2>Aucune demande.</P2>}
              {data.contactRequests.map((r) => (
                <Card key={r.id}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                      <Eyebrow tone="accent2">{REASON_LABELS[r.reason]} Â· {CHANNEL_LABELS[r.channel]}</Eyebrow>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-2)', textTransform: 'uppercase' }}>{STATUS_LABELS[r.status]}</span>
                    </div>
                    <P><strong>{r.contactValue}</strong></P>
                    {r.message && <P2>{r.message}</P2>}
                    <P2>{r.proposedSlots.map((s) => formatSlot(s)).join(' Â· ')}</P2>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <Button kind="secondary" size="sm" onClick={() => setStatus(r, 'scheduled')}>Programmer (1er crÃ©neau)</Button>
                      <Button kind="accent2" size="sm" onClick={() => setStatus(r, 'completed')}>TerminÃ©</Button>
                      <Button kind="ghost" size="sm" onClick={() => setStatus(r, 'cancelled')}>Annuler</Button>
                    </div>
                  </div>
                </Card>
              ))}
            </section>

            <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <H2 style={{ fontSize: 'var(--text-xl)' }}>Publications signalÃ©es ({data.flaggedPosts.length})</H2>
              {data.flaggedPosts.length === 0 && <P2>Aucun signalement.</P2>}
              {data.flaggedPosts.map((p) => (
                <Card key={p.id} tone={p.isHidden ? 'suppressed' : 'surface'}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <Eyebrow>{POST_TYPE_LABELS[p.type]} Â· {p.authorName}</Eyebrow>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--rouge)' }}>{p.flagCount} signalement{p.flagCount > 1 ? 's' : ''}{p.isHidden ? ' Â· masquÃ©' : ''}</span>
                    </div>
                    {p.title && <P style={{ fontWeight: 'var(--weight-semi)' }}>{p.title}</P>}
                    <P2>{p.content}</P2>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {!p.isHidden && <Button kind="secondary" size="sm" onClick={() => moderate(p.id, 'hide')}>Masquer</Button>}
                      {p.isHidden && <Button kind="secondary" size="sm" onClick={() => moderate(p.id, 'unhide')}>RÃ©-afficher</Button>}
                      <Button kind="ghost" size="sm" onClick={() => moderate(p.id, 'dismiss')}>Rejeter les signalements</Button>
                    </div>
                  </div>
                </Card>
              ))}
            </section>
          </>
        )}
      </div>
    </ContentShell>
  );
}
