'use client';

import { useCallback, useEffect, useState } from 'react';
import { ContentShell } from '../../components/content-shell';
import { Button, Card, Eyebrow, H1, H2, Lead, P, P2 } from '../../components/ui';
import { CHANNEL_LABELS, REASON_LABELS, STATUS_LABELS, formatSlot } from '../../lib/contact';
import type { ContactRequest, ContactStatus } from '../../lib/contact';
import { POST_TYPE_LABELS } from '../../lib/community';
import type { CirclePost } from '../../lib/community';

interface ModerationData {
  adminConfigured: boolean;
  contactRequests: ContactRequest[];
  flaggedPosts: CirclePost[];
}

export default function AdminPage() {
  const [data, setData] = useState<ModerationData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch('/api/admin/moderation', { cache: 'no-store' });
      if (res.status === 401) {
        setError('Session privilégiée requise ou invalide.');
        setData(null);
        return;
      }
      if (res.status === 503) {
        setError('Autorisation privilégiée ou data plane démo indisponible.');
        setData(null);
        return;
      }
      if (!res.ok) {
        setError('Impossible de charger la file de modération.');
        setData(null);
        return;
      }
      setData((await res.json()) as ModerationData);
    } catch {
      setError('Serveur injoignable.');
      setData(null);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function setStatus(r: ContactRequest, status: ContactStatus) {
    const body: Record<string, unknown> = { status };
    if (status === 'scheduled' && r.proposedSlots[0]) body.scheduledSlot = r.proposedSlots[0];
    const res = await fetch(`/api/admin/contact/${r.id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    if (!res.ok) setError('Mutation Contact refusée ou indisponible.');
    void load();
  }
  async function moderate(id: string, action: 'hide' | 'unhide' | 'dismiss') {
    const res = await fetch(`/api/admin/posts/${id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action }) });
    if (!res.ok) setError('Mutation de modération refusée ou indisponible.');
    void load();
  }

  return (
    <ContentShell>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 720 }}>
        <header style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <Eyebrow tone="accent">⊙ Équipe · modération</Eyebrow>
          <H1>File de modération</H1>
          <Lead>Demandes de contact à traiter et publications signalées.</Lead>
        </header>

        <Card tone="sunk" bordered={false}>
          <P2>
            Accès par session privilégiée server-side uniquement. Aucun token administrateur n’est stocké ou manipulé par le navigateur.
          </P2>
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
                      <Eyebrow tone="accent2">{REASON_LABELS[r.reason]} · {CHANNEL_LABELS[r.channel]}</Eyebrow>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-2)', textTransform: 'uppercase' }}>{STATUS_LABELS[r.status]}</span>
                    </div>
                    <P><strong>{r.contactValue}</strong></P>
                    {r.message && <P2>{r.message}</P2>}
                    <P2>{r.proposedSlots.map((s) => formatSlot(s)).join(' · ')}</P2>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <Button kind="secondary" size="sm" onClick={() => setStatus(r, 'scheduled')}>Programmer (1er créneau)</Button>
                      <Button kind="accent2" size="sm" onClick={() => setStatus(r, 'completed')}>Terminé</Button>
                      <Button kind="ghost" size="sm" onClick={() => setStatus(r, 'cancelled')}>Annuler</Button>
                    </div>
                  </div>
                </Card>
              ))}
            </section>

            <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <H2 style={{ fontSize: 'var(--text-xl)' }}>Publications signalées ({data.flaggedPosts.length})</H2>
              {data.flaggedPosts.length === 0 && <P2>Aucun signalement.</P2>}
              {data.flaggedPosts.map((p) => (
                <Card key={p.id} tone={p.isHidden ? 'suppressed' : 'surface'}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <Eyebrow>{POST_TYPE_LABELS[p.type]} · {p.authorName}</Eyebrow>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--rouge)' }}>{p.flagCount} signalement{p.flagCount > 1 ? 's' : ''}{p.isHidden ? ' · masqué' : ''}</span>
                    </div>
                    {p.title && <P style={{ fontWeight: 'var(--weight-semi)' }}>{p.title}</P>}
                    <P2>{p.content}</P2>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {!p.isHidden && <Button kind="secondary" size="sm" onClick={() => moderate(p.id, 'hide')}>Masquer</Button>}
                      {p.isHidden && <Button kind="secondary" size="sm" onClick={() => moderate(p.id, 'unhide')}>Ré-afficher</Button>}
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
