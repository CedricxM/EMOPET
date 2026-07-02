import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@emopet/shared', '@emopet/ai-personality', '@emopet/eli-engine'],
  // Évite le warning "multiple lockfiles" causé par un package-lock.json
  // résiduel dans le home Windows de l'utilisateur. La racine workspace
  // est explicitement celle du monorepo pnpm.
  outputFileTracingRoot: path.join(__dirname, '../..'),
  // Refonte 14→6 routes : ne casser aucun lien existant.
  async redirects() {
    return [
      { source: '/bien-etre', destination: '/dashboard', permanent: true },
      { source: '/rapport', destination: '/dashboard', permanent: false }, // route technique conservée hors-nav (impression/export)
      { source: '/local', destination: '/quartier', permanent: true },
      { source: '/communaute', destination: '/quartier', permanent: true },
      { source: '/donnees', destination: '/profil', permanent: true },
      { source: '/contact/mes-demandes', destination: '/contact', permanent: true },
    ];
  },
};

export default nextConfig;
