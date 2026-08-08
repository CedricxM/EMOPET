'use client';

import { useEffect, useRef, useState } from 'react';

const cards = [
  { label: 'LAST NIGHT', icon: '🌙', color: 'bg-[#E3EAE4]' },
  { label: 'MOMENTS', icon: '✨', color: 'bg-[#F7E5DA]' },
  { label: 'TODAY', icon: '☀️', color: 'bg-[#FAF7F1]' },
  { label: 'ACTIVITY', icon: '🐾', color: 'bg-[#E3EAE4]' },
  { label: 'MEMORIES', icon: '💛', color: 'bg-[#F7E5DA]' },
];

export default function AppMockup() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [showCards, setShowCards] = useState(false);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    if (prefersReducedMotion) {
      setIsVisible(true);
      setShowCards(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          setTimeout(() => setShowCards(true), 800);
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="max-w-sm mx-auto px-4">
      {/* Phone mockup frame */}
      <div
        className={`relative bg-[#FAF7F1] rounded-[2.5rem] border-2 border-[#ECE5D7] shadow-xl p-6 pt-10 pb-8 transition-all duration-700 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
        }`}
      >
        {/* Status bar */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-20 h-1 rounded-full bg-[#DDD4C2]" />

        {/* Welcome message */}
        <div className="space-y-3 mb-8">
          <p
            className="text-[#141C25] text-lg font-medium"
            style={{ fontFamily: 'var(--font-fraunces)' }}
          >
            Bonjour.
          </p>
          <div
            className="space-y-1.5 text-[#4A5766] text-sm leading-relaxed"
            style={{ fontFamily: 'var(--font-source-sans)' }}
          >
            <p>Nala a passé une nuit plutôt stable.</p>
            <p>Elle s&apos;est réveillée plusieurs fois vers la fin de la nuit.</p>
            <p className="text-[#2CB7AB] font-medium pt-1">
              Tu veux voir les moments importants ?
            </p>
          </div>
        </div>

        {/* Cards grid */}
        <div className="grid grid-cols-2 gap-3">
          {cards.map((card, index) => (
            <div
              key={card.label}
              className={`${card.color} rounded-xl p-4 border border-[#ECE5D7] transition-all duration-500 ${
                showCards
                  ? 'opacity-100 translate-y-0'
                  : 'opacity-0 translate-y-4'
              } ${index === cards.length - 1 ? 'col-span-2' : ''}`}
              style={{
                transitionDelay: showCards ? `${index * 100}ms` : '0ms',
              }}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg" role="img" aria-hidden="true">
                  {card.icon}
                </span>
                <span
                  className="text-[#2E3A48] text-xs font-semibold tracking-wide uppercase"
                  style={{ fontFamily: 'var(--font-source-sans)' }}
                >
                  {card.label}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
