'use client';

/**
 * DÃ©clarer un contexte particulier (Sprint 03).
 * Le propriÃ©taire signale une pÃ©riode (voyage, convalescenceâ€¦) pour qu'ELI
 * Ã©largisse la tolÃ©rance des Ã©carts sur les familles concernÃ©es.
 */

import { Modal } from '@/lib/heroui-compat';
import type { CSSProperties } from 'react';
import { useState } from 'react';
import { OWNER_CONTEXTS } from '../../lib/eli/catalog';

const FIELD: CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border)',
  background: 'var(--surface)',
  fontFamily: 'var(--font-sans)',
  fontSize: 14,
  color: 'var(--fg-strong)',
};

const LABEL: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
  color: 'var(--fg-muted)',
};

export interface DeclaredContext {
  contextId: string;
  label: string;
  startDate: string;
  endDate: string;
  reason?: string;
}

export function AddContextDialog({
  isOpen,
  onClose,
  onDeclare,
}: {
  isOpen: boolean;
  onClose: () => void;
  onDeclare: (ctx: DeclaredContext) => void;
}) {
  const [contextId, setContextId] = useState(OWNER_CONTEXTS[0]!.id);
  const today = new Date().toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [reason, setReason] = useState('');

  const valid = startDate <= endDate;

  function submit() {
    if (!valid) return;
    const ctx = OWNER_CONTEXTS.find((c) => c.id === contextId)!;
    onDeclare({ contextId, label: ctx.label, startDate, endDate, reason: reason.trim() || undefined });
    setReason('');
    onClose();
  }

  return (
    <Modal isOpen={isOpen} onOpenChange={(o) => { if (!o) onClose(); }}>
      <Modal.Backdrop>
        <Modal.Container placement="center" size="md">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading style={{ fontFamily: 'var(--font-serif)', fontSize: 20, color: 'var(--fg-strong)', margin: 0 }}>
                DÃ©clarer un contexte particulier
              </Modal.Heading>
              <Modal.CloseTrigger aria-label="Fermer" />
            </Modal.Header>
            <Modal.Body>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <p style={{ margin: 0, fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.5 }}>
                  Si une pÃ©riode particuliÃ¨re survient (voyage, convalescenceâ€¦), indiquez-le pour quâ€™ELI
                  en tienne compte dans ses indicateurs.
                </p>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={LABEL}>Type de contexte</span>
                  <select value={contextId} onChange={(e) => setContextId(e.target.value)} style={FIELD}>
                    {OWNER_CONTEXTS.map((c) => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <span style={LABEL}>DÃ©but</span>
                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={FIELD} />
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <span style={LABEL}>Fin</span>
                    <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={FIELD} />
                  </label>
                </div>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={LABEL}>Note (optionnelle)</span>
                  <textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} rows={2} style={{ ...FIELD, resize: 'vertical' }} placeholder="Ex : revient de chez le vÃ©to, repos une semaine" />
                </label>
                {!valid && <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--rouge)' }}>La date de fin doit Ãªtre aprÃ¨s le dÃ©but.</span>}
              </div>
            </Modal.Body>
            <Modal.Footer>
              <button
                type="button"
                onClick={submit}
                disabled={!valid}
                style={{
                  width: '100%',
                  padding: '12px 24px',
                  borderRadius: 'var(--radius-pill)',
                  background: 'var(--terracotta-500)',
                  color: 'white',
                  border: 'none',
                  fontFamily: 'var(--font-sans)',
                  fontWeight: 600,
                  fontSize: 14,
                  opacity: valid ? 1 : 0.5,
                  cursor: valid ? 'pointer' : 'not-allowed',
                }}
              >
                Activer le contexte
              </button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

