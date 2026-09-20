'use client';

import { Modal } from '@/lib/heroui-compat';
import { useMemo, useState } from 'react';
import { CATEGORIES, STUDIES } from './data';
import type { CategoryId, LevelId } from './data';
import { buildMockRows } from './export';

/* ============================================================
   Modal "Voir mes données" — table scrollable
   ============================================================ */

interface ViewDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Catégorie ciblée — null pour vue d'ensemble multi-catégories. */
  focusedCategory: CategoryId | null;
  categoryState: Record<CategoryId, { on: boolean; level: LevelId }>;
}

export function ViewDataModal({
  isOpen,
  onClose,
  focusedCategory,
  categoryState: _categoryState,
}: ViewDataModalProps) {
  // Évite de regénérer 150 lignes à chaque render du parent.
  // Ne génère que quand le modal s'ouvre vraiment.
  const allRows = useMemo(() => (isOpen ? buildMockRows() : []), [isOpen]);
  const rows = focusedCategory
    ? allRows.filter((r) => r.cat === CATEGORIES.find((c) => c.id === focusedCategory)?.name)
    : allRows;

  return (
    <Modal isOpen={isOpen} onOpenChange={(o) => { if (!o) onClose(); }}>
      <Modal.Backdrop>
        <Modal.Container placement="center" size="lg">
          <Modal.Dialog>
            <Modal.Header>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.18em', color: 'var(--terracotta-700)', textTransform: 'uppercase' }}>
                  ⊙ Mes données
                </span>
                <Modal.Heading style={{ fontFamily: 'var(--font-serif)', fontSize: 22, color: 'var(--fg-strong)', margin: 0 }}>
                  {focusedCategory
                    ? CATEGORIES.find((c) => c.id === focusedCategory)?.name
                    : 'Toutes mes mesures'}
                </Modal.Heading>
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--fg-muted)' }}>
                  30 derniers jours · {rows.length} mesures
                </span>
              </div>
              <Modal.CloseTrigger aria-label="Fermer" />
            </Modal.Header>
            <Modal.Body>
              <div
                style={{
                  maxHeight: 360,
                  overflowY: 'auto',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-sans)' }}>
                  <thead style={{ background: 'var(--bg-sunk)', position: 'sticky', top: 0 }}>
                    <tr>
                      <Th>Date</Th>
                      <Th>Catégorie</Th>
                      <Th>Valeur observée</Th>
                      <Th>Niveau</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 60).map((r, i) => (
                      <tr key={i} style={{ borderTop: '1px solid var(--divider)' }}>
                        <Td mono>{r.date}</Td>
                        <Td>{r.cat}</Td>
                        <Td>{r.value}</Td>
                        <Td mono>{r.level.toUpperCase()}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p style={{ marginTop: 12, fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--fg-muted)' }}>
                Aperçu des 60 dernières mesures. Pour l'intégralité, utilise "Exporter mes données".
              </p>
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th
      style={{
        textAlign: 'left',
        padding: '8px 12px',
        fontFamily: 'var(--font-mono)',
        fontSize: 10,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        color: 'var(--fg-2)',
      }}
    >
      {children}
    </th>
  );
}
function Td({ children, mono }: { children: React.ReactNode; mono?: boolean }) {
  return (
    <td
      style={{
        padding: '8px 12px',
        fontFamily: mono ? 'var(--font-mono)' : 'var(--font-sans)',
        fontSize: 12,
        color: 'var(--fg)',
      }}
    >
      {children}
    </td>
  );
}

/* ============================================================
   Modal "Voir les utilisations" — études scientifiques
   ============================================================ */

export function UsagesModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <Modal isOpen={isOpen} onOpenChange={(o) => { if (!o) onClose(); }}>
      <Modal.Backdrop>
        <Modal.Container placement="center" size="md">
          <Modal.Dialog>
            <Modal.Header>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.18em', color: 'var(--terracotta-700)', textTransform: 'uppercase' }}>
                  ⊙* Utilisations scientifiques
                </span>
                <Modal.Heading style={{ fontFamily: 'var(--font-serif)', fontSize: 22, color: 'var(--fg-strong)', margin: 0 }}>
                  Études en cours
                </Modal.Heading>
              </div>
              <Modal.CloseTrigger aria-label="Fermer" />
            </Modal.Header>
            <Modal.Body>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 14, color: 'var(--fg-2)' }}>
                  Si tu as activé le niveau "Recherche scientifique", Capitaine contribue
                  anonymement aux études suivantes.
                </p>
                {STUDIES.map((s) => (
                  <div
                    key={s.id}
                    style={{
                      padding: 16,
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6,
                    }}
                  >
                    <h4 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 16, color: 'var(--fg-strong)' }}>
                      {s.title}
                    </h4>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.14em', color: 'var(--fg-muted)' }}>
                      {s.lab.toUpperCase()} · {s.year}
                    </span>
                    <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--fg-2)' }}>
                      {s.participants.toLocaleString('fr-FR')} chiens — <em>dont Capitaine</em>
                    </span>
                  </div>
                ))}
              </div>
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

