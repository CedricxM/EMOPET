'use client';

/**
 * Modals des spots communautaires (Sprint 01 â€” Couche B).
 *
 * - SpotDetailModal : fiche d'un spot + statistiques + itinÃ©raire + commentaires.
 * - AddSpotModal    : formulaire d'ajout (catÃ©gorie, nom, description, anonymat).
 *
 * Style alignÃ© sur `modals.tsx` (HeroUI Modal compound + inline-styles tokens).
 * âš  Invariants : aucun terme mÃ©dical/Ã©motionnel dans les libellÃ©s.
 */

import { Modal } from '@/lib/heroui-compat';
import { useState } from 'react';
import type { CommunitySpot, SpotCategory } from './spots';
import { SPOT_CATEGORIES, categoryMeta } from './spots';

const FIELD_STYLE: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border)',
  background: 'var(--surface)',
  fontFamily: 'var(--font-sans)',
  fontSize: 14,
  color: 'var(--fg-strong)',
};

const LABEL_STYLE: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
  color: 'var(--fg-muted)',
};

const PRIMARY_BTN: React.CSSProperties = {
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
};

function CategoryDot({ color }: { color: string }) {
  return (
    <span
      aria-hidden
      style={{
        display: 'inline-block',
        width: 10,
        height: 10,
        borderRadius: '50%',
        background: color,
        border: '1px solid var(--granit-900)',
        flexShrink: 0,
      }}
    />
  );
}

function Stars({ rating }: { rating: number | null }) {
  if (rating == null) return null;
  const rounded = Math.round(rating);
  return (
    <span aria-label={`Note moyenne ${rating.toFixed(1)} sur 5`} style={{ color: 'var(--terracotta-500)', letterSpacing: '0.08em' }}>
      {'â˜…'.repeat(rounded)}
      <span style={{ color: 'var(--fg-hint)' }}>{'â˜…'.repeat(5 - rounded)}</span>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Fiche dÃ©tail d'un spot                                              */
/* ------------------------------------------------------------------ */

export function SpotDetailModal({
  spot,
  onClose,
  onAddComment,
  onFlag,
}: {
  spot: CommunitySpot | null;
  onClose: () => void;
  onAddComment: (spotId: string, content: string) => void;
  onFlag: (spotId: string) => void;
}) {
  const [draft, setDraft] = useState('');
  const open = spot !== null;
  const meta = spot ? categoryMeta(spot.category) : null;

  function submitComment() {
    if (!spot) return;
    const trimmed = draft.trim();
    if (trimmed.length < 5) return;
    onAddComment(spot.id, trimmed);
    setDraft('');
  }

  const directionsHref = spot
    ? `https://www.google.com/maps/dir/?api=1&destination=${spot.lat},${spot.lon}`
    : '#';

  return (
    <Modal isOpen={open} onOpenChange={(o) => { if (!o) { setDraft(''); onClose(); } }}>
      <Modal.Backdrop>
        <Modal.Container placement="center" size="md">
          <Modal.Dialog>
            {spot && meta && (
              <>
                <Modal.Header>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, ...LABEL_STYLE, color: 'var(--terracotta-700)' }}>
                      <CategoryDot color={meta.color} /> {meta.label}
                    </span>
                    <Modal.Heading style={{ fontFamily: 'var(--font-serif)', fontSize: 22, color: 'var(--fg-strong)', margin: 0 }}>
                      {spot.name}
                    </Modal.Heading>
                  </div>
                  <Modal.CloseTrigger aria-label="Fermer" />
                </Modal.Header>
                <Modal.Body>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {/* Stats */}
                    <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--fg-2)' }}>
                      <span><strong style={{ color: 'var(--fg-strong)' }}>{spot.visitCount}</strong> visites</span>
                      <span><strong style={{ color: 'var(--fg-strong)' }}>{spot.comments.length}</strong> commentaire{spot.comments.length > 1 ? 's' : ''}</span>
                      {spot.averageRating != null && (
                        <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                          <Stars rating={spot.averageRating} /> {spot.averageRating.toFixed(1)}
                        </span>
                      )}
                    </div>

                    <p style={{ margin: 0, fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--fg)', lineHeight: 1.6 }}>
                      {spot.description}
                    </p>

                    <a
                      href={directionsHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        alignSelf: 'flex-start',
                        padding: '8px 16px',
                        borderRadius: 'var(--radius-pill)',
                        border: '1.5px solid var(--cream-400)',
                        color: 'var(--fg-strong)',
                        textDecoration: 'none',
                        fontFamily: 'var(--font-sans)',
                        fontSize: 13,
                        fontWeight: 600,
                      }}
                    >
                      ItinÃ©raire â†—
                    </a>

                    {/* Commentaires */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, borderTop: '1px solid var(--divider)', paddingTop: 14 }}>
                      <span style={LABEL_STYLE}>âŠ™ Retours de la veute</span>
                      {spot.comments.length === 0 && (
                        <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 14, color: 'var(--fg-muted)' }}>
                          Aucun commentaire pour lâ€™instant. Soyez le premier Ã  partager votre retour.
                        </p>
                      )}
                      {spot.comments.map((c) => (
                        <div key={c.id} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                            <strong style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--fg-strong)' }}>{c.authorName}</strong>
                            {c.rating != null && <Stars rating={c.rating} />}
                          </div>
                          <p style={{ margin: 0, fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--fg)', lineHeight: 1.5 }}>{c.content}</p>
                        </div>
                      ))}

                      {/* Ajout commentaire */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                        <textarea
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                          maxLength={500}
                          rows={2}
                          placeholder="Partager un retour (5 Ã  500 caractÃ¨res)â€¦"
                          aria-label="Votre commentaire"
                          style={{ ...FIELD_STYLE, resize: 'vertical' }}
                        />
                        <button
                          type="button"
                          onClick={submitComment}
                          disabled={draft.trim().length < 5}
                          style={{
                            ...PRIMARY_BTN,
                            alignSelf: 'flex-end',
                            opacity: draft.trim().length < 5 ? 0.5 : 1,
                            cursor: draft.trim().length < 5 ? 'not-allowed' : 'pointer',
                          }}
                        >
                          Publier
                        </button>
                      </div>
                    </div>
                  </div>
                </Modal.Body>
                <Modal.Footer>
                  <button
                    type="button"
                    onClick={() => onFlag(spot.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--fg-muted)',
                      fontFamily: 'var(--font-sans)',
                      fontSize: 12,
                      cursor: 'pointer',
                      textDecoration: 'underline',
                    }}
                  >
                    Signaler ce spot
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

