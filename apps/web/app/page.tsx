'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import LandingNav from '@/components/landing/LandingNav';
import SceneWrapper from '@/components/landing/SceneWrapper';
import TimelineScene from '@/components/landing/TimelineScene';
import EcosystemScene from '@/components/landing/EcosystemScene';
import AppMockup from '@/components/landing/AppMockup';
import BreizConversation from '@/components/landing/BreizConversation';
import PrivacyControls from '@/components/landing/PrivacyControls';
import LandingFooter from '@/components/landing/LandingFooter';

export default function HomePage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const [heroOffset, setHeroOffset] = useState(0);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    if (prefersReducedMotion) return;

    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          setHeroOffset(window.scrollY * 0.3);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <main className="bg-[#FAF7F1] min-h-screen">
      {/* Skip to content */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-[#141C25] focus:text-white focus:rounded-lg"
      >
        Aller au contenu principal
      </a>

      <LandingNav />

      <div id="main-content">
        {/* ═══════════════════════════════════════════════════════════════
            SCÈNE 01 — HERO
        ═══════════════════════════════════════════════════════════════ */}
        <section
          ref={heroRef}
          className="relative min-h-screen flex items-center justify-center overflow-hidden"
          aria-label="Présentation EMOPET"
        >
          {/* Background image with parallax */}
          <div
            className="absolute inset-0 z-0"
            style={{ transform: `translateY(${heroOffset}px)` }}
          >
            <Image
              src="/assets/brand/emopet-mat.png"
              alt=""
              fill
              priority
              className="object-cover opacity-20"
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[#FAF7F1]/60 via-[#FAF7F1]/40 to-[#FAF7F1]" />
          </div>

          {/* Hero content */}
          <div className="relative z-10 max-w-3xl mx-auto px-4 text-center py-32">
            <h1
              className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-[#141C25] leading-tight mb-8"
              style={{ fontFamily: 'var(--font-fraunces)' }}
            >
              Vous connaissez votre chien.
              <br />
              <span className="text-[#B46A4A]">EMOPET</span> vous aide à remarquer
              <br />
              ce qui vous échappe encore.
            </h1>

            <p
              className="text-[#4A5766] text-base md:text-lg max-w-lg mx-auto mb-10 leading-relaxed"
              style={{ fontFamily: 'var(--font-source-sans)' }}
            >
              Un système attentif qui aide les gardiens à mieux comprendre
              le quotidien de leur compagnon.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="#decouvrir"
                className="inline-flex items-center gap-2 px-8 py-4 bg-[#B46A4A] text-white text-base font-semibold rounded-full hover:bg-[#9B5A3E] transition-colors duration-200 shadow-lg shadow-[#B46A4A]/20"
                style={{ fontFamily: 'var(--font-source-sans)' }}
              >
                Découvrir EMOPET
              </a>
              <a
                href="#comment-ca-marche"
                className="inline-flex items-center gap-2 px-8 py-4 border-2 border-[#DDD4C2] text-[#2E3A48] text-base font-semibold rounded-full hover:bg-[#F4EFE6] transition-colors duration-200"
                style={{ fontFamily: 'var(--font-source-sans)' }}
              >
                Voir comment ça fonctionne
              </a>
            </div>

            {/* Status badge */}
            <div className="mt-12">
              <span
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#E3EAE4] text-[#1E9A90] text-xs font-medium rounded-full"
                style={{ fontFamily: 'var(--font-source-sans)' }}
              >
                <span className="w-2 h-2 rounded-full bg-[#2CB7AB] animate-pulse" />
                Projet en développement · Lorient, Bretagne
              </span>
            </div>
          </div>

          {/* Scroll indicator */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
              className="text-[#C6BBA4]"
            >
              <path
                d="M12 5v14m0 0l-6-6m6 6l6-6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════
            SCÈNE 02 — LES MOMENTS MANQUÉS
        ═══════════════════════════════════════════════════════════════ */}
        <SceneWrapper
          id="comment-ca-marche"
          className="py-24 md:py-32"
          ariaLabel="Les moments manqués"
        >
          <TimelineScene />
        </SceneWrapper>

        {/* ═══════════════════════════════════════════════════════════════
            SCÈNE 03 — UN SEUL ENVIRONNEMENT
        ═══════════════════════════════════════════════════════════════ */}
        <SceneWrapper
          className="py-24 md:py-32 bg-[#F4EFE6]"
          ariaLabel="Un écosystème complet"
        >
          <div className="text-center mb-12">
            <h2
              className="text-2xl md:text-4xl text-[#141C25] mb-4"
              style={{ fontFamily: 'var(--font-fraunces)' }}
            >
              Un seul environnement
            </h2>
            <p
              className="text-[#4A5766] text-base md:text-lg max-w-md mx-auto"
              style={{ fontFamily: 'var(--font-source-sans)' }}
            >
              Trois éléments qui travaillent ensemble pour un même objectif.
            </p>
          </div>
          <EcosystemScene />
        </SceneWrapper>

        {/* ═══════════════════════════════════════════════════════════════
            SCÈNE 04 — MAT
        ═══════════════════════════════════════════════════════════════ */}
        <SceneWrapper
          className="py-24 md:py-32"
          ariaLabel="Le Mat EMOPET"
        >
          <div className="max-w-3xl mx-auto px-4 text-center">
            <div className="relative mb-12">
              <div className="w-full max-w-md mx-auto aspect-[16/9] rounded-2xl bg-[#E3EAE4] border border-[#A8BCAC] flex items-center justify-center overflow-hidden">
                <Image
                  src="/assets/brand/emopet-mat.png"
                  alt="Le Mat EMOPET, une surface de repos connectée"
                  width={400}
                  height={225}
                  className="object-cover w-full h-full opacity-80"
                />
              </div>
              {/* Tech reveal overlay hint */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-full max-w-md aspect-[16/9] rounded-2xl border-2 border-dashed border-[#A8BCAC]/40" />
              </div>
            </div>
            <p className="text-center text-[#A8BCAC] text-[10px] tracking-[0.2em] uppercase mt-2" style={{ fontFamily: 'var(--font-source-sans)' }}>CONCEPT VISUAL</p>

            <h2
              className="text-2xl md:text-4xl text-[#141C25] mb-4"
              style={{ fontFamily: 'var(--font-fraunces)' }}
            >
              D&apos;abord, un endroit confortable.
            </h2>
            <p
              className="text-[#4A5766] text-base md:text-lg max-w-md mx-auto leading-relaxed mb-6"
              style={{ fontFamily: 'var(--font-source-sans)' }}
            >
              Il se repose.
              <br />
              EMOPET observe ce que le repos peut nous apprendre.
            </p>
            <p
              className="text-[#6B7684] text-sm max-w-sm mx-auto"
              style={{ fontFamily: 'var(--font-source-sans)' }}
            >
              Capteurs non invasifs intégrés dans une surface pensée
              pour le confort de votre chien.
            </p>
            <span
              className="inline-block mt-4 px-3 py-1 bg-[#F7E5DA] text-[#9B5A3E] text-xs font-medium rounded-full"
              style={{ fontFamily: 'var(--font-source-sans)' }}
            >
              EN DÉVELOPPEMENT
            </span>
          </div>
        </SceneWrapper>

        {/* ═══════════════════════════════════════════════════════════════
            SCÈNE 05 — TAG
        ═══════════════════════════════════════════════════════════════ */}
        <SceneWrapper
          className="py-24 md:py-32 bg-[#F4EFE6]"
          ariaLabel="Le Tag EMOPET"
        >
          <div className="max-w-3xl mx-auto px-4 text-center">
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-[#F7E5DA] border-2 border-[#E5B29D] flex items-center justify-center mx-auto mb-8">
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
                className="text-[#B46A4A]"
              >
                <path
                  d="M12 2L13.09 8.26L18 6L14.74 10.91L21 12L14.74 13.09L18 18L13.09 15.74L12 22L10.91 15.74L6 18L9.26 13.09L3 12L9.26 10.91L6 6L10.91 8.26L12 2Z"
                  fill="currentColor"
                />
              </svg>
            </div>

            <p className="text-center text-[#C6BBA4] text-[10px] tracking-[0.2em] uppercase mb-6" style={{ fontFamily: 'var(--font-source-sans)' }}>CONCEPT VISUAL</p>
            <h2
              className="text-2xl md:text-4xl text-[#141C25] mb-4"
              style={{ fontFamily: 'var(--font-fraunces)' }}
            >
              La continuité, dehors.
            </h2>
            <p
              className="text-[#4A5766] text-base md:text-lg max-w-md mx-auto leading-relaxed mb-6"
              style={{ fontFamily: 'var(--font-source-sans)' }}
            >
              Quand votre chien explore, le Tag fournit du contexte.
              <br />
              Pas de surveillance. De la compréhension.
            </p>
            <p
              className="text-[#6B7684] text-sm max-w-sm mx-auto"
              style={{ fontFamily: 'var(--font-source-sans)' }}
            >
              Mouvement, environnement, habitudes de promenade.
              Le Tag aide à compléter l&apos;image du quotidien.
            </p>
            <span
              className="inline-block mt-4 px-3 py-1 bg-[#F7E5DA] text-[#9B5A3E] text-xs font-medium rounded-full"
              style={{ fontFamily: 'var(--font-source-sans)' }}
            >
              EN DÉVELOPPEMENT
            </span>
          </div>
        </SceneWrapper>

        {/* ═══════════════════════════════════════════════════════════════
            SCÈNE 06 — L'APPLICATION
        ═══════════════════════════════════════════════════════════════ */}
        <SceneWrapper
          className="py-24 md:py-32"
          ariaLabel="L'application EMOPET"
        >
          <div className="text-center mb-12">
            <h2
              className="text-2xl md:text-4xl text-[#141C25] mb-4"
              style={{ fontFamily: 'var(--font-fraunces)' }}
            >
              Une voix calme dans votre journée.
            </h2>
            <p
              className="text-[#4A5766] text-base md:text-lg max-w-md mx-auto"
              style={{ fontFamily: 'var(--font-source-sans)' }}
            >
              L&apos;application rend l&apos;information compréhensible,
              sans bruit ni alarmes.
            </p>
          </div>
          <AppMockup />
          <div className="text-center mt-8">
            <span
              className="inline-block px-3 py-1 bg-[#F7E5DA] text-[#9B5A3E] text-xs font-medium rounded-full"
              style={{ fontFamily: 'var(--font-source-sans)' }}
            >
              EN DÉVELOPPEMENT
            </span>
          </div>
        </SceneWrapper>

        {/* ═══════════════════════════════════════════════════════════════
            SCÈNE 07 — BREIZ
        ═══════════════════════════════════════════════════════════════ */}
        <SceneWrapper
          id="notre-approche"
          className="py-24 md:py-32 bg-[#F4EFE6]"
          ariaLabel="Breiz, compagnon IA"
        >
          <div className="text-center mb-12">
            <h2
              className="text-2xl md:text-4xl text-[#141C25] mb-4"
              style={{ fontFamily: 'var(--font-fraunces)' }}
            >
              Une présence qui comprend votre histoire.
            </h2>
            <p
              className="text-[#4A5766] text-base md:text-lg max-w-md mx-auto"
              style={{ fontFamily: 'var(--font-source-sans)' }}
            >
              Breiz apprend de votre relation pour proposer,
              jamais pour imposer.
            </p>
          </div>
          <BreizConversation />
          <div className="text-center mt-8">
            <span
              className="inline-block px-3 py-1 bg-[#F7E5DA] text-[#9B5A3E] text-xs font-medium rounded-full"
              style={{ fontFamily: 'var(--font-source-sans)' }}
            >
              EN DÉVELOPPEMENT
            </span>
          </div>
        </SceneWrapper>

        {/* ═══════════════════════════════════════════════════════════════
            SCÈNE 08 — ANCRAGE LOCAL
        ═══════════════════════════════════════════════════════════════ */}
        <SceneWrapper
          className="py-24 md:py-32"
          ariaLabel="Ancrage local"
        >
          <div className="max-w-3xl mx-auto px-4 text-center">
            <h2
              className="text-2xl md:text-4xl text-[#141C25] mb-4"
              style={{ fontFamily: 'var(--font-fraunces)' }}
            >
              Né quelque part.
              <br />
              Pensé pour apprendre chaque territoire.
            </h2>
            <p
              className="text-[#4A5766] text-base md:text-lg max-w-md mx-auto mb-12"
              style={{ fontFamily: 'var(--font-source-sans)' }}
            >
              Chaque lieu a ses sentiers, ses rythmes, ses particularités.
              EMOPET s&apos;adapte.
            </p>

            {/* Location expansion */}
            <div className="flex items-center justify-center gap-3 flex-wrap">
              {['Lorient', 'Bretagne', 'France', 'Europe', 'Monde'].map(
                (place, index) => (
                  <span
                    key={place}
                    className="inline-flex items-center gap-1 px-4 py-2 rounded-full border transition-all duration-300"
                    style={{
                      fontFamily: 'var(--font-source-sans)',
                      borderColor: index === 0 ? '#B46A4A' : '#DDD4C2',
                      backgroundColor: index === 0 ? '#F7E5DA' : '#FAF7F1',
                      color: index === 0 ? '#9B5A3E' : '#4A5766',
                      fontSize: `${0.875 - index * 0.05}rem`,
                    }}
                  >
                    {index > 0 && (
                      <span className="text-[#C6BBA4]" aria-hidden="true">→</span>
                    )}
                    {place}
                  </span>
                )
              )}
            </div>

            <span
              className="inline-block mt-8 px-3 py-1 bg-[#E3EAE4] text-[#1E9A90] text-xs font-medium rounded-full"
              style={{ fontFamily: 'var(--font-source-sans)' }}
            >
              PRÉVU
            </span>
          </div>
        </SceneWrapper>

        {/* ═══════════════════════════════════════════════════════════════
            SCÈNE 09 — CONNEXIONS
        ═══════════════════════════════════════════════════════════════ */}
        <SceneWrapper
          className="py-24 md:py-32 bg-[#F4EFE6]"
          ariaLabel="Connexions locales"
        >
          <div className="max-w-md mx-auto px-4">
            <div className="text-center mb-10">
              <h2
                className="text-2xl md:text-4xl text-[#141C25] mb-4"
                style={{ fontFamily: 'var(--font-fraunces)' }}
              >
                Des connexions qui font sens.
              </h2>
            </div>

            {/* Suggestion card */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#ECE5D7]">
              <p
                className="text-[#141C25] text-base mb-2 font-medium"
                style={{ fontFamily: 'var(--font-source-sans)' }}
              >
                Une balade tranquille dimanche matin ?
              </p>
              <p
                className="text-[#6B7684] text-sm mb-6"
                style={{ fontFamily: 'var(--font-source-sans)' }}
              >
                Vous aimez tous les deux les promenades près de la côte.
              </p>

              <div className="flex gap-3">
                <button
                  className="flex-1 px-4 py-3 bg-[#2CB7AB] text-white text-sm font-medium rounded-xl hover:bg-[#1E9A90] transition-colors duration-200"
                  style={{ fontFamily: 'var(--font-source-sans)' }}
                  aria-label="Voir la proposition"
                >
                  Voir la proposition
                </button>
                <button
                  className="flex-1 px-4 py-3 border border-[#DDD4C2] text-[#4A5766] text-sm font-medium rounded-xl hover:bg-[#F4EFE6] transition-colors duration-200"
                  style={{ fontFamily: 'var(--font-source-sans)' }}
                  aria-label="Pas maintenant"
                >
                  Pas maintenant
                </button>
              </div>
            </div>

            <p
              className="text-center text-[#6B7684] text-xs mt-6"
              style={{ fontFamily: 'var(--font-source-sans)' }}
            >
              Pas de score de compatibilité. Pas de localisation précise.
              <br />
              Juste un moment partagé, si vous le souhaitez.
            </p>

            <div className="text-center mt-6">
              <span
                className="inline-block px-3 py-1 bg-[#E3EAE4] text-[#1E9A90] text-xs font-medium rounded-full"
                style={{ fontFamily: 'var(--font-source-sans)' }}
              >
                PRÉVU
              </span>
            </div>
          </div>
        </SceneWrapper>

        {/* ═══════════════════════════════════════════════════════════════
            SCÈNE 10 — COMMUNAUTÉ
        ═══════════════════════════════════════════════════════════════ */}
        <SceneWrapper
          className="py-24 md:py-32"
          ariaLabel="Communauté locale"
        >
          <div className="max-w-4xl mx-auto px-4 text-center">
            <h2
              className="text-2xl md:text-4xl text-[#141C25] mb-4"
              style={{ fontFamily: 'var(--font-fraunces)' }}
            >
              Ensemble, localement.
            </h2>
            <p
              className="text-[#4A5766] text-base md:text-lg max-w-md mx-auto mb-12"
              style={{ fontFamily: 'var(--font-source-sans)' }}
            >
              Pas un réseau social. Un tissu de proximité.
            </p>

            {/* Interaction types */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-lg mx-auto">
              {[
                { icon: '🤝', label: 'Partage' },
                { icon: '🚶', label: 'Promenade' },
                { icon: '📚', label: 'Apprentissage' },
                { icon: '🏛️', label: 'Association' },
                { icon: '💚', label: 'Aide' },
                { icon: '🌱', label: 'Participation' },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl bg-[#F4EFE6] border border-[#ECE5D7]"
                >
                  <span className="text-2xl" role="img" aria-hidden="true">
                    {item.icon}
                  </span>
                  <span
                    className="text-[#2E3A48] text-sm font-medium"
                    style={{ fontFamily: 'var(--font-source-sans)' }}
                  >
                    {item.label}
                  </span>
                </div>
              ))}
            </div>

            <p
              className="text-[#6B7684] text-sm mt-8 max-w-sm mx-auto"
              style={{ fontFamily: 'var(--font-source-sans)' }}
            >
              Empathie · aide · participation locale
            </p>

            <div className="mt-6">
              <span
                className="inline-block px-3 py-1 bg-[#E3EAE4] text-[#1E9A90] text-xs font-medium rounded-full"
                style={{ fontFamily: 'var(--font-source-sans)' }}
              >
                PRÉVU
              </span>
            </div>
          </div>
        </SceneWrapper>

        {/* ═══════════════════════════════════════════════════════════════
            SCÈNE 11 — CONTINUITÉ VÉTÉRINAIRE
        ═══════════════════════════════════════════════════════════════ */}
        <SceneWrapper
          id="veterinaires"
          className="py-24 md:py-32 bg-[#F4EFE6]"
          ariaLabel="Continuité vétérinaire"
        >
          <div className="max-w-md mx-auto px-4">
            <div className="text-center mb-10">
              <h2
                className="text-2xl md:text-4xl text-[#141C25] mb-4"
                style={{ fontFamily: 'var(--font-fraunces)' }}
              >
                Préparer, pas diagnostiquer.
              </h2>
              <p
                className="text-[#4A5766] text-base md:text-lg"
                style={{ fontFamily: 'var(--font-source-sans)' }}
              >
                Vous gardez le contrôle de ce que vous partagez.
              </p>
            </div>

            {/* Consultation prep card */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#ECE5D7] mb-6">
              <p
                className="text-[#141C25] font-medium mb-4"
                style={{ fontFamily: 'var(--font-source-sans)' }}
              >
                Préparer la consultation de Nala
              </p>
              <div className="space-y-3">
                {[
                  { checked: true, label: 'Résumés de repos récents' },
                  { checked: true, label: "Contexte d'activité" },
                  { checked: true, label: 'Notes du gardien' },
                  { checked: false, label: 'Historique complet' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-3">
                    <div
                      className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 ${
                        item.checked
                          ? 'bg-[#2CB7AB] border-[#2CB7AB]'
                          : 'border-[#DDD4C2]'
                      }`}
                    >
                      {item.checked && (
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 12 12"
                          fill="none"
                          aria-hidden="true"
                        >
                          <path
                            d="M2 6l3 3 5-5"
                            stroke="white"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </div>
                    <span
                      className="text-[#2E3A48] text-sm"
                      style={{ fontFamily: 'var(--font-source-sans)' }}
                    >
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>

              <button
                className="w-full mt-6 px-4 py-3 bg-[#2CB7AB] text-white text-sm font-medium rounded-xl hover:bg-[#1E9A90] transition-colors duration-200"
                style={{ fontFamily: 'var(--font-source-sans)' }}
                aria-label="Partager avec mon vétérinaire"
              >
                Partager avec mon vétérinaire
              </button>
            </div>

            <p
              className="text-center text-[#6B7684] text-xs mt-6"
              style={{ fontFamily: 'var(--font-source-sans)' }}
            >
              EMOPET propose des informations, pas des diagnostics.
              <br />
              Votre vétérinaire reste la référence.
            </p>
          </div>
        </SceneWrapper>

        {/* ═══════════════════════════════════════════════════════════════
            SCÈNE 12 — PRIVACY
        ═══════════════════════════════════════════════════════════════ */}
        <SceneWrapper
          id="privacy"
          className="py-24 md:py-32"
          ariaLabel="Vie privée et contrôle"
        >
          <div className="text-center mb-12">
            <h2
              className="text-2xl md:text-4xl text-[#141C25] mb-4"
              style={{ fontFamily: 'var(--font-fraunces)' }}
            >
              Vos données restent les vôtres.
            </h2>
            <p
              className="text-[#4A5766] text-base md:text-lg max-w-md mx-auto"
              style={{ fontFamily: 'var(--font-source-sans)' }}
            >
              Pas de revente. Pas de partage non consenti.
              Vous décidez, toujours.
            </p>
          </div>
          <PrivacyControls />
        </SceneWrapper>

        {/* ═══════════════════════════════════════════════════════════════
            SCÈNE 13 — CTA
        ═══════════════════════════════════════════════════════════════ */}
        <section
          id="decouvrir"
          className="py-24 md:py-32 bg-[#F4EFE6]"
          aria-label="Rejoindre EMOPET"
        >
          <div className="max-w-md mx-auto px-4 text-center">
            <h2
              className="text-2xl md:text-4xl text-[#141C25] mb-4"
              style={{ fontFamily: 'var(--font-fraunces)' }}
            >
              Prenez part.
            </h2>
            <p
              className="text-[#4A5766] text-base md:text-lg max-w-sm mx-auto mb-10 leading-relaxed"
              style={{ fontFamily: 'var(--font-source-sans)' }}
            >
              Rejoignez les premiers gardiens qui testent EMOPET.
            </p>

            <div className="bg-white rounded-2xl p-8 shadow-sm border border-[#ECE5D7] max-w-sm mx-auto">
              <form className="space-y-4">
                <input
                  type="email"
                  placeholder="Votre email"
                  aria-label="Adresse email"
                  className="w-full px-4 py-3 rounded-xl border border-[#DDD4C2] text-[#2E3A48] placeholder-[#C6BBA4] focus:outline-none focus:ring-2 focus:ring-[#2CB7AB]/50"
                  style={{ fontFamily: 'var(--font-source-sans)' }}
                />
                <button
                  type="submit"
                  className="w-full px-4 py-3 bg-[#B46A4A] text-white text-base font-semibold rounded-xl hover:bg-[#9B5A3E] transition-colors duration-200 shadow-lg shadow-[#B46A4A]/20"
                  style={{ fontFamily: 'var(--font-source-sans)' }}
                >
                  Je veux participer
                </button>
              </form>
              <p
                className="text-[#A8BCAC] text-xs mt-4"
                style={{ fontFamily: 'var(--font-source-sans)' }}
              >
                Pas de spam. Juste des nouvelles quand c&apos;est prêt.
              </p>
            </div>
          </div>
        </section>
      </div>

      <LandingFooter />
    </main>
  );
}
