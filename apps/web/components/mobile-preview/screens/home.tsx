'use client';

import { useCountUp, useEliBarFill, useRevealOnMount } from '../animations';
import { MPIcon } from '../icon';
import { MPCard, MPDisclaimer, MPEyebrow, MPPill } from '../primitives';
import { T } from '../tokens';

const SCROLL: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  padding: '16px 20px 24px',
  display: 'flex',
  flexDirection: 'column',
  gap: 14,
};

function Greeting({ eyebrow, title, sub }: { eyebrow: string; title: string; sub?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }} data-reveal>
      <MPEyebrow>{eyebrow}</MPEyebrow>
      <span
        style={{
          fontFamily: T.fontSerif,
          fontSize: 30,
          fontWeight: 500,
          lineHeight: 1.15,
          color: T.fgStrong,
          letterSpacing: 0,
        }}
      >
        {title}
      </span>
      {sub && (
        <span
          style={{
            fontFamily: T.fontSans,
            fontSize: 13,
            color: T.fg2,
            lineHeight: 1.5,
          }}
        >
          {sub}
        </span>
      )}
    </div>
  );
}

/* -------------- Normal state -------------- */

export function HomeScreenNormal() {
  const ref = useRevealOnMount(true);
  const countRef = useCountUp(87, true);
  const barRef = useEliBarFill(87, true);

  return (
    <div ref={ref} style={SCROLL}>
      <Greeting
        eyebrow="Bonjour Cédric"
        title="Gwen · contexte calme"
        sub="Observations basées sur 9 h 42 de signal valide depuis hier."
      />

      {/* ELI card */}
      <MPCard reveal>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <MPEyebrow>ELI · Indice de lecture</MPEyebrow>
            <MPPill state="valid" />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span
              ref={countRef}
              style={{
                fontFamily: T.fontSerif,
                fontSize: 48,
                fontWeight: 500,
                color: T.fgStrong,
                letterSpacing: 0,
                fontFeatureSettings: T.ffTabular,
                lineHeight: 1,
              }}
            >
              0
            </span>
            <span
              style={{
                fontFamily: T.fontSans,
                fontSize: 14,
                color: T.fgMuted,
                fontFeatureSettings: T.ffTabular,
              }}
            >
              / 100 · lecture fiable
            </span>
          </div>
          <div
            style={{
              height: 6,
              background: T.eliValidBg,
              borderRadius: 999,
              overflow: 'hidden',
            }}
          >
            <div
              ref={barRef}
              style={{ height: '100%', width: '0%', background: T.eliValid, borderRadius: 999 }}
            />
          </div>
          <span
            style={{
              fontFamily: T.fontSans,
              fontSize: 12,
              color: T.fg2,
              lineHeight: 1.5,
            }}
          >
            Signal MAT + TAG stable sur les 6 dernières heures. Observation, pas une évaluation vétérinaire.
          </span>
        </div>
      </MPCard>

      {/* Repos card (degraded) */}
      <MPCard reveal>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <MPEyebrow>Repos nocturne</MPEyebrow>
            <MPPill state="degraded" />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span
              style={{
                fontFamily: T.fontSerif,
                fontSize: 28,
                fontWeight: 500,
                color: T.fgStrong,
                fontFeatureSettings: T.ffTabular,
              }}
            >
              6 h 48
            </span>
            <span
              style={{
                fontFamily: T.fontSans,
                fontSize: 12,
                color: T.fgMuted,
                fontFeatureSettings: T.ffTabular,
              }}
            >
              · 3 interruptions observées
            </span>
          </div>
          <span
            style={{
              fontFamily: T.fontSans,
              fontSize: 12,
              color: T.fg2,
              lineHeight: 1.5,
            }}
          >
            Fenêtre 23 h – 7 h. Signal MAT dégradé entre 2 h et 4 h — interprétation prudente.
          </span>
        </div>
      </MPCard>

      {/* Anticipation (terracotta) */}
      <MPCard tone="accent" bordered reveal>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <MPEyebrow style={{ color: T.accentPress }}>Motif récurrent · observé</MPEyebrow>
            <MPIcon name="wave" size={16} color={T.accentPress} />
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
            Courte phase d’éveil 7 h 40 – 7 h 55, sur 6 matins sur 7.
          </span>
          <span
            style={{
              fontFamily: T.fontSans,
              fontSize: 12,
              color: T.fg2,
              lineHeight: 1.5,
            }}
          >
            Breiz peut détailler ce motif. Pas d’interprétation émotionnelle.
          </span>
        </div>
      </MPCard>

      <MPDisclaimer>
        EMOPET fournit des observations et tendances. Ce n’est pas une évaluation vétérinaire et cela ne remplace pas l’avis d’un
        vétérinaire.
      </MPDisclaimer>
    </div>
  );
}

