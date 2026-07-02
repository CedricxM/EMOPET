import type { FeatureStatus } from '../types/feature-progress.js';

export interface FeatureCatalogEntry {
  serviceId: string;
  title: string;
  summary: string;
  status: FeatureStatus;
  tags?: string[];
}

export const FEATURE_PROGRESS_CATALOG: FeatureCatalogEntry[] = [
  {
    serviceId: 'community_morning_question',
    title: 'Question du matin',
    summary:
      'Une question collective, douce et non medicale, proposee le matin pour lancer les echanges.',
    status: 'beta',
    tags: ['community AI', 'beta'],
  },
  {
    serviceId: 'weekly_challenge_km',
    title: 'Defi hebdo km',
    summary:
      'Des kilometres collectifs par communaute, avec progression visible avant ouverture.',
    status: 'building',
    tags: ['defi', 'communaute'],
  },
  {
    serviceId: 'copresence',
    title: 'Copresence & rencontres',
    summary:
      'Suggestions de rencontre apres croisements repetes, uniquement en opt-in temporaire.',
    status: 'planned',
    tags: ['proximite', 'privacy by design'],
  },
  {
    serviceId: 'thematic_communities',
    title: 'Communautes thematiques',
    summary:
      'Groupes par race, age, style de vie ou ville, avec regles et moderation visibles.',
    status: 'planned',
    tags: ['groupes', 'moderation'],
  },
  {
    serviceId: 'direct_messages',
    title: 'Messages 1:1',
    summary:
      'Messagerie entre membres, prevue seulement quand le blocage et le signalement sont en place.',
    status: 'planned',
    tags: ['messagerie', 'safety'],
  },
  {
    serviceId: 'meetups',
    title: 'Evenements & meetups',
    summary:
      'Balades et rendez-vous organises avec opt-in clair et garde-fous hors ligne.',
    status: 'planned',
    tags: ['offline', 'safety'],
  },
  {
    serviceId: 'directory_services',
    title: 'Annuaire de services',
    summary:
      'Veterinaires, educateurs et services verifies dans un annuaire visible avant ouverture publique.',
    status: 'building',
    tags: ['annuaire', 'read-only'],
  },
  {
    serviceId: 'service_reviews',
    title: 'Avis sur services',
    summary:
      'Avis et notes sur les services, a ouvrir seulement avec moderation et anti-fake.',
    status: 'planned',
    tags: ['ugc', 'moderation'],
  },
  {
    serviceId: 'marketplace',
    title: 'Marketplace',
    summary:
      'Produits et services partenaires, visibles mais verrouilles tant que paiements et anti-fraude ne sont pas prets.',
    status: 'planned',
    tags: ['paiement', 'partenaires'],
  },
] as const;
