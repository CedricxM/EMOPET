'use client';

/**
 * Cartes d'entrée du carnet (Sprint 02). Le rendu varie selon le type
 * (union discriminée). Style éditorial sobre — charte EMOPET v2.
 */

import type { CSSProperties } from 'react';
import { Card, Eyebrow, Icon } from '../ui';
import {
  ACTIVITY_LABELS,
  ENTRY_TYPE_META,
  VET_VISIT_LABELS,
  formatDateLong,
  formatDistance,
  formatDuration,
  formatTime,
} from '../../lib/journal';
import type {
  JournalEntry,
  MilestoneEntry,
  ObservationEntry,
  PhotoTextEntry,
  VetVisitEntry,
  WalkEntry,
} from '../../lib/journal';

const META_ROW: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 8,
};

const TIME_STYLE: CSSProperties = {
  fontFamily: 'var(--font-sans)',
  fontSize: 'var(--text-xs)',
  color: 'var(--fg-muted)',
  fontFeatureSettings: 'var(--ff-tabular)',
  whiteSpace: 'nowrap',
};

const TITLE_STYLE: CSSProperties = {
  fontFamily: 'var(--font-serif)',
  fontSize: 'var(--text-2xl)',
  color: 'var(--fg-strong)',
  margin: 0,
  lineHeight: 1.2,
};

const BODY_STYLE: CSSProperties = {
  fontFamily: 'var(--font-sans)',
  fontSize: 'var(--text-md)',
  color: 'var(--fg)',
  lineHeight: 1.6,
  margin: 0,
};

function Chip({ children, tone = 'accent2' }: { children: string; tone?: 'accent' | 'accent2' }) {
  const bg = tone === 'accent' ? 'var(--accent-soft)' : 'var(--accent-2-soft)';
  const ink = tone === 'accent' ? 'var(--accent-press)' : 'var(--lichen-700)';
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '3px 10px',
        borderRadius: 'var(--radius-pill)',
        background: bg,
        color: ink,
        fontFamily: 'var(--font-sans)',
        fontSize: 'var(--text-xxs)',
        fontWeight: 'var(--weight-semi)',
        letterSpacing: '0.04em',
      }}
    >
      {children}
    </span>
  );
}

function PhotoStrip({ urls }: { urls: string[] }) {
  if (urls.length === 0) {
    return (
      <div
        aria-hidden
        style={{
          height: 160,
          borderRadius: 'var(--radius-md)',
          background: 'linear-gradient(135deg, var(--cream-200), var(--cream-300))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--terracotta-500)',
          fontFamily: 'var(--font-mono)',
          fontSize: 28,
          letterSpacing: '0.2em',
        }}
      >
        ⊙
      </div>
    );
  }
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: urls.length === 1 ? '1fr' : 'repeat(2, 1fr)',
        gap: 6,
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
      }}
    >
      {urls.slice(0, 4).map((u, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={i}
          src={u}
          alt=""
          style={{ width: '100%', height: urls.length === 1 ? 220 : 130, objectFit: 'cover', display: 'block' }}
        />
      ))}
    </div>
  );
}

interface VariantProps<E> {
  entry: E;
  onExport?: (entry: JournalEntry) => void;
}

