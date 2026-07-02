'use client';

import { useState } from 'react';
import { animatePress, useMessageAppear, useRevealOnMount } from '../animations';
import { MPIcon } from '../icon';
import { MPCard, MPEyebrow, MPPill } from '../primitives';
import { T } from '../tokens';

type Message = {
  id: string;
  from: 'user' | 'breiz';
  text: string;
  sources?: string[];
};

const CONVO: Message[] = [
  {
    id: 'u1',
    from: 'user',
    text: 'Pourquoi Gwen tourne-t-elle autour de la porte entre 7 h 30 et 8 h ?',
  },
  {
    id: 'b1',
    from: 'breiz',
    text:
      "Sur 6 des 7 derniers matins, une courte phase d'éveil est observée de 7 h 40 à 7 h 55 — juste avant votre sortie. C’est un motif stable, pas un signe clinique.",
    sources: ['MAT · fenêtre 7 h 30 – 8 h 00', 'ELI valide · 9 h 42 capturées'],
  },
  {
    id: 'u2',
    from: 'user',
    text: 'Est-ce que ça veut dire que son activité augmente ?',
  },
  {
    id: 'b2',
    from: 'breiz',
    text:
      "Je ne peux pas interpréter un état émotionnel. Ce que j’observe : un motif répété, sans pic d’activité inhabituel et sans fragmentation du repos sur cette fenêtre. Si vous voulez approfondir, un vétérinaire pourra examiner le contexte.",
    sources: ['Motif répété ≥ 6 j', 'Aucun veto ELI levé'],
  },
];

function ChatHeader() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '14px 20px 12px',
        borderBottom: `1px solid ${T.divider}`,
        background: T.cream50,
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 999,
          background: T.accentSoft,
          color: T.accentPress,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <MPIcon name="wave" size={18} color={T.accentPress} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
        <span
          style={{
            fontFamily: T.fontSerif,
            fontSize: 18,
            fontWeight: 500,
            color: T.fgStrong,
            lineHeight: 1,
          }}
        >
          Breiz
        </span>
        <span style={{ fontFamily: T.fontSans, fontSize: 11, color: T.lichen700, fontWeight: 600 }}>
          Tonalité calme · observations non-médicales
        </span>
      </div>
      <MPPill state="valid" label="Valide" />
    </div>
  );
}

function Composer({ placeholder }: { placeholder?: string }) {
  const [draft, setDraft] = useState('');
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setDraft('');
      }}
      style={{
        display: 'flex',
        gap: 8,
        padding: '10px 14px 12px',
        borderTop: `1px solid ${T.divider}`,
        background: T.cream50,
        alignItems: 'center',
        flexShrink: 0,
      }}
    >
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={placeholder ?? 'Posez une question à Breiz…'}
        style={{
          flex: 1,
          height: 38,
          padding: '0 14px',
          borderRadius: 999,
          border: `1px solid ${T.border}`,
          background: T.surface,
          fontFamily: T.fontSans,
          fontSize: 13,
          color: T.fgStrong,
          outline: 'none',
        }}
      />
      <button
        type="submit"
        onClick={(e) => animatePress(e.currentTarget)}
        style={{
          width: 38,
          height: 38,
          borderRadius: 999,
          background: T.accent,
          color: '#FFFFFF',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <MPIcon name="send" size={14} color="#FFFFFF" />
      </button>
    </form>
  );
}

/* ---------- Normal: conversation about Gwen ---------- */

export function ChatScreenNormal() {
  const ref = useMessageAppear(true);
  return (
    <>
      <ChatHeader />
      <div
        ref={ref}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 18px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        {CONVO.map((m) =>
          m.from === 'breiz' ? (
            <div
              key={m.id}
              data-msg
              style={{ display: 'flex', gap: 10, alignItems: 'flex-start', maxWidth: '86%' }}
            >
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 999,
                  background: T.accentSoft,
                  color: T.accentPress,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginTop: 4,
                }}
              >
                <MPIcon name="wave" size={12} color={T.accentPress} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div
                  style={{
                    background: T.surface,
                    border: `1px solid ${T.border}`,
                    borderRadius: 14,
                    padding: '12px 14px',
                    fontFamily: T.fontSans,
                    fontSize: 13,
                    lineHeight: 1.55,
                    color: T.fg,
                  }}
                >
                  {m.text}
                </div>
                {m.sources && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3, paddingLeft: 2 }}>
                    <MPEyebrow>Sources</MPEyebrow>
                    {m.sources.map((s) => (
                      <span
                        key={s}
                        style={{
                          fontFamily: T.fontSans,
                          fontSize: 11,
                          color: T.fgMuted,
                          lineHeight: 1.5,
                        }}
                      >
                        — {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div
              key={m.id}
              data-msg
              style={{
                alignSelf: 'flex-end',
                maxWidth: '80%',
                background: T.accentSoft,
                border: `1px solid ${T.accentSoftBorder}`,
                color: T.fgStrong,
                padding: '11px 14px',
                borderRadius: 14,
                fontFamily: T.fontSans,
                fontSize: 13,
                lineHeight: 1.55,
              }}
            >
              {m.text}
            </div>
          ),
        )}
        <div
          data-msg
          style={{
            marginTop: 4,
            padding: '8px 12px',
            background: T.prudenceBg,
            border: `1px solid ${T.prudenceBorder}`,
            color: T.prudenceInk,
            borderRadius: 10,
            fontFamily: T.fontSans,
            fontSize: 11,
            lineHeight: 1.5,
            alignSelf: 'center',
            textAlign: 'center',
          }}
        >
          Breiz rappelle observé · déclaré · interprétation — jamais d’évaluation vétérinaire.
        </div>
      </div>
      <Composer />
    </>
  );
}

/* ---------- Empty: suggestion cards ---------- */

export function ChatScreenEmpty() {
  const ref = useRevealOnMount(true);
  const SUGGESTIONS = [
    'Comment Gwen a-t-elle dormi cette nuit ?',
    'Y a-t-il un motif récurrent ce matin ?',
    'Que signifie “signal insuffisant” ?',
    'Aide-moi à interpréter ces 7 derniers jours.',
  ];
  return (
    <>
      <ChatHeader />
      <div
        ref={ref}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px 20px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <div data-reveal style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <MPEyebrow>Conversation · nouvelle</MPEyebrow>
          <span
            style={{
              fontFamily: T.fontSerif,
              fontSize: 22,
              fontWeight: 500,
              color: T.fgStrong,
              lineHeight: 1.25,
              letterSpacing: 0,
            }}
          >
            Que souhaitez-vous observer avec Breiz ?
          </span>
          <span style={{ fontFamily: T.fontSans, fontSize: 12, color: T.fg2, lineHeight: 1.5 }}>
            Breiz s’appuie sur des données observées et des déclarations. Il ne formule pas d’évaluation vétérinaire.
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {SUGGESTIONS.map((s) => (
            <MPCard key={s} reveal>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                }}
              >
                <span style={{ fontFamily: T.fontSans, fontSize: 13, color: T.fgStrong, lineHeight: 1.45 }}>
                  {s}
                </span>
                <MPIcon name="chevron" size={14} color={T.fgHint} />
              </div>
            </MPCard>
          ))}
        </div>
      </div>
      <Composer />
    </>
  );
}
