'use client';

/**
 * Composants de gamification du PROPRIÃ‰TAIRE (Sprint 05).
 * âš  Sujet : le propriÃ©taire. Jamais le chien. CÃ©lÃ©brations sobres (pas Candy Crush).
 */

import { Modal } from '@/lib/heroui-compat';
import { useEffect, useState } from 'react';
import { Card, Eyebrow } from '../ui';
import type { Badge, Challenge, Counters, KnowledgeCard, Pathway, Progression, Rarity } from '../../lib/gamification';
import { cardsOfPathway } from '../../lib/gamification';

const RARITY_BG: Record<Rarity, string> = {
  common: 'var(--lichen-500)',
  rare: 'var(--terracotta-500)',
  epic: 'linear-gradient(135deg, var(--terracotta-600), var(--granit-700))',
};

function Medallion({ rarity, unlocked, size = 56 }: { rarity: Rarity; unlocked: boolean; size?: number }) {
  return (
    <div
      aria-hidden
      style={{
        width: size, height: size, borderRadius: '50%', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: unlocked ? RARITY_BG[rarity] : 'var(--cream-300)',
        color: unlocked ? 'white' : 'var(--fg-hint)',
        fontFamily: 'var(--font-mono)', fontSize: size * 0.4,
      }}
    >
      {unlocked ? 'âŠ™' : 'ðŸ”’'}
    </div>
  );
}

function Bar({ pct, on = 'var(--terracotta-500)', track = 'var(--cream-300)', height = 8 }: { pct: number; on?: string; track?: string; height?: number }) {
  return (
    <div style={{ width: '100%', height, borderRadius: 999, background: track, overflow: 'hidden' }}>
      <div style={{ width: `${Math.max(0, Math.min(100, pct))}%`, height: '100%', background: on, borderRadius: 999, transition: 'width var(--dur-base, 300ms) var(--ease-out)' }} />
    </div>
  );
}

/* ---------------- Progression header ---------------- */

export function ProgressionHeader({ progression }: { progression: Progression }) {
  const { level, nextLevel, progressToNext, totalPoints } = progression;
  return (
    <div style={{ background: 'linear-gradient(135deg, var(--terracotta-500), var(--terracotta-700))', borderRadius: 'var(--radius-lg)', padding: 24, color: 'white' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', opacity: 0.85 }}>
            Votre niveau dâ€™expÃ©rience canine
          </span>
          <span style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-3xl)' }}>{level.name}</span>
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, opacity: 0.9 }}>Niveau {level.level} Â· {level.unlocks}</span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-4xl)', lineHeight: 1 }}>{totalPoints}</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, opacity: 0.8, letterSpacing: '0.1em' }}>POINTS</div>
        </div>
      </div>
      {nextLevel && (
        <div style={{ marginTop: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-sans)', fontSize: 12, opacity: 0.9, marginBottom: 6 }}>
            <span>Vers {nextLevel.name}</span>
            <span>{progressToNext.current} / {progressToNext.target}</span>
          </div>
          <Bar pct={progressToNext.percentage} on="rgba(255,255,255,0.95)" track="rgba(255,255,255,0.25)" />
        </div>
      )}
    </div>
  );
}

/* ---------------- Badge grid ---------------- */

export function BadgeCard({ badge, unlocked, counters }: { badge: Badge; unlocked: boolean; counters: Counters }) {
  const p = badge.progress(counters);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: 14, borderRadius: 'var(--radius-md)', background: unlocked ? 'var(--surface)' : 'var(--bg-sunk)', border: '1px solid var(--border)', opacity: unlocked ? 1 : 0.75, textAlign: 'center' }}>
      <Medallion rarity={badge.rarity} unlocked={unlocked} />
      <span style={{ fontFamily: 'var(--font-serif)', fontSize: 14, color: 'var(--fg-strong)' }}>{badge.label}</span>
      <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--fg-muted)', lineHeight: 1.4 }}>{badge.description}</span>
      {unlocked ? (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', color: 'var(--lichen-700)', padding: '2px 8px', borderRadius: 999, background: 'var(--accent-2-soft)' }}>DÃ‰BLOQUÃ‰</span>
      ) : (
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <Bar pct={(p.current / p.target) * 100} height={5} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fg-muted)' }}>{p.current} / {p.target}</span>
        </div>
      )}
    </div>
  );
}

export function BadgeGrid({ badges, unlockedIds, counters }: { badges: Badge[]; unlockedIds: string[]; counters: Counters }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
      {badges.map((b) => <BadgeCard key={b.id} badge={b} unlocked={unlockedIds.includes(b.id)} counters={counters} />)}
    </div>
  );
}

/* ---------------- Unlock celebration (sobre) ---------------- */

