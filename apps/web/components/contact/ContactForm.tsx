'use client';

/**
 * Formulaire de demande de contact humain (sobre : demande + planification).
 * Étapes : canal → motif → créneaux → coordonnée → consentement.
 * Mention non médicale visible ; envoi bloqué tant que le consentement
 * n'est pas explicitement coché. Primitives maison + tokens emopet.
 */

import type { CSSProperties } from 'react';
import { useState } from 'react';
import { Button, Card, Eyebrow, Icon, P2 } from '../ui';
import {
  REASON_LABELS,
  contactChannelLabel,
  contactReasonLabel,
  createRequest,
  getOwnerToken,
} from '../../lib/contact';
import type { ContactChannel, ContactReason, TimeSlot } from '../../lib/contact';
import { useI18n } from '../../lib/i18n';

const FIELD: CSSProperties = {
  width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)',
  background: 'var(--surface)', fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--fg-strong)',
};
const LABEL: CSSProperties = {
  fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--fg-muted)',
};

function emptySlot(): TimeSlot {
  return { start: '', end: '' };
}

export function ContactForm({ onCreated }: { onCreated?: () => void }) {
  const { locale, t } = useI18n();
  const [channel, setChannel] = useState<ContactChannel>('phone');
  const [reason, setReason] = useState<ContactReason>('retour_experience');
  const [contactValue, setContactValue] = useState('');
  const [message, setMessage] = useState('');
  const [slots, setSlots] = useState<TimeSlot[]>([emptySlot()]);
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [done, setDone] = useState(false);

  function setSlot(i: number, key: 'start' | 'end', val: string) {
    setSlots((prev) => prev.map((s, idx) => (idx === i ? { ...s, [key]: val } : s)));
  }

  async function submit() {
    const cleanSlots = slots
      .filter((s) => s.start && s.end)
      .map((s) => ({ start: new Date(s.start).toISOString(), end: new Date(s.end).toISOString() }));
    const input = {
      channel,
      reason,
      message,
      contactValue,
      proposedSlots: cleanSlots,
      consentGiven: consent,
      ownerToken: getOwnerToken(),
    };

    // Persistance SERVEUR d'abord (R3) ; repli localStorage si la route échoue.
    try {
      const res = await fetch('/api/contact', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(input) });
      const data = (await res.json()) as { ok: boolean; errors?: string[] };
      if (res.ok && data.ok) { setDone(true); setErrors([]); onCreated?.(); return; }
      if (data.errors && data.errors.length) { setErrors(data.errors); return; }
    } catch {
      /* route indisponible → repli local */
    }
    const local = createRequest(input);
    if (local.ok) { setDone(true); setErrors([]); onCreated?.(); }
    else setErrors(local.errors);
  }

  if (done) {
    return (
      <Card tone="accent2Soft">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 8 }}>
          <Eyebrow tone="accent2">✓</Eyebrow>
          <P2 style={{ color: 'var(--lichen-700)' }}>
            {t('contact', 'confirmation')}
          </P2>
        </div>
      </Card>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Mention non médicale — visible avant tout */}
      <div style={{ padding: 14, background: 'var(--prudence-bg)', borderLeft: '6px solid var(--terracotta-500)', borderRadius: 'var(--radius-sm)' }}>
        <P2 style={{ color: 'var(--prudence-ink)' }}>
          {t('contact', 'medicalNotice')}
        </P2>
      </div>

      {/* Canal */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span style={LABEL}>{t('contact', 'channel')}</span>
        <div style={{ display: 'flex', gap: 10 }}>
          {(['phone', 'video'] as ContactChannel[]).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => { setChannel(c); setContactValue(''); }}
              aria-pressed={channel === c}
              style={{
                flex: 1, padding: '12px', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                border: `1.5px solid ${channel === c ? 'var(--terracotta-500)' : 'var(--border)'}`,
                background: channel === c ? 'var(--accent-soft)' : 'var(--surface)',
                fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 600,
                color: channel === c ? 'var(--accent-press)' : 'var(--fg)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              <Icon name={c === 'phone' ? 'phone' : 'chat'} size={16} /> {contactChannelLabel(c, locale)}
            </button>
          ))}
        </div>
      </div>

      {/* Motif (jamais une demande vétérinaire) */}
      <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={LABEL}>{t('contact', 'reason')}</span>
        <select value={reason} onChange={(e) => setReason(e.target.value as ContactReason)} style={FIELD}>
          {(Object.keys(REASON_LABELS) as ContactReason[]).map((r) => (
            <option key={r} value={r}>{contactReasonLabel(r, locale)}</option>
          ))}
        </select>
      </label>

      {/* Coordonnée */}
      <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={LABEL}>{channel === 'phone' ? t('contact', 'contactPhone') : t('contact', 'contactEmail')}</span>
        <input
          value={contactValue}
          onChange={(e) => setContactValue(e.target.value)}
          inputMode={channel === 'phone' ? 'tel' : 'email'}
          placeholder={channel === 'phone' ? '+33 6 12 34 56 78' : 'vous@exemple.fr'}
          style={FIELD}
        />
      </label>

      {/* Créneaux */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span style={LABEL}>{t('contact', 'slots')}</span>
        {slots.map((s, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="datetime-local" value={s.start} onChange={(e) => setSlot(i, 'start', e.target.value)} style={{ ...FIELD, flex: 1 }} aria-label={`Début créneau ${i + 1}`} />
            <span style={{ color: 'var(--fg-muted)' }}>→</span>
            <input type="datetime-local" value={s.end} onChange={(e) => setSlot(i, 'end', e.target.value)} style={{ ...FIELD, flex: 1 }} aria-label={`Fin créneau ${i + 1}`} />
            {slots.length > 1 && (
              <button type="button" onClick={() => setSlots((p) => p.filter((_, idx) => idx !== i))} aria-label="Retirer ce créneau" style={{ background: 'none', border: 'none', color: 'var(--fg-muted)', cursor: 'pointer' }}>
                <Icon name="close" size={16} />
              </button>
            )}
          </div>
        ))}
        {slots.length < 5 && (
          <button type="button" onClick={() => setSlots((p) => [...p, emptySlot()])} style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--terracotta-700)', fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            <Icon name="plus" size={14} /> {t('contact', 'addSlot')}
          </button>
        )}
      </div>

      {/* Message libre */}
      <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={LABEL}>{t('contact', 'details')}</span>
        <textarea value={message} onChange={(e) => setMessage(e.target.value.slice(0, 500))} rows={3} style={{ ...FIELD, resize: 'vertical' }} placeholder="Ce dont vous aimeriez parler…" />
      </label>

      {/* Consentement RGPD */}
      <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer', padding: 12, background: 'var(--bg-sunk)', borderRadius: 'var(--radius-sm)' }}>
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} style={{ marginTop: 3 }} />
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.5 }}>
          {t('contact', 'consent')}
        </span>
      </label>

      {errors.length > 0 && (
        <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--rouge)', fontFamily: 'var(--font-sans)', fontSize: 13 }}>
          {errors.map((e) => <li key={e}>{e}</li>)}
        </ul>
      )}

      <Button kind="primary" onClick={submit} style={{ alignSelf: 'flex-start', opacity: consent ? 1 : 0.6 }} disabled={!consent}>
        {t('contact', 'submit')}
      </Button>
    </div>
  );
}
