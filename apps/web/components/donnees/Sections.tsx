'use client';

import { Radio, RadioGroup, Switch } from '@/lib/heroui-compat';
import type { CSSProperties, ReactNode } from 'react';
import { Card, Eyebrow, H2, H3, P, P2 } from '../ui';
import {
  CATEGORIES,
  LEVELS,
  TOTAL_MEASURES_30D,
} from './data';
import type { Category, CategoryId, LevelId } from './data';

/* ============================================================
   Section 01 â€” Vue d'ensemble
   ============================================================ */

export function Section01Overview({
  globalLevel,
  activeCount,
}: {
  globalLevel: LevelId;
  activeCount: number;
}) {
  const levelMeta = LEVELS.find((l) => l.id === globalLevel)!;
  return (
    <SectionShell numero="01" titre="Vue d'ensemble">
      <NotchInfo>
        EMOPET ne vend <strong>JAMAIS</strong> vos donnÃ©es. Vous dÃ©cidez chaque catÃ©gorie,
        vous pouvez tout supprimer en 1 clic.
      </NotchInfo>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
        }}
      >
        <StatCard
          eyebrow="MESURES Â· 30 J"
          value={TOTAL_MEASURES_30D.toLocaleString('fr-FR')}
          unit="mesures collectÃ©es"
        />
        <StatCard
          eyebrow="CATÃ‰GORIES"
          value={activeCount.toString()}
          unit={`actives sur ${CATEGORIES.length}`}
        />
        <StatCard
          eyebrow="NIVEAU GLOBAL"
          value={levelMeta.label.split(' ')[0] ?? levelMeta.label}
          unit={levelMeta.audience.toLowerCase()}
          accent={levelMeta.accent}
        />
      </div>
    </SectionShell>
  );
}

/* ============================================================
   Section 02 â€” 4 niveaux de partage
   ============================================================ */

export function Section02Levels({
  value,
  onChange,
}: {
  value: LevelId;
  onChange: (v: LevelId) => void;
}) {
  return (
    <SectionShell numero="02" titre="Tu choisis ce que tu partages">
      <P2 style={{ color: 'var(--fg-2)' }}>
        Le niveau global s'applique par dÃ©faut Ã  toutes tes catÃ©gories. Tu peux le surcharger
        ligne par ligne en Section 03.
      </P2>
      <RadioGroup
        value={value}
        onChange={(v) => onChange(v as LevelId)}
        aria-label="Niveau de partage global"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}
      >
        {LEVELS.map((lvl) => {
          const selected = value === lvl.id;
          return (
            <Radio key={lvl.id} value={lvl.id} style={{ all: 'unset', cursor: 'pointer' } as CSSProperties}>
              <div
                style={{
                  position: 'relative',
                  padding: 18,
                  background: selected ? 'var(--surface)' : 'var(--surface-2)',
                  border: `1.5px solid ${selected ? lvl.accent : 'var(--border)'}`,
                  borderRadius: 'var(--radius-md)',
                  boxShadow: selected ? '0 0 0 4px color-mix(in srgb, ' + lvl.accent + ' 12%, transparent)' : 'none',
                  transition: 'all var(--dur-fast) var(--ease-out)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  minHeight: 180,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 18,
                      color: lvl.accent,
                      letterSpacing: '0.1em',
                      minWidth: 48,
                    }}
                  >
                    {lvl.glyph}
                  </span>
                  <span
                    style={{
                      fontFamily: 'var(--font-sans)',
                      fontSize: 13,
                      fontWeight: 700,
                      letterSpacing: '0.12em',
                      color: lvl.accent,
                    }}
                  >
                    {lvl.label}
                  </span>
                  <span
                    aria-hidden
                    style={{
                      marginLeft: 'auto',
                      width: 18,
                      height: 18,
                      borderRadius: '50%',
                      border: `1.5px solid ${selected ? lvl.accent : 'var(--border-strong)'}`,
                      background: selected ? lvl.accent : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {selected && (
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          background: 'white',
                        }}
                      />
                    )}
                  </span>
                </div>
                <P style={{ fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.5 }}>{lvl.description}</P>
                <span
                  style={{
                    marginTop: 'auto',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10,
                    letterSpacing: '0.16em',
                    textTransform: 'uppercase',
                    color: 'var(--fg-muted)',
                  }}
                >
                  Qui voit Â· {lvl.audience}
                </span>
              </div>
            </Radio>
          );
        })}
      </RadioGroup>
    </SectionShell>
  );
}

/* ============================================================
   Section 03 â€” DÃ©tail par catÃ©gorie
   ============================================================ */

