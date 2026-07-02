'use client';

import { Modal } from '@/lib/heroui-compat';
import type { City, Lighthouse } from './data';
import { DOGS_BY_CITY } from './data';
import { CityPicto } from './pictograms';

/**
 * Modal de ville (Ã‰tape 5).
 *
 * Contient : illustration picto agrandie, nom, nombre de chiens EMOPET,
 * mention d'Ã©vÃ©nement le cas Ã©chÃ©ant, CTA "Rejoindre la veute locale".
 */
export function CityModal({
  city,
  onClose,
}: {
  city: City | null;
  onClose: () => void;
}) {
  const open = city !== null;
  const dogs = city ? DOGS_BY_CITY[city.id] : null;
  return (
    <Modal isOpen={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <Modal.Backdrop>
        <Modal.Container placement="center" size="md">
          <Modal.Dialog>
            {city && (
              <>
                <Modal.Header>
                  <Modal.Heading style={{ fontFamily: 'var(--font-serif)', fontSize: 22, color: 'var(--fg-strong)', margin: 0 }}>
                    {city.name}
                  </Modal.Heading>
                  <Modal.CloseTrigger aria-label="Fermer" />
                </Modal.Header>
                <Modal.Body>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {/* Mini-illustration : picto agrandi */}
                    <div
                      style={{
                        alignSelf: 'center',
                        width: 96,
                        height: 96,
                        background: 'var(--cream-100)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <svg width="64" height="64" viewBox="0 0 80 80" aria-hidden>
                        <CityPicto x={40} y={70} kind={city.picto} size={56} />
                      </svg>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.18em', color: 'var(--terracotta-700)', textTransform: 'uppercase' }}>
                        âŠ™ DÃ©partement {city.dept}
                      </span>
                      <p style={{ margin: 0, fontFamily: 'var(--font-sans)', color: 'var(--fg)' }}>
                        <strong style={{ fontFamily: 'var(--font-serif)', fontSize: 18, color: 'var(--fg-strong)' }}>
                          {dogs?.count ?? 0}
                        </strong>{' '}
                        chiens EMOPET dans cette ville{dogs?.hasActive ? ' â€” dont Capitaine' : ''}.
                      </p>
                    </div>

                    {dogs?.hasEvent && (
                      <div
                        style={{
                          padding: 14,
                          background: 'var(--prudence-bg)',
                          borderLeft: '6px solid var(--terracotta-500)',
                          borderRadius: 'var(--radius-sm)',
                          color: 'var(--prudence-ink)',
                          fontFamily: 'var(--font-sans)',
                          fontSize: 13,
                        }}
                      >
                        <strong style={{ fontFamily: 'var(--font-serif)' }}>Balade aux GlÃ©nan</strong> Â· Dimanche 25 mai 10h Â· 12 inscrits.
                      </div>
                    )}

                    <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 15, color: 'var(--fg-2)', lineHeight: 1.5 }}>
                      Rejoins la veute locale : balades collectives, Ã©changes avec d'autres
                      propriÃ©taires{city.dept === '56' || city.dept === '29' ? ' bretons' : ''}, observations comparÃ©es.
                    </p>
                  </div>
                </Modal.Body>
                <Modal.Footer>
                  <button
                    type="button"
                    onClick={onClose}
                    style={{
                      padding: '12px 24px',
                      borderRadius: 'var(--radius-pill)',
                      background: 'var(--terracotta-500)',
                      color: 'white',
                      border: 'none',
                      fontFamily: 'var(--font-sans)',
                      fontWeight: 600,
                      fontSize: 14,
                      letterSpacing: '0.04em',
                      cursor: 'pointer',
                      width: '100%',
                    }}
                  >
                    Rejoindre la veute locale
                  </button>
                </Modal.Footer>
              </>
            )}
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

/**
 * Modal phare â€” minimal, faÃ§on tooltip enrichi.
 */
export function LighthouseModal({
  lighthouse,
  onClose,
}: {
  lighthouse: Lighthouse | null;
  onClose: () => void;
}) {
  const open = lighthouse !== null;
  return (
    <Modal isOpen={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <Modal.Backdrop>
        <Modal.Container placement="center" size="sm">
          <Modal.Dialog>
            {lighthouse && (
              <>
                <Modal.Header>
                  <Modal.Heading style={{ fontFamily: 'var(--font-serif)', fontSize: 18, color: 'var(--fg-strong)', margin: 0 }}>
                    {lighthouse.name}
                  </Modal.Heading>
                  <Modal.CloseTrigger aria-label="Fermer" />
                </Modal.Header>
                <Modal.Body>
                  <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 15, color: 'var(--fg-2)', lineHeight: 1.5 }}>
                    {lighthouse.caption}
                  </p>
                </Modal.Body>
              </>
            )}
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

/**
 * Modal dÃ©taillÃ©e de l'Ã©vÃ©nement Balade aux GlÃ©nan (Concarneau).
 */
export function EventModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  return (
    <Modal isOpen={isOpen} onOpenChange={(o) => { if (!o) onClose(); }}>
      <Modal.Backdrop>
        <Modal.Container placement="center" size="md">
          <Modal.Dialog>
            <Modal.Header>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.18em', color: 'var(--terracotta-700)', textTransform: 'uppercase' }}>
                  âŠ™ Ã‰vÃ©nement
                </span>
                <Modal.Heading style={{ fontFamily: 'var(--font-serif)', fontSize: 22, color: 'var(--fg-strong)', margin: 0 }}>
                  Balade aux GlÃ©nan
                </Modal.Heading>
              </div>
              <Modal.CloseTrigger aria-label="Fermer" />
            </Modal.Header>
            <Modal.Body>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <ul
                  style={{
                    listStyle: 'none',
                    padding: 0,
                    margin: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                  }}
                >
                  <DetailRow label="Quand"    value="Dimanche 25 mai Â· 10h" />
                  <DetailRow label="OÃ¹"       value="Port de Concarneau (29)" />
                  <DetailRow label="Inscrits" value="12 propriÃ©taires" />
                  <DetailRow label="Tarif"    value="Gratuit" />
                </ul>
                <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 14, color: 'var(--fg-2)', lineHeight: 1.5 }}>
                  Sortie en mer accompagnÃ©e d'un Ã©ducateur canin. DÃ©couverte de l'archipel
                  des GlÃ©nan en compagnie d'autres labradors, border collies et golden de
                  la veute morbihannaise.
                </p>
              </div>
            </Modal.Body>
            <Modal.Footer>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '12px 24px',
                  borderRadius: 'var(--radius-pill)',
                  background: 'var(--terracotta-500)',
                  color: 'white',
                  border: 'none',
                  fontFamily: 'var(--font-sans)',
                  fontWeight: 600,
                  fontSize: 14,
                  letterSpacing: '0.04em',
                  cursor: 'pointer',
                  width: '100%',
                }}
              >
                M'inscrire Ã  la balade
              </button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <li style={{ display: 'flex', gap: 12, alignItems: 'baseline' }}>
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: 'var(--fg-muted)',
          minWidth: 80,
        }}
      >
        {label}
      </span>
      <span style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--fg-strong)' }}>{value}</span>
    </li>
  );
}

