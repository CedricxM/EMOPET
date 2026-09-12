'use client';

import { Modal } from '@/lib/heroui-compat';

export const PRIVACY_ERASURE_GATE = 'G-PRIV-ERASURE' as const;

export function PrivacyErasureUnavailableModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  return (
    <Modal isOpen={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <Modal.Backdrop>
        <Modal.Container placement="center" size="md">
          <Modal.Dialog>
            <Modal.Header>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    letterSpacing: '0.18em',
                    color: 'var(--rouge)',
                    textTransform: 'uppercase',
                  }}
                >
                  Confidentialité
                </span>
                <Modal.Heading
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: 22,
                    color: 'var(--fg-strong)',
                    margin: 0,
                  }}
                >
                  Effacement non disponible
                </Modal.Heading>
              </div>
              <Modal.CloseTrigger aria-label="Fermer" />
            </Modal.Header>
            <Modal.Body>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <p
                  style={{
                    margin: 0,
                    fontFamily: 'var(--font-sans)',
                    fontSize: 14,
                    color: 'var(--fg)',
                    lineHeight: 1.55,
                  }}
                >
                  Aucune donnée n&apos;a été supprimée. Cette maquette ne lance aucune opération
                  d&apos;effacement.
                </p>
                <p
                  style={{
                    margin: 0,
                    fontFamily: 'var(--font-serif)',
                    fontStyle: 'italic',
                    fontSize: 13,
                    color: 'var(--fg-2)',
                    lineHeight: 1.55,
                  }}
                >
                  L&apos;effacement de production reste désactivé tant que son périmètre, les
                  éventuelles obligations de conservation, les copies externes et les preuves de
                  propagation ne sont pas approuvés et implémentés. Aucun délai d&apos;effacement
                  n&apos;est annoncé avant cette validation.
                </p>
              </div>
            </Modal.Body>
            <Modal.Footer>
              <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    padding: '10px 18px',
                    borderRadius: 'var(--radius-pill)',
                    background: 'var(--fg-strong)',
                    color: 'var(--surface)',
                    border: 'none',
                    fontFamily: 'var(--font-sans)',
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                >
                  Fermer
                </button>
              </div>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
