'use client';

/**
 * Hook de conversation Breiz partagé (Phase 3 — Breiz compagnon, pas destination).
 *
 * Source UNIQUE de la logique d'échange, utilisée par la page `/breiz` ET par le
 * panneau flottant global. Garantit les mêmes garde-fous partout :
 *  - appel `/api/breiz` (moteur régional + garde-fous de `lib/regional/engine.ts`,
 *    + chemin verrouillé si la réponse touche une donnée ELI) ;
 *  - repli sur la base RAG locale (`askBreiz`) si la route est indisponible.
 *
 * Breiz observe, met en contexte, suggère — ne formule jamais d'évaluation
 * vétérinaire (cf. invariants). Cette discipline vit dans le prompt système et
 * le corpus, pas ici : ce hook ne fait que router et exposer l'état.
 */

import { useCallback, useState } from 'react';
import { askBreiz } from './index';

export interface BreizMessage {
  id: string;
  from: 'bleiz' | 'user';
  text: string;
  sources?: string[];
  tone?: 'calm' | 'neutral';
  /** Réponse touchant une donnée ELI → marqueur « ton factuel verrouillé ». */
  eli?: boolean;
}

export interface UseBreizChat {
  messages: BreizMessage[];
  thinking: boolean;
  send: (text: string) => Promise<void>;
}

export function useBreizChat(initial: BreizMessage[] = []): UseBreizChat {
  const [messages, setMessages] = useState<BreizMessage[]>(initial);
  const [thinking, setThinking] = useState(false);

  const send = useCallback(async (raw: string) => {
    const text = raw.trim();
    if (!text || thinking) return;
    setMessages((prev) => [...prev, { id: `u-${Date.now()}`, from: 'user', text }]);
    setThinking(true);
    try {
      let eli = false;
      let answer: { text: string; sources: string[] } | null = null;
      try {
        const res = await fetch('/api/breiz', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ userMessage: text }),
        });
        if (res.ok) {
          const data = (await res.json()) as { via: string; text?: string; sources?: string[]; touchesEliData?: boolean };
          eli = !!data.touchesEliData;
          if (data.via === 'model' && data.text) answer = { text: data.text, sources: data.sources ?? [] };
        }
      } catch {
        /* route indisponible → repli RAG */
      }
      if (!answer) answer = await askBreiz(text);
      setMessages((prev) => [...prev, { id: `b-${Date.now()}`, from: 'bleiz', tone: 'calm', text: answer!.text, sources: answer!.sources, eli }]);
    } finally {
      setThinking(false);
    }
  }, [thinking]);

  return { messages, thinking, send };
}