export function BadgeUnlockModal({ badge, onClose }: { badge: Badge | null; onClose: () => void }) {
  const [shown, setShown] = useState(false);
  useEffect(() => { if (badge) { const t = setTimeout(() => setShown(true), 20); return () => clearTimeout(t); } setShown(false); }, [badge]);
  return (
    <Modal isOpen={badge !== null} onOpenChange={(o) => { if (!o) onClose(); }}>
      <Modal.Backdrop>
        <Modal.Container placement="center" size="sm">
          <Modal.Dialog>
            {badge && (
              <Modal.Body>
                <div style={{ textAlign: 'center', padding: '28px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                  <div style={{ transform: shown ? 'scale(1)' : 'scale(0.6)', opacity: shown ? 1 : 0, transition: 'transform 360ms cubic-bezier(.2,.8,.2,1), opacity 320ms' }}>
                    <Medallion rarity={badge.rarity} unlocked size={88} />
                  </div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--terracotta-700)' }}>Badge dÃ©bloquÃ©</span>
                  <span style={{ fontFamily: 'var(--font-serif)', fontSize: 22, color: 'var(--fg-strong)' }}>{badge.label}</span>
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--fg-2)' }}>{badge.description}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--terracotta-700)' }}>+{badge.pointsReward} points</span>
                  <button type="button" onClick={onClose} style={{ marginTop: 8, padding: '10px 28px', borderRadius: 999, background: 'var(--terracotta-500)', color: 'white', border: 'none', fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>Continuer</button>
                </div>
              </Modal.Body>
            )}
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

/* ---------------- Apprentissage ---------------- */

export function PathwayCard({ pathway, readIds, onOpen }: { pathway: Pathway; readIds: string[]; onOpen: (card: KnowledgeCard) => void }) {
  const cards = cardsOfPathway(pathway.id);
  const done = cards.filter((c) => readIds.includes(c.id)).length;
  return (
    <Card>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-lg)', color: 'var(--fg-strong)' }}>{pathway.label}</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-muted)' }}>{done}/{cards.length}</span>
        </div>
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--fg-2)' }}>{pathway.description}</span>
        <Bar pct={(done / cards.length) * 100} height={6} on="var(--lichen-500)" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
          {cards.map((c) => (
            <button key={c.id} type="button" onClick={() => onOpen(c)} style={{ all: 'unset', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', gap: 8, padding: '6px 2px' }}>
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: readIds.includes(c.id) ? 'var(--fg-muted)' : 'var(--fg)' }}>
                {readIds.includes(c.id) ? 'âœ“ ' : ''}{c.title}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-muted)' }}>{c.readMinutes} min</span>
            </button>
          ))}
        </div>
      </div>
    </Card>
  );
}

export function KnowledgeReader({ card, alreadyRead, onClose }: { card: KnowledgeCard | null; alreadyRead: boolean; onClose: () => void }) {
  return (
    <Modal isOpen={card !== null} onOpenChange={(o) => { if (!o) onClose(); }}>
      <Modal.Backdrop>
        <Modal.Container placement="center" size="md">
          <Modal.Dialog>
            {card && (
              <>
                <Modal.Header>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--terracotta-700)' }}>âŠ™ Fiche Â· {card.readMinutes} min</span>
                    <Modal.Heading style={{ fontFamily: 'var(--font-serif)', fontSize: 21, color: 'var(--fg-strong)', margin: 0 }}>{card.title}</Modal.Heading>
                  </div>
                  <Modal.CloseTrigger aria-label="Fermer" />
                </Modal.Header>
                <Modal.Body>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <p style={{ margin: 0, fontFamily: 'var(--font-sans)', fontSize: 15, color: 'var(--fg)', lineHeight: 1.7 }}>{card.content}</p>
                    <div style={{ borderTop: '1px solid var(--divider)', paddingTop: 10 }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--fg-muted)' }}>Sources</span>
                      <ul style={{ margin: '6px 0 0', paddingLeft: 16, fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--fg-muted)', lineHeight: 1.6 }}>
                        {card.sources.map((s) => <li key={s}>{s}</li>)}
                      </ul>
                    </div>
                    <div style={{ background: 'var(--accent-2-soft)', borderRadius: 'var(--radius-sm)', padding: 12, fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--lichen-700)' }}>
                      {alreadyRead ? 'Fiche dÃ©jÃ  lue.' : 'Fiche lue ! +10 points pour votre progression.'}
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

/* ---------------- DÃ©fi ---------------- */

export function ChallengeCard({ challenge }: { challenge: Challenge }) {
  return (
    <Card tone="accent2Soft">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Eyebrow tone="accent2">{challenge.circleLabel}</Eyebrow>
        <span style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-lg)', color: 'var(--fg-strong)' }}>{challenge.title}</span>
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--fg-2)' }}>{challenge.description}</span>
        <Bar pct={(challenge.current / challenge.target) * 100} on="var(--lichen-600)" />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--fg-muted)' }}>
          <span>{challenge.current} / {challenge.target} {challenge.unit}</span>
          <span>Votre part : {challenge.myContribution} {challenge.unit} Â· {challenge.endsLabel}</span>
        </div>
      </div>
    </Card>
  );
}

