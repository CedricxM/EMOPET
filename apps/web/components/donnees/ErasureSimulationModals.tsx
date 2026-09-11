'use client';

import { useState } from 'react';
import { Modal } from '@/lib/heroui-compat';

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
                  ✕ Simulation d’effacement
                </span>
                <Modal.Heading style={{ fontFamily: 'var(--font-serif)', fontSize: 22, color: 'var(--fg-strong)', margin: 0 }}>
                  {step === 1 ? 'Prévisualiser la demande' : 'Simuler la confirmation'}
                </Modal.Heading>
              </div>
              <Modal.CloseTrigger aria-label="Fermer" />
            </Modal.Header>
            <Modal.Body>
              {step === 1 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <p style={{ margin: 0, fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--fg)' }}>
                    Cette interface est une <strong>maquette non destructive</strong>. Aucune donnée ne sera supprimée par cette interaction.
                  </p>
                  <p style={{ margin: 0, fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.6 }}>
                    Un futur parcours d’effacement devra traiter, selon la politique PRIV-01 approuvée, les catégories concernées telles que :
                  </p>
                  <ul style={{ margin: 0, paddingLeft: 22, listStyleType: 'disc', fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.7 }}>
                    <li>les mesures et historiques liés au chien ;</li>
                    <li>le profil chien et ses données dérivées ;</li>
                    <li>les données de compte et les contributions communautaires applicables.</li>
                  </ul>
                  <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 13, color: 'var(--fg-muted)' }}>
                    Le traitement des contributions publiques, de recherche, des sauvegardes et des éventuelles exceptions de conservation reste à définir et à approuver. Cette maquette ne fixe ni délai ni résultat juridique.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <p style={{ margin: 0, fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--fg)' }}>
                    Pour tester l’étape de confirmation, écris <code style={{ background: 'var(--bg-sunk)', padding: '2px 8px', borderRadius: 4, fontFamily: 'var(--font-mono)' }}>SUPPRIMER</code> ci-dessous. Cela ne déclenche aucun effacement réel.
                  </p>
                  <input
                    type="text"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder="SUPPRIMER"
                    aria-label="Tapez SUPPRIMER en majuscules pour simuler la confirmation d’effacement"
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
                    Continuer la simulation
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

export function DeletedToastModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <Modal isOpen={isOpen} onOpenChange={(o) => { if (!o) onClose(); }}>
      <Modal.Backdrop>
        <Modal.Container placement="center" size="sm">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading style={{ fontFamily: 'var(--font-serif)', fontSize: 18, color: 'var(--fg-strong)', margin: 0 }}>
                ⊙ Simulation terminée
              </Modal.Heading>
              <Modal.CloseTrigger aria-label="Fermer" />
            </Modal.Header>
            <Modal.Body>
              <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 14, color: 'var(--fg-2)', lineHeight: 1.5 }}>
                Aucune donnée n’a été supprimée. L’effacement réel reste indisponible tant que PRIV-01 n’a pas défini et fait approuver le périmètre, les exceptions, les fournisseurs et les règles de sauvegarde. Aucun délai de suppression n’est annoncé par cette maquette.
              </p>
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
