import type { Metadata } from 'next';
import { Fraunces, Instrument_Sans, JetBrains_Mono } from 'next/font/google';
import type { ReactNode } from 'react';
import { AppFrame } from '../components/app-frame';
import { Providers } from './providers';
import '../styles/globals.css';

/* Typographie de marque — BRAND-AUTHORITY-001 §3.1.
 *
 * Fraunces (display), Instrument Sans (corps) et JetBrains Mono (technique)
 * sont chargées via `next/font`, qui les AUTO-HÉBERGE au build : les fichiers
 * .woff2 entrent dans le bundle et le navigateur du visiteur ne contacte
 * aucun tiers.
 *
 * Le commentaire précédent disait « system fallbacks so builds do not require
 * network access to Google Fonts ». Ce choix était délibéré ; il est levé
 * sciemment. La contrepartie est une dépendance réseau AU BUILD, vérifiée sur
 * le runner CI avant cette bascule (PR #364). Les fallbacks système restent
 * déclarés dans tokens.css.
 *
 * `tokens.css` consomme --f-display / --f-body / --f-mono.
 */
const fraunces = Fraunces({ subsets: ['latin'], display: 'swap', variable: '--f-display' });
const instrumentSans = Instrument_Sans({ subsets: ['latin'], display: 'swap', variable: '--f-body' });
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], display: 'swap', variable: '--f-mono' });

export const metadata: Metadata = {
  metadataBase: new URL('https://emopet.com'),
  title: 'EMOPET - Smart care. Strong bond.',
  description: 'Premium non-medical dog wellbeing insights for observed routines at home.',
  openGraph: {
    title: 'EMOPET - Smart care. Strong bond.',
    description: 'Premium non-medical dog wellbeing insights for observed routines at home.',
    images: ['/assets/brand/social-preview.png'],
  },
};

const PLAUSIBLE_DOMAIN = process.env['NEXT_PUBLIC_PLAUSIBLE_DOMAIN'];

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="fr"
      className={`${fraunces.variable} ${instrumentSans.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      {/* Analytics RGPD : Plausible (sans cookie, sans donnée perso). Activé seulement
          si NEXT_PUBLIC_PLAUSIBLE_DOMAIN est défini — sinon aucun script chargé. */}
      {PLAUSIBLE_DOMAIN && (
        <script defer data-domain={PLAUSIBLE_DOMAIN} src="https://plausible.io/js/script.js" />
      )}
      <body>
        <Providers>
          <AppFrame>{children}</AppFrame>
        </Providers>
      </body>
    </html>
  );
}
