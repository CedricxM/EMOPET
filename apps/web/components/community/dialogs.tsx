'use client';

/**
 * Modals de la communautÃ© (Sprint 04). Style alignÃ© sur les autres modals
 * (HeroUI compound + inline-styles tokens).
 */

import { Modal } from '@/lib/heroui-compat';
import type { CSSProperties } from 'react';
import { useState } from 'react';
import {
  CHARTER_RULES,
  EVENT_TYPE_LABELS,
  POST_TYPE_LABELS,
  containsForbiddenContent,
} from '../../lib/community';
import type { Circle, CirclePostType, EventType } from '../../lib/community';

const FIELD: CSSProperties = {
  width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)',
  background: 'var(--surface)', fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--fg-strong)',
};
const LABEL: CSSProperties = {
  fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--fg-muted)',
};
const PRIMARY: CSSProperties = {
  width: '100%', padding: '12px 24px', borderRadius: 'var(--radius-pill)', background: 'var(--terracotta-500)',
  color: 'white', border: 'none', fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 14, cursor: 'pointer',
};

function Heading({ kicker, title }: { kicker?: string; title: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
      {kicker && <span style={{ ...LABEL, color: 'var(--terracotta-700)' }}>{kicker}</span>}
      <Modal.Heading style={{ fontFamily: 'var(--font-serif)', fontSize: 21, color: 'var(--fg-strong)', margin: 0 }}>{title}</Modal.Heading>
    </div>
  );
}

function Shell({ isOpen, onClose, children, size = 'md' }: { isOpen: boolean; onClose: () => void; children: React.ReactNode; size?: 'sm' | 'md' }) {
  return (
    <Modal isOpen={isOpen} onOpenChange={(o) => { if (!o) onClose(); }}>
      <Modal.Backdrop>
        <Modal.Container placement="center" size={size}>
          <Modal.Dialog>{children}</Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

/* ---------------- Rejoindre un cercle (RGPD) ---------------- */

export function CircleJoinDialog({
  circle, isOpen, onClose, onJoin, onOpenCharter,
}: {
  circle: Circle; isOpen: boolean; onClose: () => void; onJoin: (displayName: string) => void; onOpenCharter: () => void;
}) {
  const [displayName, setDisplayName] = useState('');
  const [consent, setConsent] = useState(false);
  const valid = consent && displayName.trim().length >= 2;

  return (
    <Shell isOpen={isOpen} onClose={onClose}>
      <Modal.Header><Heading title={`Rejoindre ${circle.name}`} /><Modal.CloseTrigger aria-label="Fermer" /></Modal.Header>
      <Modal.Body>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={LABEL}>Votre prÃ©nom (visible par les membres)</span>
            <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={80} style={FIELD} placeholder="Camille" />
          </label>
          <div style={{ background: 'var(--prudence-bg)', borderRadius: 'var(--radius-md)', padding: 14 }}>
            <p style={{ margin: 0, fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--prudence-ink)', fontWeight: 600 }}>Ce que les membres verront :</p>
            <ul style={{ margin: '8px 0 0', paddingLeft: 18, fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--prudence-ink)', lineHeight: 1.6 }}>
              <li>Votre prÃ©nom choisi ci-dessus</li>
              <li>Votre ville ({circle.city}), jamais votre adresse exacte</li>
              <li>Vos publications et participations aux Ã©vÃ©nements</li>
            </ul>
            <p style={{ margin: '8px 0 0', fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--prudence-ink)' }}>
              Jamais partagÃ©s : votre position GPS exacte, les donnÃ©es de bien-Ãªtre de votre chien, votre email.
            </p>
          </div>
          <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer' }}>
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} style={{ marginTop: 3 }} />
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.5 }}>
              Jâ€™accepte la{' '}
              <button type="button" onClick={onOpenCharter} style={{ background: 'none', border: 'none', padding: 0, color: 'var(--terracotta-700)', textDecoration: 'underline', cursor: 'pointer', font: 'inherit' }}>charte communautaire</button>
              {' '}et le partage de mon prÃ©nom et ma ville avec les membres du cercle.
            </span>
          </label>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <button type="button" disabled={!valid} onClick={() => onJoin(displayName.trim())} style={{ ...PRIMARY, opacity: valid ? 1 : 0.5, cursor: valid ? 'pointer' : 'not-allowed' }}>
          Rejoindre le cercle
        </button>
      </Modal.Footer>
    </Shell>
  );
}

/* ---------------- CrÃ©er un post ---------------- */

export function CreatePostDialog({
  circleName, isOpen, onClose, onCreate,
}: {
  circleName: string; isOpen: boolean; onClose: () => void;
  onCreate: (input: { type: CirclePostType; title?: string; content: string }) => void;
}) {
  const [type, setType] = useState<CirclePostType>('discussion');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const valid = content.trim().length >= 5;

  function submit() {
    if (!valid) return;
    const check = containsForbiddenContent(`${title} ${content}`);
    if (check.blocked) { setError(check.reason ?? 'Contenu non autorisÃ©.'); return; }
    onCreate({ type, title: title.trim() || undefined, content: content.trim() });
    setType('discussion'); setTitle(''); setContent(''); setError(null);
  }

  return (
    <Shell isOpen={isOpen} onClose={onClose}>
      <Modal.Header><Heading kicker={`âŠ™ ${circleName}`} title="Nouvelle publication" /><Modal.CloseTrigger aria-label="Fermer" /></Modal.Header>
      <Modal.Body>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={LABEL}>Type</span>
            <select value={type} onChange={(e) => setType(e.target.value as CirclePostType)} style={FIELD}>
              {(Object.keys(POST_TYPE_LABELS) as CirclePostType[]).map((t) => <option key={t} value={t}>{POST_TYPE_LABELS[t]}</option>)}
            </select>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={LABEL}>Titre (optionnel)</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} style={FIELD} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={LABEL}>Message</span>
            <textarea value={content} onChange={(e) => { setContent(e.target.value); setError(null); }} maxLength={2000} rows={4} style={{ ...FIELD, resize: 'vertical' }} placeholder="Votre question ou messageâ€¦" />
          </label>
          {error && <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--rouge)' }}>{error}</span>}
        </div>
      </Modal.Body>
      <Modal.Footer>
        <button type="button" disabled={!valid} onClick={submit} style={{ ...PRIMARY, opacity: valid ? 1 : 0.5, cursor: valid ? 'pointer' : 'not-allowed' }}>Publier</button>
      </Modal.Footer>
    </Shell>
  );
}

/* ---------------- CrÃ©er un Ã©vÃ©nement ---------------- */

export function CreateEventDialog({
  circle, isOpen, onClose, onCreate,
}: {
  circle: Circle; isOpen: boolean; onClose: () => void;
  onCreate: (input: { type: EventType; title: string; description?: string; startsAt: string; meetingPointName: string }) => void;
}) {
  const [type, setType] = useState<EventType>('balade');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [meetingPointName, setMeetingPointName] = useState(`Centre-ville, ${circle.city}`);
  const valid = title.trim().length >= 3 && startsAt.length > 0;

  function submit() {
    if (!valid) return;
    onCreate({ type, title: title.trim(), description: description.trim() || undefined, startsAt: new Date(startsAt).toISOString(), meetingPointName: meetingPointName.trim() });
    setTitle(''); setDescription(''); setStartsAt('');
  }

  return (
    <Shell isOpen={isOpen} onClose={onClose}>
      <Modal.Header><Heading kicker={`âŠ™ ${circle.name}`} title="Organiser un Ã©vÃ©nement" /><Modal.CloseTrigger aria-label="Fermer" /></Modal.Header>
      <Modal.Body>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={LABEL}>Type</span>
            <select value={type} onChange={(e) => setType(e.target.value as EventType)} style={FIELD}>
              {(Object.keys(EVENT_TYPE_LABELS) as EventType[]).map((t) => <option key={t} value={t}>{EVENT_TYPE_LABELS[t]}</option>)}
            </select>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={LABEL}>Titre</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} style={FIELD} placeholder="Ex : Balade au golfe" />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={LABEL}>Date & heure</span>
            <input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} style={FIELD} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={LABEL}>Point de RDV (apparaÃ®t sur la carte)</span>
            <input value={meetingPointName} onChange={(e) => setMeetingPointName(e.target.value)} maxLength={200} style={FIELD} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={LABEL}>Description (optionnelle)</span>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} rows={2} style={{ ...FIELD, resize: 'vertical' }} />
          </label>
          <p style={{ margin: 0, fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--fg-muted)' }}>
            Le point de RDV sera ajoutÃ© Ã  la carte de Bretagne (Veute) comme Ã©vÃ©nement Ã  venir.
          </p>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <button type="button" disabled={!valid} onClick={submit} style={{ ...PRIMARY, opacity: valid ? 1 : 0.5, cursor: valid ? 'pointer' : 'not-allowed' }}>CrÃ©er lâ€™Ã©vÃ©nement</button>
      </Modal.Footer>
    </Shell>
  );
}