/* ============================================================
   Modal "Supprimer mes données" — double confirmation
   ============================================================ */

export function DeleteModal({
  isOpen,
  onClose,
  onConfirmed,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirmed: () => void;
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [confirmText, setConfirmText] = useState('');

  function reset() {
    setStep(1);
    setConfirmText('');
  }

  function close() {
    reset();
    onClose();
  }

  function confirm() {
    onConfirmed();
    reset();
  }

  return (
    <Modal isOpen={isOpen} onOpenChange={(o) => { if (!o) close(); }}>
      <Modal.Backdrop>
        <Modal.Container placement="center" size="md">
          <Modal.Dialog>
            <Modal.Header>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.18em', color: 'var(--rouge)', textTransform: 'uppercase' }}>
                  ✕ Suppression
                </span>
                <Modal.Heading style={{ fontFamily: 'var(--font-serif)', fontSize: 22, color: 'var(--fg-strong)', margin: 0 }}>
                  {step === 1 ? 'Es-tu sûr·e ?' : 'Confirmer la suppression'}
                </Modal.Heading>
              </div>
              <Modal.CloseTrigger aria-label="Fermer" />
            </Modal.Header>
            <Modal.Body>
              {step === 1 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <p style={{ margin: 0, fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--fg)' }}>
                    Cette maquette <strong>simule une demande de suppression</strong> pour :
                  </p>
                  <ul style={{ margin: 0, paddingLeft: 22, listStyleType: 'disc', fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.7 }}>
                    <li>Toutes les mesures EMOPET de Capitaine (~1 247 sur 30 j)</li>
                    <li>Le profil chien et l'historique</li>
                    <li>Ton compte de la communauté Veute</li>
                  </ul>
                  <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 13, color: 'var(--fg-muted)' }}>
                    Cette simulation ne décide pas du traitement d'éventuelles contributions de recherche.
                    Leur cycle de vie dépendra des règles de conservation et d'effacement validées avant activation.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <p style={{ margin: 0, fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--fg)' }}>
                    Pour confirmer, écris <code style={{ background: 'var(--bg-sunk)', padding: '2px 8px', borderRadius: 4, fontFamily: 'var(--font-mono)' }}>SUPPRIMER</code> ci-dessous :
                  </p>
                  <input
                    type="text"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder="SUPPRIMER"
                    aria-label="Tapez SUPPRIMER en majuscules pour confirmer la suppression"
                    style={{
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-md)',
                      border: '1.5px solid var(--border-strong)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: 14,
                      letterSpacing: '0.06em',
                      background: 'var(--surface)',
                      color: 'var(--fg-strong)',
                    }}
                  />
                </div>
              )}
            </Modal.Body>
            <Modal.Footer>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', width: '100%' }}>
                <button
                  type="button"
                  onClick={close}
                  style={{
                    padding: '10px 18px',
                    borderRadius: 'var(--radius-pill)',
                    background: 'transparent',
                    color: 'var(--fg)',
                    border: '1px solid var(--border)',
                    fontFamily: 'var(--font-sans)',
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                >
                  Annuler
                </button>
                {step === 1 ? (
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    style={{
                      padding: '10px 18px',
                      borderRadius: 'var(--radius-pill)',
                      background: 'var(--rouge)',
                      color: 'white',
                      border: 'none',
                      fontFamily: 'var(--font-sans)',
                      fontWeight: 600,
                      fontSize: 13,
                      cursor: 'pointer',
                    }}
                  >
                    Continuer
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={confirm}
                    disabled={confirmText.trim().toUpperCase() !== 'SUPPRIMER'}
                    style={{
                      padding: '10px 18px',
                      borderRadius: 'var(--radius-pill)',
                      background: confirmText.trim().toUpperCase() === 'SUPPRIMER' ? 'var(--rouge)' : 'var(--cream-300)',
                      color: confirmText.trim().toUpperCase() === 'SUPPRIMER' ? 'white' : 'var(--fg-muted)',
                      border: 'none',
                      fontFamily: 'var(--font-sans)',
                      fontWeight: 600,
                      fontSize: 13,
                      cursor: confirmText.trim().toUpperCase() === 'SUPPRIMER' ? 'pointer' : 'not-allowed',
                    }}
                  >
                    Simuler la confirmation
                  </button>
                )}
              </div>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

/* ============================================================
   Modal "Suppression effectuée" — toast simple
   ============================================================ */

export function DeletedToastModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <Modal isOpen={isOpen} onOpenChange={(o) => { if (!o) onClose(); }}>
      <Modal.Backdrop>
        <Modal.Container placement="center" size="sm">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading style={{ fontFamily: 'var(--font-serif)', fontSize: 18, color: 'var(--fg-strong)', margin: 0 }}>
                ⊙ Suppression simulée
              </Modal.Heading>
              <Modal.CloseTrigger aria-label="Fermer" />
            </Modal.Header>
            <Modal.Body>
              <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 14, color: 'var(--fg-2)', lineHeight: 1.5 }}>
                Maquette uniquement — aucune demande d'effacement n'a été envoyée et aucune donnée
                n'a été supprimée. Les délais, la propagation et le traitement d'éventuelles
                contributions de recherche seront définis et validés avant activation.
              </p>
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

