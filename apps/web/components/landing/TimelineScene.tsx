'use client';

import { useEffect, useRef, useState } from 'react';

interface TimelineEntry {
  time: string;
  text: string;
}

const entries: TimelineEntry[] = [
  { time: '02:14', text: 'Il change de position.' },
  { time: '03:06', text: 'Il se réveille quelques instants.' },
  { time: '04:21', text: 'Son repos devient plus agité.' },
  { time: '07:42', text: 'Vous vous réveillez.' },
];

export default function TimelineScene() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visibleItems, setVisibleItems] = useState<number[]>([]);
  const [showRevelation, setShowRevelation] = useState(false);
  const [showMessage, setShowMessage] = useState(false);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    if (prefersReducedMotion) {
      setVisibleItems([0, 1, 2, 3]);
      setShowRevelation(true);
      setShowMessage(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          entries.forEach((_, index) => {
            setTimeout(() => {
              setVisibleItems((prev) => [...prev, index]);
            }, index * 600);
          });

          setTimeout(() => setShowRevelation(true), entries.length * 600 + 400);
          setTimeout(() => setShowMessage(true), entries.length * 600 + 1200);

          observer.disconnect();
        }
      },
      { threshold: 0.3, rootMargin: '0px 0px -60px 0px' }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="max-w-2xl mx-auto px-4">
      {/* Timeline entries */}
      <div className="space-y-6 mb-12">
        {entries.map((entry, index) => (
          <div
            key={index}
            className={`flex items-baseline gap-4 transition-all duration-500 ${
              visibleItems.includes(index)
                ? 'opacity-100 translate-x-0'
                : 'opacity-0 -translate-x-4'
            }`}
          >
            <span
              className="text-[#6B7684] font-mono text-sm tabular-nums shrink-0"
              style={{ fontFamily: 'var(--font-source-sans)' }}
            >
              {entry.time}
            </span>
            <span className="w-2 h-2 rounded-full bg-[#C97B5A] shrink-0 relative top-1" />
            <span
              className="text-[#2E3A48] text-base md:text-lg"
              style={{ fontFamily: 'var(--font-source-sans)' }}
            >
              {entry.text}
            </span>
          </div>
        ))}
      </div>

      {/* Revelation */}
      <div
        className={`text-center space-y-8 transition-all duration-700 ${
          showRevelation ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
      >
        <div className="space-y-1">
          <p
            className="text-[#141C25] text-2xl md:text-3xl font-light"
            style={{ fontFamily: 'var(--font-fraunces)' }}
          >
            Vous étiez là.
          </p>
          <p
            className="text-[#141C25] text-2xl md:text-3xl font-light"
            style={{ fontFamily: 'var(--font-fraunces)' }}
          >
            Mais vous dormiez.
          </p>
        </div>

        <p
          className={`text-[#4A5766] text-base md:text-lg max-w-md mx-auto leading-relaxed transition-all duration-700 delay-300 ${
            showMessage ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
          style={{ fontFamily: 'var(--font-source-sans)' }}
        >
          EMOPET peut vous aider à mieux comprendre ce qui s&apos;est passé
          pendant que vous ne regardiez pas.
        </p>
      </div>
    </div>
  );
}
