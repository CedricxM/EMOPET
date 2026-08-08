'use client';

import Image from 'next/image';

export default function LandingFooter() {
  const linkGroups = [
    {
      title: 'Produit',
      links: [
        { label: 'Comment ça marche', href: '#comment-ca-marche' },
        { label: 'Notre approche', href: '#notre-approche' },
        { label: 'Pour les vétérinaires', href: '#veterinaires' },
      ],
    },
    {
      title: 'Entreprise',
      links: [
        { label: 'À propos', href: '#a-propos' },
        { label: 'Contact', href: '#contact' },
        { label: 'Données & Confidentialité', href: '#donnees' },
      ],
    },
  ];

  return (
    <footer
      className="bg-[#141C25] text-[#C6BBA4] py-16 px-4"
      role="contentinfo"
      aria-label="Pied de page"
    >
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
          {/* Brand column */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Image
                src="/assets/brand/emopet-logo-mark.svg"
                alt=""
                width={28}
                height={28}
                className="w-7 h-7 brightness-200"
              />
              <span
                className="text-white font-semibold text-lg tracking-tight"
                style={{ fontFamily: 'var(--font-source-sans)' }}
              >
                EMOPET
              </span>
            </div>
            <p
              className="text-sm text-[#6B7684] leading-relaxed max-w-xs"
              style={{ fontFamily: 'var(--font-source-sans)' }}
            >
              Lorient, Bretagne
              <br />
              Aide les gardiens à mieux comprendre le quotidien de leur chien.
            </p>
          </div>

          {/* Link columns */}
          {linkGroups.map((group) => (
            <div key={group.title}>
              <h3
                className="text-white text-sm font-semibold mb-4 uppercase tracking-wider"
                style={{ fontFamily: 'var(--font-source-sans)' }}
              >
                {group.title}
              </h3>
              <ul className="space-y-3">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      className="text-sm text-[#6B7684] hover:text-[#FE502D] transition-colors duration-200"
                      style={{ fontFamily: 'var(--font-source-sans)' }}
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="border-t border-[#2E3A48] pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p
            className="text-xs text-[#6B7684]"
            style={{ fontFamily: 'var(--font-source-sans)' }}
          >
            © 2025 EMOPET · Lorient, Bretagne
          </p>
          <p
            className="text-xs text-[#6B7684] italic"
            style={{ fontFamily: 'var(--font-source-sans)' }}
          >
            Projet en développement
          </p>
        </div>
      </div>
    </footer>
  );
}
