'use client';

import { useState } from 'react';
import { ContentShell } from '../../components/content-shell';
import { LocalKnowledgePanel } from '../../components/breiz/LocalKnowledgePanel';
import { Button, Card, Eyebrow, H2, Icon, P, P2, Pill } from '../../components/ui';
import { useBreizChat, type BreizMessage } from '../../lib/breiz-rag/useBreizChat';
import styles from '../../styles/living-pages.module.css';

type Conversation = {
  id: string;
  title: string;
  preview: string;
  date: string;
  active?: boolean;
};

type Message = BreizMessage;

const CONVERSATIONS: Conversation[] = [
  { id: 'c1', title: "RÃ©veils matinaux de Gus", preview: "Il semble anticiper vos dÃ©partsâ€¦", date: "Auj.", active: true },
  { id: 'c2', title: 'Sorties plus courtes ?', preview: 'Sur 7 jours la moyenne baisse un peuâ€¦', date: 'Hier' },
  { id: 'c3', title: 'Nuit du 14 avril', preview: 'Interruptions de repos entre 2 h et 4 hâ€¦', date: '14 avr.' },
  { id: 'c4', title: 'Retour au calme', preview: "Gus met 8 Ã  14 min Ã  revenirâ€¦", date: '10 avr.' },
];

const MESSAGES: Message[] = [
  {
    id: 'm1',
    from: 'user',
    text: "Pourquoi Gus s'agite-t-il le matin avant que je parte ?",
  },
  {
    id: 'm2',
    from: 'bleiz',
    tone: 'calm',
    text:
      "Sur les 6 derniers matins, une courte phase d'Ã©veil de Gus est observÃ©e entre 7 h 40 et 7 h 55 â€” juste avant votre sortie habituelle Ã  8 h. C'est une observation de rythme, pas une Ã©valuation vÃ©tÃ©rinaire.",
    sources: ['MAT Â· fenÃªtre 7 h 30 â€“ 8 h 00', 'ELI valide Â· capture 142 min'],
  },
  {
    id: 'm3',
    from: 'user',
    text: "Est-ce que c'est un signe d'agitation ?",
  },
  {
    id: 'm4',
    from: 'bleiz',
    tone: 'calm',
    text:
      "Je ne peux pas interprÃ©ter un Ã©tat Ã©motionnel. Ce que j'observe : une rÃ©pÃ©tition du motif sur plusieurs jours, sans pic d'activitÃ© inhabituel ni variation marquÃ©e du repos. Si vous souhaitez approfondir, un vÃ©tÃ©rinaire pourra examiner le contexte.",
    sources: ['Motif rÃ©pÃ©tÃ© â‰¥ 6 j', 'Pas de veto levÃ©'],
  },
];