/* ============================================================
   Modal "Choisir le format d'export"
   ============================================================ */

export function ExportModal({
  isOpen,
  onClose,
  onExport,
}: {
  isOpen: boolean;
  onClose: () => void;
  onExport: (format: 'csv' | 'json') => void;
}) {
  return (
    <Modal isOpen={isOpen} onOpenChange={(o) => { if (!o) onClose(); }}>
      <Modal.Backdrop>
        <Modal.Container placement="center" size="sm">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading style={{ fontFamily: 'var(--font-serif)', fontSize: 20, color: 'var(--fg-strong)', margin: 0 }}>
                ↓ Exporter mes données
              </Modal.Heading>
              <Modal.CloseTrigger aria-label="Fermer" />
            </Modal.Header>
            <Modal.Body>
              <p style={{ margin: '0 0 14px 0', fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--fg-2)' }}>
                Choisis le format. Le fichier sera téléchargé immédiatement.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <FormatButton label="CSV" hint="tableur · Excel" onClick={() => { onExport('csv'); onClose(); }} />
                <FormatButton label="JSON" hint="structuré · code" onClick={() => { onExport('json'); onClose(); }} />
              </div>
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

function FormatButton({ label, hint, onClick }: { label: string; hint: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '14px 16px',
        borderRadius: 'var(--radius-md)',
        background: 'var(--surface-2)',
        border: '1px solid var(--border)',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        textAlign: 'left',
      }}
    >
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 700, color: 'var(--terracotta-700)' }}>
        {label}
      </span>
      <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: 'var(--fg-muted)' }}>{hint}</span>
    </button>
  );
}

