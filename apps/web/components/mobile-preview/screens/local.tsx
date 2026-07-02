'use client';

import { useState } from 'react';
import { useRevealOnMount } from '../animations';
import { MPIcon } from '../icon';
import { MPCard, MPEyebrow } from '../primitives';
import { T } from '../tokens';

type ServiceCat = 'Tous' | 'Vétérinaires' | 'Parcs' | 'Éducateurs' | 'Urgences';

type Service = {
  id: string;
  name: string;
  cat: Exclude<ServiceCat, 'Tous'>;
  area: string;
  note: string;
  distance: string;
};

const SERVICES: Service[] = [
  {
    id: 'lo1',
    name: 'Cabinet vétérinaire Kerentrech',
    cat: 'Vétérinaires',
    area: 'Lorient',
    note: 'Partenaire EMOPET · partage des observations sur accord du propriétaire.',
    distance: '1,2 km',
  },
  {
    id: 'lo2',
    name: 'Parc de Kerlin',
    cat: 'Parcs',
    area: 'Larmor-Plage',
    note: 'Zone clôturée, espace ombragé. Bon pour une sortie calme.',
    distance: '4,8 km',
  },
  {
    id: 'lo3',
    name: 'Céline Le Gall · éducatrice',
    cat: 'Éducateurs',
    area: 'Quimper',
    note: 'Approche en renforcement positif. Cotisation première séance à confirmer.',
    distance: '68 km',
  },
  {
    id: 'lo4',
    name: 'Clinique du Gouet',
    cat: 'Vétérinaires',
    area: 'Vannes',
    note: 'Horaires étendus. Pas de permanence nuit côté EMOPET.',
    distance: '58 km',
  },
];

const CATS: ServiceCat[] = ['Tous', 'Vétérinaires', 'Parcs', 'Éducateurs', 'Urgences'];

function FilterChips({ active, onChange }: { active: ServiceCat; onChange: (c: ServiceCat) => void }) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 6,
        overflowX: 'auto',
        padding: '0 2px',
      }}
    >
      {CATS.map((c) => {
        const isActive = c === active;
        return (
          <button
            key={c}
            onClick={() => onChange(c)}
            style={{
              padding: '6px 11px',
              borderRadius: 999,
              border: `1px solid ${isActive ? T.accent : T.border}`,
              background: isActive ? T.accentSoft : T.cream50,
              color: isActive ? T.accentPress : T.fg2,
              fontFamily: T.fontSans,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            {c}
          </button>
        );
      })}
    </div>
  );
}

function Header() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }} data-reveal>
      <MPEyebrow>Local · Bretagne Sud</MPEyebrow>
      <span
        style={{
          fontFamily: T.fontSerif,
          fontSize: 26,
          fontWeight: 500,
          color: T.fgStrong,
          letterSpacing: 0,
          lineHeight: 1.2,
        }}
      >
        Services autour de vous
      </span>
      <span style={{ fontFamily: T.fontSans, fontSize: 12, color: T.fg2, lineHeight: 1.5 }}>
        Annuaire coopératif · partage des observations uniquement sur accord explicite.
      </span>
    </div>
  );
}

function ServiceCard({ s }: { s: Service }) {
  return (
    <MPCard reveal>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span
            style={{
              padding: '2px 8px',
              borderRadius: 999,
              background: T.accent2Soft,
              color: T.lichen700,
              fontFamily: T.fontSans,
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            {s.cat}
          </span>
          <span
            style={{
              fontFamily: T.fontSans,
              fontSize: 11,
              color: T.fgMuted,
              fontFeatureSettings: T.ffTabular,
            }}
          >
            {s.distance}
          </span>
        </div>
        <span
          style={{
            fontFamily: T.fontSerif,
            fontSize: 17,
            fontWeight: 500,
            color: T.fgStrong,
            lineHeight: 1.3,
          }}
        >
          {s.name}
        </span>
        <span
          style={{
            fontFamily: T.fontSans,
            fontSize: 12,
            color: T.fg2,
            fontFeatureSettings: T.ffTabular,
          }}
        >
          {s.area}
        </span>
        <span style={{ fontFamily: T.fontSans, fontSize: 12, color: T.fg, lineHeight: 1.55 }}>{s.note}</span>
      </div>
    </MPCard>
  );
}

export function LocalScreenNormal() {
  const [filter, setFilter] = useState<ServiceCat>('Tous');
  const ref = useRevealOnMount(true, [filter]);
  const items = SERVICES.filter((s) => filter === 'Tous' || s.cat === filter);
  return (
    <div
      ref={ref}
      style={{
        flex: 1,
        overflowY: 'auto',
        padding: '18px 20px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}
    >
      <Header />
      <FilterChips active={filter} onChange={setFilter} />
      {items.length === 0 ? (
        <div
          data-reveal
          style={{
            marginTop: 8,
            border: `1.5px dashed ${T.border}`,
            borderRadius: 14,
            padding: 24,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8,
            background: T.cream50,
          }}
        >
          <MPIcon name="empty" size={26} color={T.fgHint} />
          <span
            style={{
              fontFamily: T.fontSans,
              fontSize: 12,
              color: T.fgMuted,
              textAlign: 'center',
              lineHeight: 1.55,
              maxWidth: 260,
            }}
          >
            Aucun service dans cette catégorie pour votre zone. Contactez votre vétérinaire habituel pour un relais.
          </span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.map((s) => (
            <ServiceCard key={s.id} s={s} />
          ))}
        </div>
      )}
    </div>
  );
}

export function LocalScreenEmpty() {
  const ref = useRevealOnMount(true);
  return (
    <div
      ref={ref}
      style={{
        flex: 1,
        overflowY: 'auto',
        padding: '18px 20px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}
    >
      <Header />
      <FilterChips active="Urgences" onChange={() => {}} />
      <div
        data-reveal
        style={{
          marginTop: 10,
          flex: 1,
          minHeight: 280,
          border: `1.5px dashed ${T.border}`,
          borderRadius: 14,
          padding: 24,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          background: T.cream50,
          textAlign: 'center',
        }}
      >
        <MPIcon name="empty" size={30} color={T.fgHint} />
        <span
          style={{
            fontFamily: T.fontSerif,
            fontSize: 18,
            fontWeight: 500,
            color: T.fgStrong,
            lineHeight: 1.3,
          }}
        >
          Aucune permanence listée ce soir
        </span>
        <span
          style={{
            fontFamily: T.fontSans,
            fontSize: 12,
            color: T.fgMuted,
            lineHeight: 1.55,
            maxWidth: 280,
          }}
        >
          En cas de situation critique, contactez directement votre vétérinaire référent ou le 15. EMOPET ne relaie pas
          de signal médical.
        </span>
      </div>
    </div>
  );
}
