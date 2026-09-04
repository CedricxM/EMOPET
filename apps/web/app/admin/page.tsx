'use client';

import { useCallback, useEffect, useState } from 'react';
import { ContentShell } from '../../components/content-shell';
import { Card, Eyebrow, H1, H2, Lead, P, P2 } from '../../components/ui';
import { CHANNEL_LABELS, REASON_LABELS, STATUS_LABELS, formatSlot } from '../../lib/contact';
import type { ContactRequest } from '../../lib/contact';
import { POST_TYPE_LABELS } from '../../lib/community';
import type { CirclePost } from '../../lib/community';

interface ModerationData {
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
        setError('Autorisation privilégiée indisponible.');
        setData(null);
        return;
      }
      if (!res.ok) {
        setError('Impossible de charger la file de modération.');
        setData(null);
        return;
      }

      const payload = (await res.json()) as ModerationData;
      setData(payload);
    } catch {
      setError('Serveur injoignable.');
      setData(null);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <ContentShell>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 720 }}>
        <header style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <Eyebrow tone="accent">Équipe · modération</Eyebrow>
          <H1>File de modération</H1>
          <Lead>
            Demandes de contact et publications signalées. L’accès repose uniquement sur la session privilégiée server-side.
          </Lead>
        </header>

        <Card tone="sunk" bordered={false}>
          <P2>
            Les actions de mutation restent temporairement désactivées tant que leurs contrôles session, origine/CSRF et autorisation action-spécifique ne sont pas tous câblés.
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
