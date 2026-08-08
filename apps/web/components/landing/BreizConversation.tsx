'use client';

import { useEffect, useRef, useState } from 'react';

interface Message {
  sender: 'breiz' | 'gardien';
  text: string;
}

const conversation: Message[] = [
  {
    sender: 'breiz',
    text: "Tu m'avais dit que Nala adorait les longues promenades près de l'eau.",
  },
  {
    sender: 'breiz',
    text: "Il fera doux cet après-midi. J'ai trouvé une idée pas très loin.",
  },
  {
    sender: 'gardien',
    text: "Pas trop longtemps aujourd'hui.",
  },
  {
    sender: 'breiz',
    text: 'Compris. Je te propose quelque chose de plus calme.',
  },
];

export default function BreizConversation() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visibleMessages, setVisibleMessages] = useState<number[]>([]);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    if (prefersReducedMotion) {
      setVisibleMessages(conversation.map((_, i) => i));
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          conversation.forEach((_, index) => {
            setTimeout(() => {
              setVisibleMessages((prev) => [...prev, index]);
            }, index * 700);
          });
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="max-w-md mx-auto px-4">
      {/* Breiz label */}
      <div className="flex items-center gap-2 mb-6">
        <div className="w-8 h-8 rounded-full bg-[#E3EAE4] flex items-center justify-center">
          <span
            className="text-[#1E9A90] text-xs font-bold"
            style={{ fontFamily: 'var(--font-source-sans)' }}
          >
            B
          </span>
        </div>
        <span
          className="text-[#1E9A90] text-sm font-semibold"
          style={{ fontFamily: 'var(--font-source-sans)' }}
        >
          Breiz
        </span>
        <span
          className="text-[#6B7684] text-xs"
          style={{ fontFamily: 'var(--font-source-sans)' }}
        >
          · compagnon IA
        </span>
      </div>

      {/* Messages */}
      <div className="space-y-4" role="log" aria-label="Conversation avec Breiz">
        {conversation.map((msg, index) => (
          <div
            key={index}
            className={`flex ${
              msg.sender === 'gardien' ? 'justify-end' : 'justify-start'
            } transition-all duration-500 ${
              visibleMessages.includes(index)
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-4'
            }`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                msg.sender === 'breiz'
                  ? 'bg-[#E3EAE4] text-[#2E3A48] rounded-tl-sm'
                  : 'bg-[#141C25] text-[#F4EFE6] rounded-tr-sm'
              }`}
            >
              <p
                className="text-sm leading-relaxed"
                style={{ fontFamily: 'var(--font-source-sans)' }}
              >
                {msg.text}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Context note */}
      <p
        className={`text-center text-[#6B7684] text-xs mt-8 italic transition-all duration-500 ${
          visibleMessages.length === conversation.length
            ? 'opacity-100'
            : 'opacity-0'
        }`}
        style={{ fontFamily: 'var(--font-source-sans)' }}
      >
        Pas un chatbot flottant. Une présence narrative.
      </p>
    </div>
  );
}
