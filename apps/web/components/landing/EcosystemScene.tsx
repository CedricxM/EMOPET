'use client';

import { useEffect, useRef, useState } from 'react';

export default function EcosystemScene() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    if (prefersReducedMotion) {
      setPhase(4);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setPhase(1), 200);
          setTimeout(() => setPhase(2), 700);
          setTimeout(() => setPhase(3), 1200);
          setTimeout(() => setPhase(4), 1800);
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
    <div ref={containerRef} className="max-w-4xl mx-auto px-4">
      {/* Central visualization */}
      <div className="relative flex items-center justify-center min-h-[320px] md:min-h-[400px]">
        {/* Center - Dog silhouette */}
        <div
          className={`relative z-10 w-24 h-24 md:w-32 md:h-32 rounded-full bg-[#F4EFE6] border-2 border-[#DDD4C2] flex items-center justify-center transition-all duration-500 ${
            phase >= 1 ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
          }`}
        >
          <span className="text-4xl md:text-5xl" role="img" aria-label="Chien">
            🐕
          </span>
        </div>

        {/* MAT - Bottom */}
        <div
          className={`absolute bottom-8 md:bottom-12 left-1/2 -translate-x-1/2 transition-all duration-600 ${
            phase >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="flex flex-col items-center gap-2">
            <div className="w-20 h-12 md:w-28 md:h-16 rounded-lg bg-[#E3EAE4] border border-[#A8BCAC] flex items-center justify-center">
              <span
                className="text-[#4F6E54] text-xs md:text-sm font-semibold"
                style={{ fontFamily: 'var(--font-source-sans)' }}
              >
                MAT
              </span>
            </div>
            <span
              className="text-[#4A5766] text-xs md:text-sm"
              style={{ fontFamily: 'var(--font-source-sans)' }}
            >
              À la maison.
            </span>
          </div>
          {/* Connector line */}
          <div className={`absolute -top-6 left-1/2 w-px h-6 bg-[#A8BCAC] transition-all duration-300 ${phase >= 2 ? 'opacity-100' : 'opacity-0'}`} />
        </div>

        {/* TAG - Left */}
        <div
          className={`absolute left-4 md:left-16 top-1/2 -translate-y-1/2 transition-all duration-600 ${
            phase >= 3 ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'
          }`}
        >
          <div className="flex flex-col items-center gap-2">
            <div className="w-14 h-14 md:w-18 md:h-18 rounded-full bg-[#F7E5DA] border border-[#E5B29D] flex items-center justify-center">
              <span
                className="text-[#9B5A3E] text-xs md:text-sm font-semibold"
                style={{ fontFamily: 'var(--font-source-sans)' }}
              >
                TAG
              </span>
            </div>
            <span
              className="text-[#4A5766] text-xs md:text-sm"
              style={{ fontFamily: 'var(--font-source-sans)' }}
            >
              En mouvement.
            </span>
          </div>
        </div>

        {/* APP - Right */}
        <div
          className={`absolute right-4 md:right-16 top-1/2 -translate-y-1/2 transition-all duration-600 ${
            phase >= 3 ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'
          }`}
        >
          <div className="flex flex-col items-center gap-2">
            <div className="w-14 h-14 md:w-18 md:h-18 rounded-lg bg-[#FAF7F1] border border-[#DDD4C2] flex items-center justify-center">
              <span
                className="text-[#141C25] text-xs md:text-sm font-semibold"
                style={{ fontFamily: 'var(--font-source-sans)' }}
              >
                APP
              </span>
            </div>
            <span
              className="text-[#4A5766] text-xs md:text-sm"
              style={{ fontFamily: 'var(--font-source-sans)' }}
            >
              Avec vous.
            </span>
          </div>
        </div>

        {/* Connecting circle (SVG) */}
        <svg
          className={`absolute inset-0 w-full h-full pointer-events-none transition-opacity duration-700 ${
            phase >= 4 ? 'opacity-100' : 'opacity-0'
          }`}
          viewBox="0 0 400 400"
          aria-hidden="true"
        >
          <circle
            cx="200"
            cy="200"
            r="140"
            fill="none"
            stroke="#DDD4C2"
            strokeWidth="1"
            strokeDasharray="4 6"
          />
        </svg>
      </div>

      {/* Bottom text */}
      <p
        className={`text-center text-[#2E3A48] text-lg md:text-xl mt-8 transition-all duration-700 ${
          phase >= 4 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
        style={{ fontFamily: 'var(--font-fraunces)' }}
      >
        Un système. Pas trois gadgets.
      </p>
    </div>
  );
}
