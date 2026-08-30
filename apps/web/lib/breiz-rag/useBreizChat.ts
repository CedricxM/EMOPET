'use client';

/**
 * Hook de conversation Breiz partagé.
 *
 * Breiz observe, met en contexte, suggère — ne formule jamais d'évaluation
 * vétérinaire. Le hook expose aussi les métadonnées de transparence afin que
 * toutes les surfaces puissent distinguer le mode IA/retrieval et le niveau
 * d'évidence sans l'inventer côté UI.
 */

import { useCallback, useState } from 'react';
import { askBreiz } from './index';

export type BreizEvidenceLevel = 'measured' | 'preprocessed' | 'inferred' | 'mixed_or_inferred' | 'external_context' | 'unknown';

export interface BreizTransparency {
  aiSystem: boolean;
  responseMode: 'model' | 'retrieval';
  evidenceLevel: BreizEvidenceLevel;
  medicalStatus: 'non_diagnostic';
  modelProvider?: string;
  modelId?: string;
}

export interface BreizMessage {
  id: string;
  from: 'bleiz' | 'user';
  text: string;
  sources?: string[];
  tone?: 'calm' | 'neutral';
  /** Réponse touchant une donnée ELI → marqueur « ton factuel verrouillé ». */
  eli?: boolean;
  transparency?: BreizTransparency;
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
      let transparency: BreizTransparency | undefined;
      let answer: { text: string; sources: string[] } | null = null;
      try {
        const res = await fetch('/api/breiz', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ userMessage: text }),
        });
        if (res.ok) {
          const data = (await res.json()) as {
            via: string;
            text?: string;
            sources?: string[];
            touchesEliData?: boolean;
            transparency?: BreizTransparency;
          };
          eli = !!data.touchesEliData;
          transparency = data.transparency;
          if (data.via === 'model' && data.text) answer = { text: data.text, sources: data.sources ?? [] };
        }
      } catch {
        /* route indisponible → repli RAG */
      }
      if (!answer) {
        answer = await askBreiz(text);
        transparency ??= {
          aiSystem: true,
          responseMode: 'retrieval',
          evidenceLevel: 'external_context',
          medicalStatus: 'non_diagnostic',
        };
      }
      setMessages((prev) => [...prev, {
        id: `b-${Date.now()}`,
        from: 'bleiz',
        tone: 'calm',
        text: answer!.text,
        sources: answer!.sources,
        eli,
        transparency,
      }]);
    } finally {
      setThinking(false);
    }
  }, [thinking]);

  return { messages, thinking, send };
}
