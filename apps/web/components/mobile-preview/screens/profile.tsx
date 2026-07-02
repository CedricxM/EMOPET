'use client';

import { useRevealOnMount } from '../animations';
import { MPIcon, type MPIconName } from '../icon';
import { MPCard, MPDisclaimer, MPEyebrow, MPPill } from '../primitives';
import { T } from '../tokens';

type Sensor = {
  id: 'mat' | 'tag';
  label: string;
  icon: MPIconName;
  state: 'valid' | 'degraded' | 'suppressed';
  coveragePct: number;
  firmware: string;
  bars: number[]; // 0..100
};

const SENSORS: Sensor[] = [
  {
    id: 'mat',
    label: 'MAT · tapis',
    icon: 'mat',
    state: 'valid',
    coveragePct: 92,
    firmware: '1.4.2',
    bars: [60, 80, 74, 90, 84, 92, 88],
  },
  {
    id: 'tag',
    label: 'TAG · collier',
    icon: 'tag',
    state: 'degraded',
    coveragePct: 64,
    firmware: '1.2.0',
    bars: [40, 55, 70, 60, 45, 72, 64],
  },
];

const SETTINGS: Array<{ id: string; label: string; meta: string; icon: MPIconName }> = [
  { id: 's1', label: 'IA & tonalité', meta: 'Breiz · calme', icon: 'chat' },
  { id: 's2', label: 'Mode prudence', meta: 'Activé', icon: 'info' },
  { id: 's3', label: 'Suivi & vétérinaire', meta: 'Cabinet Kerentrech', icon: 'profile' },
  { id: 's4', label: 'Confidentialité', meta: 'Données locales', icon: 'signal' },
  { id: 's5', label: 'À propos d’EMOPET', meta: 'v6.0', icon: 'info' },
];

function SensorCard({ s }: { s: Sensor }) {
  return (
    <MPCard reveal>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                background: T.cream200,
                color: T.fg2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MPIcon name={s.icon} size={16} color={T.fg2} />
            </div>
            <span
              style={{
                fontFamily: T.fontSerif,
                fontSize: 15,
                fontWeight: 500,
                color: T.fgStrong,
                lineHeight: 1.2,
              }}
            >
              {s.label}
            </span>
          </div>
          <MPPill state={s.state} />
        </div>

        {/* Mini bar chart */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: 4,
            height: 42,
          }}
        >
          {s.bars.map((h, i) => (
            <span
              key={i}
              style={{
                flex: 1,
                height: `${h}%`,
                background: s.state === 'valid' ? T.lichen400 : T.eliDegraded,
                borderRadius: 3,
                opacity: 0.9,
                display: 'block',
              }}
            />
          ))}
        </div>

        <span
          style={{
            fontFamily: T.fontSans,
            fontSize: 12,
            color: T.fg2,
            fontFeatureSettings: T.ffTabular,
          }}
        >
          Couverture {s.coveragePct}% · firmware {s.firmware}
        </span>
      </div>
    </MPCard>
  );
}

export function ProfileScreen() {
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
        gap: 18,
      }}
    >
      <div data-reveal style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <MPEyebrow>Profil</MPEyebrow>
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
          Gwen & capteurs
        </span>
      </div>

      {/* Dog card */}
      <MPCard reveal>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 999,
              background: T.accentSoft,
              color: T.accentPress,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: T.fontSerif,
              fontSize: 26,
              fontWeight: 600,
            }}
          >
            G
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
            <span
              style={{
                fontFamily: T.fontSerif,
                fontSize: 20,
                fontWeight: 500,
                color: T.fgStrong,
                lineHeight: 1.15,
              }}
            >
              Gwen
            </span>
            <span
              style={{
                fontFamily: T.fontSans,
                fontSize: 12,
                color: T.fg2,
                fontFeatureSettings: T.ffTabular,
              }}
            >
              Épagneul breton · 4 ans · 18 kg
            </span>
            <span style={{ fontFamily: T.fontSans, fontSize: 11, color: T.fgMuted }}>Lorient · Bretagne Sud</span>
          </div>
          <button
            style={{
              background: 'transparent',
              border: `1px solid ${T.border}`,
              borderRadius: 10,
              padding: '6px 11px',
              fontFamily: T.fontSans,
              fontSize: 12,
              fontWeight: 600,
              color: T.fgStrong,
              cursor: 'pointer',
            }}
          >
            Modifier
          </button>
        </div>
      </MPCard>

      {/* Sensors */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <MPEyebrow>Capteurs</MPEyebrow>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {SENSORS.map((s) => (
            <SensorCard key={s.id} s={s} />
          ))}
        </div>
        <MPCard tone="suppressed" bordered>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <MPIcon name="info" size={14} color={T.eliSuppressedInk} />
            <span
              style={{
                fontFamily: T.fontSans,
                fontSize: 12,
                color: T.eliSuppressedInk,
                lineHeight: 1.55,
              }}
            >
              Signal insuffisant pour interprétation sur certaines fenêtres. Observations affichées à titre informatif
              uniquement.
            </span>
          </div>
        </MPCard>
      </section>

      {/* Settings */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <MPEyebrow>Paramètres</MPEyebrow>
        <div
          style={{
            background: T.surface,
            border: `1px solid ${T.border}`,
            borderRadius: 14,
            overflow: 'hidden',
            boxShadow: '0 1px 2px rgba(31,42,54,0.05)',
          }}
          data-reveal
        >
          {SETTINGS.map((s, i) => (
            <button
              key={s.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 14px',
                width: '100%',
                background: 'transparent',
                border: 'none',
                borderTop: i === 0 ? 'none' : `1px solid ${T.divider}`,
                cursor: 'pointer',
                textAlign: 'left',
                fontFamily: 'inherit',
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background: T.cream200,
                  color: T.fg2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <MPIcon name={s.icon} size={14} color={T.fg2} />
              </div>
              <span
                style={{
                  fontFamily: T.fontSans,
                  fontSize: 13,
                  fontWeight: 500,
                  color: T.fgStrong,
                  flex: 1,
                }}
              >
                {s.label}
              </span>
              <span
                style={{
                  fontFamily: T.fontSans,
                  fontSize: 11,
                  color: T.fgMuted,
                }}
              >
                {s.meta}
              </span>
              <MPIcon name="chevron" size={12} color={T.fgHint} />
            </button>
          ))}
        </div>
      </section>

      <MPDisclaimer>
        EMOPET fournit des observations et tendances. Ce n’est pas une évaluation vétérinaire et cela ne remplace pas l’avis d’un
        vétérinaire.
      </MPDisclaimer>
    </div>
  );
}
