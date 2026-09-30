import type { Metadata } from 'next';
import type { ReactNode } from 'react';

/**
 * Ce segment n'existe que pour porter le titre de la page : `page.tsx` est un
 * composant client, et un composant client ne peut pas exporter `metadata`.
 *
 * Libellé repris de la clé `nav.quartier` du dictionnaire, et forme « <Page> | EMOPET »
 * déjà utilisée par /world — ni l'un ni l'autre n'est inventé ici.
 *
 * LIMITE ASSUMÉE : `metadata` est statique et rendue côté serveur, alors que la
 * langue de l'interface est choisie côté client. Le titre d'onglet reste donc en
 * anglais même quand l'interface bascule en français. C'est déjà le cas de /world.
 * Un titre localisé demanderait de détecter la locale côté serveur, ce qui est une
 * décision d'architecture i18n et pas de la QA.
 */
export const metadata: Metadata = {
  title: 'Neighbourhood | EMOPET',
};

export default function QuartierLayout({ children }: { children: ReactNode }) {
  return children;
}
