'use client';

/**
 * BreizDock — accès global à Breiz (Phase 3 : compagnon, pas destination).
 *
 * Bouton flottant discret (charte emopet) ouvrant un panneau de conversation
 * compact depuis n'importe quelle page applicative (jamais la landing — géré
 * par AppFrame). Réutilise `useBreizChat` → mêmes garde-fous que la page /breiz.
 */

import { useEffect, useRef, useState } from 'react';
import { Icon } from '../ui';
import { useBreizChat } from '../../lib/breiz-rag/useBreizChat';

const GREETING = {
  id: 'dock-greeting',
  from: 'bleiz' as const,
  tone: 'calm' as const,
  text: 'Bonjour — je peux t’aider sur le comportement, les balades, les races ou la lecture de tes indicateurs. Que veux-tu observer ?',
};

export function BreizDock() {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const { messages, thinking, send } = useBreizChat([GREETING]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, thinking, open]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    await send(text);
  }

  return (
    <>
      {/* Bouton flottant */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Fermer Breiz' : 'Ouvrir Breiz'}
        aria-expanded={open}
        style={{
          position: 'fixed', right: 20, bottom: 20, zIndex: 50,
          width: 52, height: 52, borderRadius: 'var(--radius-pill)',
          background: 'var(--emopet-navy)', color: 'var(--cream-50)',
          border: '1px solid rgba(246,239,231,0.18)', boxShadow: 'var(--shadow-lg)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
        }}
      >
        <Icon name={open ? 'close' : 'chat'} size={22} />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Breiz"
          style={{
            position: 'fixed', right: 20, bottom: 84, zIndex: 50,
            width: 'min(360px, calc(100vw - 40px))', maxHeight: 'min(540px, calc(100vh - 120px))',
            display: 'flex', flexDirection: 'column',
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)', overflow: 'hidden',
          }}
        >
          {/* En-tête */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderBottom: '1px solid var(--divider)' }}>
            <div style={{ width: 30, height: 30, borderRadius: 'var(--radius-pill)', background: 'var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-press)' }}>
              <Icon name="wave" size={16} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 'var(--weight-semi)', fontSize: 'var(--text-md)', color: 'var(--fg-strong)' }}>Breiz</span>
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-xxs)', color: 'var(--lichen-700)', fontWeight: 'var(--weight-semi)' }}>Observations non-médicales</span>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {messages.map((m) =>
              m.from === 'bleiz' ? (
                <div key={m.id} style={{ display: 'flex', flexDirection: 'column', gap: 4, maxWidth: '92%' }}>
                  {m.eli && (
                    <span style={{ alignSelf: 'flex-start', fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--fg-muted)', background: 'var(--bg-sunk)', padding: '2px 7px', borderRadius: 'var(--radius-pill)', border: '1px solid var(--border)' }}>
                      ⊙ donnée ELI · ton verrouillé
                    </span>
                  )}
                  <p style={{ margin: 0, fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)', color: 'var(--fg)', lineHeight: 'var(--lh-normal)' }}>{m.text}</p>
                </div>
              ) : (
                <div key={m.id} style={{ alignSelf: 'flex-end', maxWidth: '85%', padding: '8px 12px', background: 'var(--accent-soft)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--accent-soft-border)' }}>
                  <p style={{ margin: 0, fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)', color: 'var(--fg-strong)' }}>{m.text}</p>
                </div>
              ),
            )}
            {thinking && (
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-xs)', color: 'var(--fg-muted)', fontStyle: 'italic' }}>Breiz consulte ses fiches…</span>
            )}
          </div>

          {/* Saisie */}
          <form onSubmit={submit} style={{ display: 'flex', gap: 8, padding: 12, borderTop: '1px solid var(--divider)', background: 'var(--surface-2)' }}>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Poser une question…"
              aria-label="Votre message à Breiz"
              style={{ flex: 1, height: 36, padding: '0 12px', borderRadius: 'var(--radius-pill)', border: '1px solid var(--border)', background: 'var(--surface)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)', color: 'var(--fg-strong)' }}
            />
            <button type="submit" aria-label="Envoyer" disabled={thinking || !draft.trim()} style={{ width: 36, height: 36, borderRadius: 'var(--radius-pill)', background: 'var(--accent)', color: 'var(--accent-ink)', border: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: thinking || !draft.trim() ? 'not-allowed' : 'pointer', opacity: thinking || !draft.trim() ? 0.55 : 1 }}>
              <Icon name="send" size={15} />
            </button>
          </form>

          <p style={{ margin: 0, padding: '8px 14px', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-xxs)', color: 'var(--fg-muted)', textAlign: 'center', borderTop: '1px solid var(--divider)' }}>
            Breiz ne formule pas d’évaluation vétérinaire.
          </p>
        </div>
      )}
    </>
  );
}