function PhotoTextCard({ entry, onExport }: VariantProps<PhotoTextEntry>) {
  return (
    <Card>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <PhotoStrip urls={entry.photoUrls} />
        <div style={META_ROW}>
          <Eyebrow tone="accent2">{ENTRY_TYPE_META.photo_text.label}</Eyebrow>
          <span style={TIME_STYLE}>{formatTime(entry.occurredAt)}</span>
        </div>
        {entry.title && <h3 style={TITLE_STYLE}>{entry.title}</h3>}
        <p style={BODY_STYLE}>{entry.content}</p>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {entry.activityTag && <Chip>{ACTIVITY_LABELS[entry.activityTag]}</Chip>}
          {entry.locationName && (
            <span style={{ ...TIME_STYLE, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Icon name="compass" size={13} /> {entry.locationName}
            </span>
          )}
          {onExport && <ExportButton onClick={() => onExport(entry)} />}
        </div>
      </div>
    </Card>
  );
}

function WalkCard({ entry, onExport }: VariantProps<WalkEntry>) {
  return (
    <Card>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={META_ROW}>
          <Eyebrow tone="accent2">{ENTRY_TYPE_META.walk_recorded.label}</Eyebrow>
          <span style={TIME_STYLE}>{formatTime(entry.occurredAt)}</span>
        </div>
        {entry.title && <h3 style={TITLE_STYLE}>{entry.title}</h3>}
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <Stat label="Durée" value={formatDuration(entry.durationSeconds)} />
          <Stat label="Distance" value={formatDistance(entry.distanceMeters)} />
          {entry.elevationGainMeters != null && <Stat label="Dénivelé" value={`${entry.elevationGainMeters} m`} />}
          {entry.weather && <Stat label="Météo" value={`${entry.weather.tempC}° · ${entry.weather.conditions}`} />}
        </div>
        {entry.content && <p style={BODY_STYLE}>{entry.content}</p>}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {entry.locationName && (
            <span style={{ ...TIME_STYLE, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Icon name="compass" size={13} /> {entry.locationName}
            </span>
          )}
          {onExport && <ExportButton onClick={() => onExport(entry)} />}
        </div>
      </div>
    </Card>
  );
}

function MilestoneCard({ entry, onExport }: VariantProps<MilestoneEntry>) {
  return (
    <Card tone="accentSoft">
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        <div
          aria-hidden
          style={{
            width: 52,
            height: 52,
            borderRadius: '50%',
            background: 'var(--terracotta-500)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            fontSize: 24,
          }}
        >
          ⊙
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <Eyebrow tone="accent">{ENTRY_TYPE_META.milestone.label}</Eyebrow>
          <h3 style={{ ...TITLE_STYLE, fontStyle: 'italic' }}>{entry.title}</h3>
          <p style={{ ...BODY_STYLE, color: 'var(--fg-2)' }}>{entry.content}</p>
          {onExport && (
            <div style={{ marginTop: 4 }}>
              <ExportButton onClick={() => onExport(entry)} />
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

function ObservationCard({ entry }: VariantProps<ObservationEntry>) {
  return (
    <Card tone="sunk">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span aria-hidden style={{ fontFamily: 'var(--font-serif)', fontSize: 28, color: 'var(--terracotta-400)', lineHeight: 0.5 }}>“</span>
        <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 'var(--text-lg)', color: 'var(--fg-2)', lineHeight: 1.5, margin: 0 }}>
          {entry.content}
        </p>
        <span style={{ ...TIME_STYLE, alignSelf: 'flex-end' }}>{formatTime(entry.occurredAt)}</span>
      </div>
    </Card>
  );
}

function VetVisitCard({ entry }: VariantProps<VetVisitEntry>) {
  return (
    <Card tone="accentSoft">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={META_ROW}>
          <Eyebrow tone="accent">{ENTRY_TYPE_META.vet_visit.label}</Eyebrow>
          <span style={TIME_STYLE}>{formatTime(entry.occurredAt)}</span>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <Chip tone="accent">{VET_VISIT_LABELS[entry.visitType]}</Chip>
          {entry.vetName && <span style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)', color: 'var(--fg-strong)' }}>{entry.vetName}</span>}
        </div>
        {entry.content && <p style={BODY_STYLE}>{entry.content}</p>}
        {entry.nextVisitReminder && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              alignSelf: 'flex-start',
              padding: '6px 12px',
              borderRadius: 'var(--radius-pill)',
              border: '1px solid var(--accent-soft-border)',
              fontFamily: 'var(--font-sans)',
              fontSize: 'var(--text-xs)',
              color: 'var(--accent-press)',
            }}
          >
            <Icon name="calendar" size={13} /> Prochaine visite : {formatDateLong(entry.nextVisitReminder)}
          </div>
        )}
      </div>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--fg-muted)' }}>
        {label}
      </span>
      <span style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-lg)', color: 'var(--fg-strong)' }}>{value}</span>
    </div>
  );
}

function ExportButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        marginLeft: 'auto',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        background: 'none',
        border: 'none',
        color: 'var(--fg-muted)',
        fontFamily: 'var(--font-sans)',
        fontSize: 'var(--text-xs)',
        fontWeight: 'var(--weight-semi)',
        cursor: 'pointer',
      }}
    >
      <Icon name="download" size={14} /> Carte postale
    </button>
  );
}

export function EntryCard({ entry, onExport }: { entry: JournalEntry; onExport?: (entry: JournalEntry) => void }) {
  switch (entry.type) {
    case 'photo_text':
      return <PhotoTextCard entry={entry} onExport={onExport} />;
    case 'walk_recorded':
      return <WalkCard entry={entry} onExport={onExport} />;
    case 'milestone':
      return <MilestoneCard entry={entry} onExport={onExport} />;
    case 'observation':
      return <ObservationCard entry={entry} />;
    case 'vet_visit':
      return <VetVisitCard entry={entry} />;
  }
}
