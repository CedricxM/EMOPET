/**
 * Région TÉMOIN : Bretagne. Structure complète, contenu limité à quelques
 * exemples incontestables marqués EXEMPLE_DEMO. Le reste est PENDING
 * (remplissage éditorial humain — pas Claude).
 *
 * PATCH 6 — departments inclut le 44 (Loire-Atlantique) au titre de la
 *   BRETAGNE HISTORIQUE. ATTENTION : le 44 est administrativement en Pays de
 *   la Loire (INSEE). La détection de région traite le 44 comme un cas
 *   particulier rattaché à la Bretagne pour ce produit (voir detect-region.ts).
 *
 * PATCH 7 — anti-biais morbihannais : le contenu d'exemple est lorientais
 *   (ville d'ancrage), mais le REMPLISSAGE FUTUR doit équilibrer les 5
 *   départements (22, 29, 35, 44, 56). Le moteur ne privilégie pas le 56 :
 *   le bonus de score départemental s'applique au département RÉEL de
 *   l'utilisateur, quel qu'il soit (aucune préférence Lorient codée en dur).
 */

import type { RegionalKnowledgeBase } from '../knowledge-types';
import type { RegionalProfile } from '../types';

export const BRETAGNE_PROFILE: RegionalProfile = {
  regionId: 'bretagne',
  assistantName: 'Breiz',
  assistantNameOrigin: '« Breizh » signifie « Bretagne » en breton',
  departments: ['22', '29', '35', '56', '44'], // 44 = Bretagne historique (cf. PATCH 6)
  namingRule: "Nom issu de la langue ou de l'identité de la région",
  knowledgeBaseId: 'kb_bretagne',
  status: 'TEMOIN_DEMO',
};

export const BRETAGNE_KNOWLEDGE: RegionalKnowledgeBase = {
  regionId: 'bretagne',
  geographyEntries: [
    // EXEMPLE DÉMO — montre le format attendu. À compléter par contenu vérifié.
    {
      id: 'geo_lorient',
      name: 'Lorient',
      type: 'ville',
      department: '56',
      description: "Ville portuaire du Morbihan, ville d'ancrage d'EMOPET.",
      sourceVerified: true,
      _status: 'EXEMPLE_DEMO',
    },
    // À REMPLIR AVEC DU CONTENU VÉRIFIÉ (équilibre 22/29/35/44/56 — cf. PATCH 7) :
    // plages, sentiers côtiers, forêts, villes et leur caractère, lieux de balade canine.
    {
      id: 'geo_pending_placeholder',
      name: 'Lieux de balade (à vérifier)',
      type: 'autre',
      department: '00',
      description: 'Emplacement réservé — sera remplacé par des lieux vérifiés, répartis sur les 5 départements.',
      sourceVerified: false,
      _status: 'PENDING_VERIFIED_CONTENT',
    },
  ],
  cultureEntries: [
    {
      id: 'cult_fil',
      theme: 'fete',
      title: 'Festival Interceltique de Lorient',
      description: 'Grand festival des cultures celtiques, se tient à Lorient en août.',
      sourceVerified: true,
      _status: 'EXEMPLE_DEMO',
    },
    {
      id: 'cult_gwenn_ha_du',
      theme: 'symbole',
      title: 'Gwenn ha Du',
      description: 'Drapeau breton (« blanc et noir » en breton).',
      sourceVerified: true,
      _status: 'EXEMPLE_DEMO',
    },
    // À REMPLIR AVEC DU CONTENU VÉRIFIÉ : fest-noz, musique, langue bretonne et
    // gallo, gastronomie, histoire, autres symboles. Équilibrer les 5 départements.
    {
      id: 'cult_pending_placeholder',
      theme: 'autre',
      title: 'Traditions (à vérifier)',
      description: 'Emplacement réservé — sera remplacé par du contenu culturel vérifié.',
      sourceVerified: false,
      _status: 'PENDING_VERIFIED_CONTENT',
    },
  ],
  rhythmSources: [
    { kind: 'meteo', description: 'Météo locale pour adapter les suggestions de sortie', futureDataSource: 'API météo à brancher', implemented: false },
    { kind: 'marees', description: 'Horaires de marées (côte bretonne)', futureDataSource: 'API marées à brancher', implemented: false },
    { kind: 'agenda_local', description: 'Événements locaux à venir', futureDataSource: 'Source agenda à définir', implemented: false },
  ],
};