/* -------------- Suppressed state -------------- */

export function HomeScreenSuppressed() {
  const ref = useRevealOnMount(true);
  return (
    <div ref={ref} style={SCROLL}>
      <Greeting
        eyebrow="Bonjour Cédric"
        title="Gwen · signal insuffisant"
        sub="Données partielles sur les dernières heures. Interprétation suspendue."
      />

      <MPCard tone="suppressed" bordered reveal>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <MPEyebrow style={{ color: T.eliSuppressedInk }}>ELI · Indice de lecture</MPEyebrow>
            <MPPill state="suppressed" />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <span
              style={{
                fontFamily: T.fontSerif,
                fontSize: 48,
                fontWeight: 400,
                fontStyle: 'italic',
                color: T.eliSuppressedInk,
                letterSpacing: 0,
                lineHeight: 1,
              }}
            >
              — —
            </span>
            <span
              style={{
                fontFamily: T.fontSans,
                fontSize: 13,
                color: T.eliSuppressedInk,
              }}
            >
              Pas d’indice affiché
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              gap: 10,
              alignItems: 'flex-start',
              padding: '10px 12px',
              borderRadius: 10,
              background: '#F3F4F5',
              border: `1px solid ${T.eliSuppressedBg}`,
              color: T.eliSuppressedInk,
              fontFamily: T.fontSans,
              fontSize: 12,
              lineHeight: 1.5,
            }}
          >
            <MPIcon name="info" size={14} color={T.eliSuppressedInk} />
            <span>
              Signal insuffisant pour interprétation (≥ 2 h de mesure fiable requises). MAT hors portée depuis 1 h 18.
            </span>
          </div>
        </div>
      </MPCard>

      <MPCard reveal>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <MPEyebrow>Actions suggérées</MPEyebrow>
          <span
            style={{
              fontFamily: T.fontSans,
              fontSize: 13,
              color: T.fg,
              lineHeight: 1.55,
            }}
          >
            Vérifier que Gwen est bien sur son tapis, ou ajouter une note pour contextualiser cette fenêtre.
          </span>
        </div>
      </MPCard>

      <MPDisclaimer>
        Aucune interprétation n’est formulée tant que le signal reste dégradé. Pas d’évaluation vétérinaire.
      </MPDisclaimer>
    </div>
  );
}

/* -------------- First launch -------------- */

export function HomeScreenFirstLaunch() {
  const ref = useRevealOnMount(true);
  const steps = [
    {
      n: 1,
      title: 'Déclarez Gwen',
      body: 'Nom, race, âge, poids. Ces données restent sur l’appareil.',
    },
    {
      n: 2,
      title: 'Placez le tapis MAT',
      body: 'Dans la pièce de couchage principale. Le signal MAT couvre le repos.',
    },
    {
      n: 3,
      title: 'Fixez le collier TAG',
      body: 'Pour l’activité et les déplacements. Optionnel, Breiz fonctionne sans.',
    },
    {
      n: 4,
      title: 'Laissez 48 h avant la première lecture',
      body: 'EMOPET attend un signal stable avant toute interprétation.',
    },
  ];
  return (
    <div ref={ref} style={SCROLL}>
      <Greeting
        eyebrow="Bienvenue"
        title="Commençons doucement"
        sub="EMOPET observe — il n’étiquette pas l’émotion, il n’établit pas d’évaluation vétérinaire."
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {steps.map((s) => (
          <MPCard key={s.n} reveal>
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 999,
                  background: T.accentSoft,
                  color: T.accentPress,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: T.fontSerif,
                  fontSize: 17,
                  fontWeight: 600,
                  flexShrink: 0,
                }}
              >
                {s.n}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span
                  style={{
                    fontFamily: T.fontSerif,
                    fontSize: 17,
                    fontWeight: 500,
                    color: T.fgStrong,
                    lineHeight: 1.3,
                  }}
                >
                  {s.title}
                </span>
                <span style={{ fontFamily: T.fontSans, fontSize: 12, color: T.fg2, lineHeight: 1.55 }}>{s.body}</span>
              </div>
            </div>
          </MPCard>
        ))}
      </div>

      <MPDisclaimer>
        EMOPET fournit des observations et tendances. Ce n’est pas une évaluation vétérinaire et cela ne remplace pas l’avis d’un
        vétérinaire.
      </MPDisclaimer>
    </div>
  );
}