/* ------------------------------------------------------------------ */
/* Ajout d'un spot                                                     */
/* ------------------------------------------------------------------ */

export interface NewSpotInput {
  category: SpotCategory;
  name: string;
  description: string;
  isAnonymous: boolean;
}

export function AddSpotModal({
  isOpen,
  onClose,
  onCreate,
  remainingToday,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (input: NewSpotInput) => void;
  /** Spots restants dans le quota journalier (anti-spam, 5/jour). */
  remainingToday: number;
}) {
  const [category, setCategory] = useState<SpotCategory>('plage');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(true);

  const quotaReached = remainingToday <= 0;
  const nameValid = name.trim().length >= 3 && name.trim().length <= 120;

  function reset() {
    setCategory('plage');
    setName('');
    setDescription('');
    setIsAnonymous(true);
  }

  function submit() {
    if (!nameValid || quotaReached) return;
    onCreate({ category, name: name.trim(), description: description.trim(), isAnonymous });
    reset();
  }

  return (
    <Modal isOpen={isOpen} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
      <Modal.Backdrop>
        <Modal.Container placement="center" size="md">
          <Modal.Dialog>
            <Modal.Header>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
                <span style={{ ...LABEL_STYLE, color: 'var(--terracotta-700)' }}>âŠ™ Partager un spot</span>
                <Modal.Heading style={{ fontFamily: 'var(--font-serif)', fontSize: 22, color: 'var(--fg-strong)', margin: 0 }}>
                  Ajouter un spot Ã  la carte
                </Modal.Heading>
              </div>
              <Modal.CloseTrigger aria-label="Fermer" />
            </Modal.Header>
            <Modal.Body>
              {quotaReached ? (
                <div
                  style={{
                    padding: 14,
                    background: 'var(--prudence-bg)',
                    borderLeft: '6px solid var(--terracotta-500)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--prudence-ink)',
                    fontFamily: 'var(--font-sans)',
                    fontSize: 14,
                  }}
                >
                  Vous avez dÃ©jÃ  ajoutÃ© 5 spots aujourdâ€™hui. Revenez demain&nbsp;!
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <span style={LABEL_STYLE}>CatÃ©gorie</span>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as SpotCategory)}
                      style={FIELD_STYLE}
                    >
                      {SPOT_CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </label>

                  <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <span style={LABEL_STYLE}>Nom du spot (3 Ã  120 caractÃ¨res)</span>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      maxLength={120}
                      placeholder="Ex : Plage de Toulhars â€” Larmor-Plage"
                      style={FIELD_STYLE}
                    />
                  </label>

                  <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <span style={LABEL_STYLE}>Description (optionnelle)</span>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      maxLength={500}
                      rows={3}
                      placeholder="Pourquoi ce spot est utile pour les chiens ? (accÃ¨s, sol, frÃ©quentationâ€¦)"
                      style={{ ...FIELD_STYLE, resize: 'vertical' }}
                    />
                  </label>

                  <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={!isAnonymous}
                      onChange={(e) => setIsAnonymous(!e.target.checked)}
                      style={{ marginTop: 3 }}
                    />
                    <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.5 }}>
                      Partager sous mon prÃ©nom. Sinon, le spot sera affichÃ© comme Â«&nbsp;Anonyme&nbsp;Â» â€” votre identitÃ©
                      nâ€™est jamais liÃ©e publiquement au point (RGPD).
                    </span>
                  </label>

                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-muted)' }}>
                    {remainingToday} ajout{remainingToday > 1 ? 's' : ''} restant{remainingToday > 1 ? 's' : ''} aujourdâ€™hui
                  </span>
                </div>
              )}
            </Modal.Body>
            <Modal.Footer>
              {!quotaReached && (
                <button
                  type="button"
                  onClick={submit}
                  disabled={!nameValid}
                  style={{ ...PRIMARY_BTN, width: '100%', opacity: nameValid ? 1 : 0.5, cursor: nameValid ? 'pointer' : 'not-allowed' }}
                >
                  Ajouter le spot
                </button>
              )}
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