export default function BreizPage() {
  const [draft, setDraft] = useState('');
  // Logique d'Ã©change partagÃ©e avec le panneau flottant (mÃªmes garde-fous).
  const { messages, thinking, send: sendMessage } = useBreizChat(MESSAGES);

  async function send() {
    const text = draft.trim();
    if (!text || thinking) return;
    setDraft('');
    await sendMessage(text);
  }

  return (
    <ContentShell>
    <div className={styles.breizShell}>

      <aside
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          paddingRight: 4,
          overflowY: 'auto',
        }}
      >
        <div className={styles.breizNote}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
            <Eyebrow>Conversations</Eyebrow>
            <Button kind="ghost" size="sm" leading={<Icon name="plus" size={14} />}>
              Nouvelle
            </Button>
          </div>
          <P2 style={{ marginTop: 8 }}>Breiz croise les notes, les sources locales et les fenetres fiables sans conclure a la place du proprietaire.</P2>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {CONVERSATIONS.map((c) => (
            <button
              key={c.id}
              style={{
                textAlign: 'left',
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                background: c.active ? 'var(--accent-soft)' : 'var(--surface)',
                border: `1px solid ${c.active ? 'var(--accent-soft-border)' : 'var(--border)'}`,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: 'var(--text-md)',
                    fontWeight: 'var(--weight-medium)',
                    color: 'var(--fg-strong)',
                  }}
                >
                  {c.title}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: 'var(--text-xxs)',
                    color: 'var(--fg-muted)',
                    fontFeatureSettings: 'var(--ff-tabular)',
                  }}
                >
                  {c.date}
                </span>
              </div>
              <span
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: 'var(--text-xs)',
                  color: 'var(--fg-2)',
                }}
              >
                {c.preview}
              </span>
            </button>
          ))}
        </div>
        <LocalKnowledgePanel />
      </aside>

      <div className={styles.chatCard}>
      <Card padding={0} bordered>
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '16px 20px',
              borderBottom: '1px solid var(--divider)',
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 'var(--radius-pill)',
                background: 'var(--accent-soft)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-press)',
              }}
            >
              <Icon name="wave" size={18} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <H2 style={{ fontSize: 'var(--text-xl)' }}>Breiz</H2>
              <span
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: 'var(--text-xs)',
                  color: 'var(--lichen-700)',
                  fontWeight: 'var(--weight-semi)',
                }}
              >
                TonalitÃ© calme Â· observations non-mÃ©dicales
              </span>
            </div>
            <div style={{ marginLeft: 'auto' }}>
              <Pill state="valid" label="ELI valide" showDot />
            </div>
          </div>

          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '24px 28px',
              display: 'flex',
              flexDirection: 'column',
              gap: 20,
            }}
          >
            {messages.map((m) =>
              m.from === 'bleiz' ? (
                <div key={m.id} style={{ display: 'flex', gap: 12, maxWidth: '82%' }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 'var(--radius-pill)',
                      background: 'var(--accent-soft)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--accent-press)',
                      flexShrink: 0,
                      marginTop: 2,
                    }}
                  >
                    <Icon name="wave" size={14} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {m.eli && (
                      <span style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 6, padding: '2px 9px', borderRadius: 'var(--radius-pill)', background: 'var(--bg-sunk)', border: '1px solid var(--border)', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--fg-muted)' }}>
                        âŠ™ DonnÃ©e ELI Â· ton factuel verrouillÃ©
                      </span>
                    )}
                    <P>{m.text}</P>
                    {m.sources && (
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 4,
                          paddingTop: 8,
                          borderTop: '1px dashed var(--border-strong)',
                        }}
                      >
                        <Eyebrow>Sources</Eyebrow>
                        {m.sources.map((s) => (
                          <span
                            key={s}
                            style={{
                              fontFamily: 'var(--font-sans)',
                              fontSize: 'var(--text-xs)',
                              color: 'var(--fg-muted)',
                            }}
                          >
                            â€” {s}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div
                  key={m.id}
                  style={{
                    alignSelf: 'flex-end',
                    maxWidth: '72%',
                    padding: '12px 16px',
                    background: 'var(--accent-soft)',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--accent-soft-border)',
                  }}
                >
                  <P style={{ color: 'var(--fg-strong)' }}>{m.text}</P>
                </div>
              ),
            )}
            {thinking && (
              <div style={{ display: 'flex', gap: 12, maxWidth: '82%', alignItems: 'center' }}>
                <div style={{ width: 28, height: 28, borderRadius: 'var(--radius-pill)', background: 'var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-press)', flexShrink: 0 }}>
                  <Icon name="wave" size={14} />
                </div>
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)', color: 'var(--fg-muted)', fontStyle: 'italic' }}>
                  Breiz consulte ses fichesâ€¦
                </span>
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
            style={{
              display: 'flex',
              gap: 10,
              padding: '14px 20px',
              borderTop: '1px solid var(--divider)',
              background: 'var(--surface-2)',
              alignItems: 'center',
            }}
          >
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Posez une question Ã  Breizâ€¦"
              aria-label="Votre message Ã  Breiz"
              style={{
                flex: 1,
                height: 40,
                padding: '0 14px',
                borderRadius: 'var(--radius-pill)',
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                fontFamily: 'var(--font-sans)',
                fontSize: 'var(--text-sm)',
                color: 'var(--fg-strong)',
              }}
            />
            <Button kind="primary" size="md" type="submit" trailing={<Icon name="send" size={14} />}>
              Envoyer
            </Button>
          </form>

          <P2
            style={{
              padding: '10px 20px 14px',
              borderTop: '1px solid var(--divider)',
              color: 'var(--fg-muted)',
              textAlign: 'center',
            }}
          >
            Breiz ne formule pas d'Ã©valuation vÃ©tÃ©rinaire. Il rappelle ce qui est observÃ©, dÃ©clarÃ©, ou interprÃ©tÃ©.
          </P2>
        </div>
      </Card>
      </div>
    </div>
    </ContentShell>
  );
}




