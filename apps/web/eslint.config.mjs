import { FlatCompat } from '@eslint/eslintrc';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

/**
 * ESLint flat config (ESLint 9 / Next 15).
 * Étend next/core-web-vitals + next/typescript via FlatCompat
 * (le préset Next n'est pas encore nativement flat).
 */
const config = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    ignores: ['.next/**', 'node_modules/**', 'dist/**', 'tsconfig.tsbuildinfo', 'next-env.d.ts'],
  },
  {
    rules: {
      'react/no-unknown-property': 'off',
      '@next/next/no-img-element': 'warn',
      // Texte FR contient beaucoup d'apostrophes / guillemets — l'écho HTML
      // est déjà géré par le navigateur. Pas d'exposition XSS sur des string
      // literals statiques en JSX.
      'react/no-unescaped-entities': 'off',
      // Préfixe _ explicite pour les paramètres ignorés
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
];

export default config;
