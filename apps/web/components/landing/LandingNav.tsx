'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

export default function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: 'Comment ça marche', href: '#comment-ca-marche' },
    { label: 'Notre approche', href: '#notre-approche' },
    { label: 'Pour les vétérinaires', href: '#veterinaires' },
    { label: 'À propos', href: '#a-propos' },
  ];

  return (
    <nav
      aria-label="Navigation principale"
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-[#FAF7F1]/95 backdrop-blur-sm shadow-sm'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <a href="/" aria-label="EMOPET - Retour à l'accueil" className="flex items-center gap-2">
            <Image
              src="/assets/brand/emopet-logo-mark.svg"
              alt=""
              width={32}
              height={32}
              className="w-8 h-8"
            />
            <span
              className={`font-semibold text-lg tracking-tight transition-colors duration-300 ${
                scrolled ? 'text-[#141C25]' : 'text-[#141C25]'
              }`}
              style={{ fontFamily: 'var(--font-source-sans)' }}
            >
              EMOPET
            </span>
          </a>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition-colors duration-200 hover:text-[#B46A4A] ${
                  scrolled ? 'text-[#2E3A48]' : 'text-[#2E3A48]'
                }`}
                style={{ fontFamily: 'var(--font-source-sans)' }}
              >
                {link.label}
              </a>
            ))}
            <a
              href="#decouvrir"
              className="inline-flex items-center gap-1 px-5 py-2.5 bg-[#B46A4A] text-white text-sm font-semibold rounded-full hover:bg-[#9B5A3E] transition-colors duration-200"
              style={{ fontFamily: 'var(--font-source-sans)' }}
            >
              Découvrir
              <span aria-hidden="true">→</span>
            </a>
          </div>

          {/* Mobile hamburger */}
          <button
            aria-label={mobileOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden flex flex-col justify-center items-center w-11 h-11 gap-1.5"
          >
            <span
              className={`block w-6 h-0.5 bg-[#141C25] transition-transform duration-200 ${
                mobileOpen ? 'rotate-45 translate-y-2' : ''
              }`}
            />
            <span
              className={`block w-6 h-0.5 bg-[#141C25] transition-opacity duration-200 ${
                mobileOpen ? 'opacity-0' : ''
              }`}
            />
            <span
              className={`block w-6 h-0.5 bg-[#141C25] transition-transform duration-200 ${
                mobileOpen ? '-rotate-45 -translate-y-2' : ''
              }`}
            />
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-[#FAF7F1] border-t border-[#ECE5D7] px-4 py-6 space-y-4">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="block text-base font-medium text-[#2E3A48] py-2"
              style={{ fontFamily: 'var(--font-source-sans)' }}
            >
              {link.label}
            </a>
          ))}
          <a
            href="#decouvrir"
            onClick={() => setMobileOpen(false)}
            className="inline-flex items-center gap-1 px-5 py-3 bg-[#B46A4A] text-white text-base font-semibold rounded-full w-full justify-center mt-2"
            style={{ fontFamily: 'var(--font-source-sans)' }}
          >
            Découvrir EMOPET
            <span aria-hidden="true">→</span>
          </a>
        </div>
      )}
    </nav>
  );
}