/* ---------------- Signaler ---------------- */

const REPORT_REASONS: Array<{ id: string; label: string }> = [
  { id: 'inapproprie', label: 'Contenu inappropriÃ©' },
  { id: 'spam', label: 'Spam' },
  { id: 'inexact', label: 'Information inexacte' },
  { id: 'doublon', label: 'Doublon' },
];

export function ReportDialog({ isOpen, onClose, onReport }: { isOpen: boolean; onClose: () => void; onReport: (reason: string) => void }) {
  const [reason, setReason] = useState(REPORT_REASONS[0]!.id);
  return (
    <Shell isOpen={isOpen} onClose={onClose} size="sm">
      <Modal.Header><Heading title="Signaler ce contenu" /><Modal.CloseTrigger aria-label="Fermer" /></Modal.Header>
      <Modal.Body>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={LABEL}>Motif</span>
          <select value={reason} onChange={(e) => setReason(e.target.value)} style={FIELD}>
            {REPORT_REASONS.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
          </select>
        </label>
        <p style={{ margin: '12px 0 0', fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--fg-muted)' }}>
          Un contenu signalÃ© plusieurs fois est masquÃ© automatiquement et passe en revue de modÃ©ration.
        </p>
      </Modal.Body>
      <Modal.Footer>
        <button type="button" onClick={() => onReport(reason)} style={PRIMARY}>Envoyer le signalement</button>
      </Modal.Footer>
    </Shell>
  );
}

/* ---------------- Charte ---------------- */

export function CommunityCharterModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <Shell isOpen={isOpen} onClose={onClose}>
      <Modal.Header><Heading kicker="âŠ™ CommunautÃ© Breiz" title="Charte communautaire" /><Modal.CloseTrigger aria-label="Fermer" /></Modal.Header>
      <Modal.Body>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {CHARTER_RULES.map((r, i) => (
            <div key={r.title} style={{ display: 'flex', gap: 12 }}>
              <span style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 22, color: 'var(--terracotta-500)', minWidth: 28 }}>{String(i + 1).padStart(2, '0')}</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontFamily: 'var(--font-serif)', fontSize: 16, color: 'var(--fg-strong)' }}>{r.title}</span>
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.5 }}>{r.text}</span>
              </div>
            </div>
          ))}
        </div>
      </Modal.Body>
    </Shell>
  );
}

