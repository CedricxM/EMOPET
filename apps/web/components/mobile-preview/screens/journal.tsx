'use client';

import { useRevealOnMount } from '../animations';
import { MPIcon } from '../icon';
import { MPButton, MPCard, MPEyebrow } from '../primitives';
import { T } from '../tokens';

type Entry = {
  id: string;
  date: string;
  title: string;
  body: string;
  source: 'déclaré' | 'observé';
  tone: 'accent2' | 'accent' | 'neutral';
};

const ENTRIES: Entry[] = [
  {
    id: 'j1',
    date: 'Hier · 21 h 14',
    title: 'Orage en soirée',
    body: 'Gwen est restée proche de nous. Pas de halètement marqué. Elle a fini la nuit sur son tapis.',
    source: 'déclaré',
    tone: 'neutral',
  },
  {
    id: 'j2',
    date: '14 avr. · 16 h 30',
    title: 'Sortie plage des Gâvres',
    body: 'Environ 45 min. Nage courte. Rentrée calme. Aucun veto ELI levé au retour.',
    source: 'observé',
    tone: 'accent2',
  },
  {
    id: 'j3',
    date: '12 avr. · 19 h 00',
    title: 'Invités à la maison',
    body: 'Trois personnes nouvelles. Gwen a choisi le tapis MAT plutôt que le canapé — contexte calme.',
    source: 'déclaré',
    tone: 'accent',
  },
  {
    id: 'j4',
    date: '10 avr. · 09 h 10',
    title: 'Journée calme',
    body: 'Pas d’événement particulier. Repos stable. ELI valide sur toute la journée.',
    source: 'observé',
    tone: 'neutral',
  },
];

export function JournalScreenNormal() {
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
      <div
        data-reveal
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 10 }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <MPEyebrow>Journal · 7 jours</MPEyebrow>
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
            Contexte de Gwen
          </span>
        </div>
        <MPButton size="sm" kind="secondary" leading={<MPIcon name="plus" size={14} color={T.fgStrong} />}>
          Nouvelle note
        </MPButton>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {ENTRIES.map((e) => {
          const chipColor =
            e.tone === 'accent2' ? T.lichen700 : e.tone === 'accent' ? T.accentPress : T.fg2;
          const chipBg =
            e.tone === 'accent2'
              ? T.accent2Soft
              : e.tone === 'accent'
              ? T.accentSoft
              : T.cream200;
          return (
            <MPCard key={e.id} reveal>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span
                    style={{
                      fontFamily: T.fontSans,
                      fontSize: 11,
                      color: T.fgMuted,
                      fontFeatureSettings: T.ffTabular,
                    }}
                  >
                    {e.date}
                  </span>
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: 999,
                      background: chipBg,
                      color: chipColor,
                      fontFamily: T.fontSans,
                      fontSize: 10,
                      fontWeight: 600,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                    }}
                  >
                    {e.source}
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
                  {e.title}
                </span>
                <span style={{ fontFamily: T.fontSans, fontSize: 13, color: T.fg, lineHeight: 1.55 }}>
                  {e.body}
                </span>
              </div>
            </MPCard>
          );
        })}
      </div>
    </div>
  );
}

export function JournalScreenEmpty() {
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
        gap: 20,
      }}
    >
      <div data-reveal style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <MPEyebrow>Journal</MPEyebrow>
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
          Aucune note pour l’instant
        </span>
        <span style={{ fontFamily: T.fontSans, fontSize: 13, color: T.fg2, lineHeight: 1.5 }}>
          Ajoutez du contexte (sorties, invités, changements) pour que Breiz distingue observé et déclaré.
        </span>
      </div>

      <div
        data-reveal
        style={{
          flex: 1,
          minHeight: 240,
          border: `1.5px dashed ${T.border}`,
          borderRadius: 14,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          padding: 24,
          background: T.cream50,
        }}
      >
        <MPIcon name="empty" size={30} color={T.fgHint} />
        <span
          style={{
            fontFamily: T.fontSans,
            fontSize: 12,
            color: T.fgMuted,
            textAlign: 'center',
            lineHeight: 1.55,
            maxWidth: 240,
          }}
        >
          Le journal est vide. Notez ce que vous observez, même brièvement — Breiz s’en sert pour nuancer.
        </span>
        <div style={{ marginTop: 6 }}>
          <MPButton size="sm" leading={<MPIcon name="plus" size={14} color="#FFFFFF" />}>
            Ajouter une note
          </MPButton>
        </div>
      </div>
    </div>
  );
}