export function Section03Categories({
  categoryState,
  onToggle,
  onLevelChange,
  onShowData,
}: {
  categoryState: Record<CategoryId, { on: boolean; level: LevelId }>;
  onToggle: (id: CategoryId, on: boolean) => void;
  onLevelChange: (id: CategoryId, level: LevelId) => void;
  onShowData: (id: CategoryId) => void;
}) {
  return (
    <SectionShell numero="03" titre="Tes 6 catÃ©gories de donnÃ©es">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {CATEGORIES.map((cat) => (
          <CategoryRow
            key={cat.id}
            cat={cat}
            state={categoryState[cat.id]}
            onToggle={(on) => onToggle(cat.id, on)}
            onLevelChange={(lvl) => onLevelChange(cat.id, lvl)}
            onShowData={() => onShowData(cat.id)}
          />
        ))}
      </div>
    </SectionShell>
  );
}

function CategoryRow({
  cat,
  state,
  onToggle,
  onLevelChange,
  onShowData,
}: {
  cat: Category;
  state: { on: boolean; level: LevelId };
  onToggle: (on: boolean) => void;
  onLevelChange: (lvl: LevelId) => void;
  onShowData: () => void;
}) {
  const levelMeta = LEVELS.find((l) => l.id === state.level)!;
  return (
    <Card>
      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 320px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <H3 style={{ fontSize: 18 }}>{cat.name}</H3>
            {cat.tooltip && (
              <span
                title={cat.tooltip}
                aria-label={cat.tooltip}
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-pill)',
                  background: 'var(--prudence-bg)',
                  color: 'var(--prudence-ink)',
                  border: '1px solid var(--prudence-border)',
                  cursor: 'help',
                }}
              >
                âš  NOTE
              </span>
            )}
          </div>
          <P2>{cat.description}</P2>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 4 }}>
            <Stat label="Mesures / 30 j" value={cat.measuresPerMonth != null ? cat.measuresPerMonth.toLocaleString('fr-FR') : 'â€”'} />
            <Stat label="Capteurs" value={cat.sensors.join(' Â· ')} />
          </div>
          {cat.tooltip && (
            <P2 style={{ color: 'var(--prudence-ink)', fontStyle: 'italic', marginTop: 4 }}>
              {cat.tooltip}
            </P2>
          )}
        </div>

        <div
          style={{
            flex: '0 0 220px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            alignItems: 'flex-end',
          }}
        >
          <Switch
            isSelected={state.on}
            onChange={onToggle}
            aria-label={`Activer la collecte ${cat.name}`}
          >
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
            <Switch.Content>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.16em', color: state.on ? 'var(--terracotta-700)' : 'var(--fg-muted)' }}>
                {state.on ? 'ACTIVÃ‰' : 'DÃ‰SACTIVÃ‰'}
              </span>
            </Switch.Content>
          </Switch>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.14em', color: 'var(--fg-muted)', textTransform: 'uppercase' }}>
              Niveau
            </span>
            <select
              value={state.level}
              onChange={(e) => onLevelChange(e.target.value as LevelId)}
              disabled={!state.on}
              aria-label={`Niveau de partage pour ${cat.name}`}
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.1em',
                padding: '10px 12px',
                minHeight: 36,
                background: state.on ? 'var(--surface)' : 'var(--bg-sunk)',
                color: state.on ? levelMeta.accent : 'var(--fg-muted)',
                border: `1.5px solid ${state.on ? levelMeta.accent : 'var(--border)'}`,
                borderRadius: 'var(--radius-sm)',
                cursor: state.on ? 'pointer' : 'not-allowed',
              }}
            >
              {LEVELS.map((l) => (
                <option key={l.id} value={l.id}>{l.label}</option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={onShowData}
            disabled={!state.on}
            style={{
              padding: '10px 18px',
              minHeight: 40,
              borderRadius: 'var(--radius-pill)',
              border: '1px solid var(--border)',
              background: 'transparent',
              fontFamily: 'var(--font-sans)',
              fontSize: 13,
              fontWeight: 600,
              color: state.on ? 'var(--terracotta-700)' : 'var(--fg-muted)',
              cursor: state.on ? 'pointer' : 'not-allowed',
            }}
          >
            âŠ™ Voir mes donnÃ©es
          </button>
        </div>
      </div>
    </Card>
  );
}

/* ============================================================
   Section 04 â€” Tes droits (4 boutons cards)
   ============================================================ */

export function Section04Rights({
  onViewAll,
  onExport,
  onSeeUsages,
  onDelete,
}: {
  onViewAll: () => void;
  onExport: () => void;
  onSeeUsages: () => void;
  onDelete: () => void;
}) {
  return (
    <SectionShell numero="04" titre="Tu agis quand tu veux">
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 12,
        }}
      >
        <RightButton glyph="âŠ™"  label="Voir mes donnÃ©es"     subtitle="Toutes les mesures EMOPET sur 30 j" onClick={onViewAll} />
        <RightButton glyph="â†“"  label="Exporter mes donnÃ©es" subtitle="CSV / JSON Â· prÃªt en 1 clic" onClick={onExport} />
        <RightButton glyph="âŠ™*" label="Voir les utilisations" subtitle="Ã‰tudes scientifiques en cours" onClick={onSeeUsages} />
        <RightButton glyph="âœ•"  label="Supprimer mes donnÃ©es" subtitle="Action irrÃ©versible Â· double validation" onClick={onDelete} tone="danger" />
      </div>
    </SectionShell>
  );
}

