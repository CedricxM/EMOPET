import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AppFrame } from '../components/app-frame';
import { Providers } from './providers';
import '../styles/globals.css';

/* Font stacks are defined in tokens.css. Sora and JetBrains Mono remain the
 * preferred brand families, with system fallbacks so builds do not require
 * network access to Google Fonts.
 */

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
