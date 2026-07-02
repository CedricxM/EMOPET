'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Button, Card, Eyebrow, H2, Icon, Lead, P, P2 } from '../../components/ui';
import {
  cancelRequest,
  contactChannelLabel,
  contactReasonLabel,
  contactStatusLabel,
  formatSlot,
  getOwnerToken,
  loadRequests,
} from '../../lib/contact';
import type { ContactRequest } from '../../lib/contact';
import { useI18n } from '../../lib/i18n';

const STATUS_TONE: Record<string, string> = {
  pending: 'var(--orange-pro)',
  scheduled: 'var(--lichen-700)',
  completed: 'var(--granit-500)',
  cancelled: 'var(--granit-400)',
};

export function RequestHistory() {
  const [requests, setRequests] = useState<ContactRequest[]>([]);
  const { locale, t } = useI18n();

  useEffect(() => {
    let cancelled = false;
    const ownerToken = getOwnerToken();
    (async () => {
      try {
        const res = await fetch('/api/contact', { headers: ownerToken ? { 'x-contact-owner-token': ownerToken } : undefined });
        if (res.ok) {
          const data = (await res.json()) as { requests: ContactRequest[] };
          if (!cancelled) { setRequests(data.requests); return; }
        }
      } catch { /* repli local */ }
      if (!cancelled) setRequests(loadRequests());
    })();
    return () => { cancelled = true; };
  }, []);

  async function cancel(id: string) {
    const ownerToken = getOwnerToken();
    try {
      const res = await fetch(`/api/contact?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: ownerToken ? { 'x-contact-owner-token': ownerToken } : undefined,
      });
      if (res.ok) { setRequests((prev) => prev.filter((r) => r.id !== id)); return; }
    } catch { /* repli local */ }
    setRequests(cancelRequest(id));
  }

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, }}>
        <header style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <Eyebrow>{t('contact', 'requestsEyebrow')}</Eyebrow>
          <H2>{t('contact', 'requestsTitle')}</H2>
          <Lead>{t('contact', 'requestsLead')}</Lead>
        </header>

        {requests.length === 0 ? (
          <Card tone="sunk">
            <div style={{ textAlign: 'center', padding: '28px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <P2>{t('contact', 'requestsEmpty')}</P2>
              <Link href="/contact" style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--terracotta-700)', fontWeight: 600 }}>
                {t('contact', 'newRequest')}
              </Link>
            </div>
          </Card>
        ) : (
          requests.map((r) => (
            <Card key={r.id}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <Eyebrow tone="accent2">{contactReasonLabel(r.reason, locale)}</Eyebrow>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: STATUS_TONE[r.status], textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {contactStatusLabel(r.status, locale)}
                  </span>
                </div>
                <P>
                  <strong>{contactChannelLabel(r.channel, locale)}</strong> · {r.contactValue}
                </P>
                {r.message && <P2>{r.message}</P2>}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--fg-muted)' }}>{t('contact', 'proposedSlots')}</span>
                  {r.proposedSlots.map((s, i) => (
                    <span key={i} style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--fg)' }}>— {formatSlot(s, locale)}</span>
                  ))}
                </div>
                {(r.status === 'pending' || r.status === 'scheduled') && (
                  <Button kind="ghost" size="sm" leading={<Icon name="close" size={14} />} onClick={() => cancel(r.id)} style={{ alignSelf: 'flex-start' }}>
                    {t('contact', 'cancelDelete')}
                  </Button>
                )}
              </div>
            </Card>
          ))
        )}

        <P2 style={{ color: 'var(--fg-muted)' }}>
          {t('contact', 'requestsFooter')}
        </P2>
      </div>
    </>
  );
}
