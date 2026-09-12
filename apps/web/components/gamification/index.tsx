'use client';

/**
 * Compatibility UI for the former global gamification surface.
 *
 * Release authority: global points, levels, badges and distance/data-driven
 * challenges are disabled under #233. The useful part that remains here is the
 * educational reader. Read state is informational only and unlocks nothing.
 */

import { Modal } from '@/lib/heroui-compat';
import { Card } from '../ui';
import type { Badge, Challenge, Counters, KnowledgeCard, Pathway, Progression } from '../../lib/gamification';
import { cardsOfPathway } from '../../lib/gamification';

/* ---------------- Legacy compatibility surfaces ---------------- */

export function ProgressionHeader({ progression: _progression }: { progression: Progression }) {
  return (
    <Card tone="sunk">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <strong style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-lg)', color: 'var(--fg-strong)' }}>
          Parcours libre
        </strong>
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--fg-2)' }}>
          EMOPET n’utilise plus de niveau global, de points ou de progression calculée à partir de l’activité du chien, de MAT/TAG/ELI ou de la qualité des données.
        </span>
      </div>
    </Card>
  );
}

export function BadgeCard({ badge }: { badge: Badge; unlocked: boolean; counters: Counters }) {
  return (
    <Card tone="sunk">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <strong style={{ fontFamily: 'var(--font-serif)', color: 'var(--fg-strong)' }}>{badge.label}</strong>
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--fg-muted)' }}>
          Badge hérité non actif. Aucun droit, rang ou récompense n’est associé.
        </span>
      </div>
    </Card>
  );
}

export function BadgeGrid({ badges, unlockedIds: _unlockedIds, counters }: { badges: Badge[]; unlockedIds: string[]; counters: Counters }) {
  if (badges.length === 0) return null;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
      {badges.map((badge) => <BadgeCard key={badge.id} badge={badge} unlocked={false} counters={counters} />)}
    </div>
  );
}

export function BadgeUnlockModal({ badge: _badge, onClose: _onClose }: { badge: Badge | null; onClose: () => void }) {
  // Automatic badge unlocks are deliberately disabled.
  return null;
}

/* ---------------- Learning ---------------- */

function ReadingBar({ pct }: { pct: number }) {
  return (
    <div style={{ width: '100%', height: 6, borderRadius: 999, background: 'var(--cream-300)', overflow: 'hidden' }} aria-hidden>
      <div
        style={{
          width: `${Math.max(0, Math.min(100, pct))}%`,
          height: '100%',
          background: 'var(--lichen-500)',
          borderRadius: 999,
        }}
      />
    </div>
  );
}

export function PathwayCard({ pathway, readIds, onOpen }: { pathway: Pathway; readIds: string[]; onOpen: (card: KnowledgeCard) => void }) {
  const cards = cardsOfPathway(pathway.id);
  const done = cards.filter((card) => readIds.includes(card.id)).length;
  const pct = cards.length > 0 ? (done / cards.length) * 100 : 0;

  return (
    <Card>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-lg)', color: 'var(--fg-strong)' }}>{pathway.label}</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-muted)' }}>{done}/{cards.length} lues</span>
        </div>
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--fg-2)' }}>{pathway.description}</span>
        <ReadingBar pct={pct} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
          {cards.map((card) => {
            const alreadyRead = readIds.includes(card.id);
            return (
              <button
                key={card.id}
                type="button"
                onClick={() => onOpen(card)}
                style={{ all: 'unset', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', gap: 8, padding: '6px 2px' }}
              >
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: alreadyRead ? 'var(--fg-muted)' : 'var(--fg)' }}>
                  {alreadyRead ? '✓ ' : ''}{card.title}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-muted)' }}>{card.readMinutes} min</span>
              </button>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

export function KnowledgeReader({ card, alreadyRead, onClose }: { card: KnowledgeCard | null; alreadyRead: boolean; onClose: () => void }) {
  return (
    <Modal isOpen={card !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <Modal.Backdrop>
        <Modal.Container placement="center" size="md">
          <Modal.Dialog>
            {card && (
              <>
                <Modal.Header>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--terracotta-700)' }}>
                      Fiche · {card.readMinutes} min
                    </span>
                    <Modal.Heading style={{ fontFamily: 'var(--font-serif)', fontSize: 21, color: 'var(--fg-strong)', margin: 0 }}>
                      {card.title}
                    </Modal.Heading>
                  </div>
                  <Modal.CloseTrigger aria-label="Fermer" />
                </Modal.Header>
                <Modal.Body>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <p style={{ margin: 0, fontFamily: 'var(--font-sans)', fontSize: 15, color: 'var(--fg)', lineHeight: 1.7 }}>{card.content}</p>
                    <div style={{ borderTop: '1px solid var(--divider)', paddingTop: 10 }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--fg-muted)' }}>Sources</span>
                      <ul style={{ margin: '6px 0 0', paddingLeft: 16, fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--fg-muted)', lineHeight: 1.6 }}>
                        {card.sources.map((source) => <li key={source}>{source}</li>)}
                      </ul>
                    </div>
                    <div style={{ background: 'var(--accent-2-soft)', borderRadius: 'var(--radius-sm)', padding: 12, fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--lichen-700)' }}>
                      {alreadyRead
                        ? 'Déjà lue. Votre repère de lecture est conservé localement.'
                        : 'Marquée comme lue. Aucun point, niveau ou avantage produit n’est associé.'}
                    </div>
                  </div>
                </Modal.Body>
              </>
            )}
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

export function ChallengeCard({ challenge: _challenge }: { challenge: Challenge }) {
  // Distance/walk-volume community challenges are not release-authorized.
  return null;
}