function RightButton({
  glyph,
  label,
  subtitle,
  onClick,
  tone,
}: {
  glyph: string;
  label: string;
  subtitle: string;
  onClick: () => void;
  tone?: 'danger';
}) {
  const isDanger = tone === 'danger';
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        textAlign: 'left',
        padding: 18,
        borderRadius: 'var(--radius-md)',
        background: 'var(--surface)',
        border: `1px solid ${isDanger ? 'var(--rouge)' : 'var(--border)'}`,
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        minHeight: 120,
        transition: 'transform var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = 'var(--shadow-md)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = '';
        e.currentTarget.style.boxShadow = '';
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 22,
          color: isDanger ? 'var(--rouge)' : 'var(--terracotta-700)',
          letterSpacing: '0.08em',
        }}
      >
        {glyph}
      </span>
      <span
        style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 14,
          fontWeight: 700,
          color: isDanger ? 'var(--rouge)' : 'var(--fg-strong)',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
        }}
      >
        {label}
      </span>
      <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--fg-muted)' }}>{subtitle}</span>
    </button>
  );
}

/* ============================================================
   Section 05 â€” Consentement annuel
   ============================================================ */

export function Section05Consent() {
  return (
    <SectionShell numero="05" titre="Consentement annuel">
      <NotchInfo>
        Ton consentement est renouvelÃ© chaque annÃ©e. Prochaine validation demandÃ©e :{' '}
        <strong>15 mai 2027</strong>. Tu pourras tout reconfigurer Ã  ce moment-lÃ .
      </NotchInfo>
    </SectionShell>
  );
}

/* ============================================================
   Helpers de section
   ============================================================ */

function SectionShell({
  numero,
  titre,
  children,
}: {
  numero: string;
  titre: string;
  children: ReactNode;
}) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <header style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
        <span
          style={{
            fontFamily: 'var(--font-serif)',
            fontStyle: 'italic',
            fontSize: 38,
            color: 'var(--terracotta-500)',
            lineHeight: 1,
            opacity: 0.85,
          }}
        >
          {numero}
        </span>
        <H2 style={{ fontSize: 22 }}>{titre}</H2>
      </header>
      {children}
    </section>
  );
}

function NotchInfo({ children }: { children: ReactNode }) {
  return (
    <div
      role="note"
      style={{
        padding: 18,
        background: 'var(--prudence-bg)',
        borderLeft: '8px solid var(--terracotta-500)',
        borderRadius: 'var(--radius-md)',
        color: 'var(--prudence-ink)',
        fontFamily: 'var(--font-sans)',
        fontSize: 14,
        lineHeight: 1.55,
      }}
    >
      {children}
    </div>
  );
}

function StatCard({
  eyebrow,
  value,
  unit,
  accent = 'var(--fg-strong)',
}: {
  eyebrow: string;
  value: string;
  unit: string;
  accent?: string;
}) {
  return (
    <Card>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <Eyebrow>{eyebrow}</Eyebrow>
        <span
          style={{
            fontFamily: 'var(--font-serif)',
            fontWeight: 500,
            fontSize: 38,
            color: accent,
            lineHeight: 1,
            letterSpacing: 0,
            fontFeatureSettings: 'var(--ff-tabular)',
            fontVariantNumeric: 'tabular-nums lining-nums',
          }}
        >
          {value}
        </span>
        <P2>{unit}</P2>
      </div>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', gap: 2 }}>
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'var(--fg-muted)',
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--fg-strong)',
        }}
      >
        {value}
      </span>
    </span>
  );
}

