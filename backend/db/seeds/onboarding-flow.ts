/**
 * Onboarding Flow Data — Freemium App
 *
 * 5-screen onboarding flow for new users.
 * Used by the mobile app to render onboarding screens.
 */

import type { OnboardingStep } from '@emopet/shared';

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    step: 1,
    title: "Comment s'appelle votre compagnon ?",
    type: 'text',
    field: 'dog_name',
    placeholder: 'Ex: Filou, Luna, Rex...',
  },
  {
    step: 2,
    title: 'Quelle est sa race ?',
    type: 'breed_search',
    field: 'breed_id',
    allowMixed: true,
    note: 'Tapez le nom de la race ou sélectionnez "Je ne sais pas" pour un croisé',
  },
  {
    step: 3,
    title: 'Quelques infos sur {dog_name}',
    type: 'multi_input',
    inputs: [
      {
        field: 'birth_date',
        type: 'date',
        label: 'Date de naissance (même approximative)',
      },
      {
        field: 'sex',
        type: 'select',
        label: 'Sexe',
        options: ['Mâle', 'Femelle'],
      },
      {
        field: 'is_neutered',
        type: 'toggle',
        label: 'Stérilisé(e)',
      },
      {
        field: 'weight_kg',
        type: 'number',
        label: 'Poids (kg)',
        optional: true,
      },
    ],
  },
  {
    step: 4,
    title: 'Où vivez-vous avec {dog_name} ?',
    type: 'location',
    field: 'location',
    note: 'Pour du contenu adapté à votre région et votre météo',
  },
  {
    step: 5,
    title: 'Bienvenue dans la communauté EMOPET !',
    type: 'summary',
    show: [
      'Bleiz, votre compagnon IA, va apprendre à connaître {dog_name}',
      'Contenu personnalisé pour {breed_name} dès demain',
      '{community_count} propriétaires dans votre secteur',
      'Annuaire vétérinaire local disponible',
    ],
    cta: 'Commencer',
  },
];

/**
 * Breed size selection options shown when user selects "Je ne sais pas" for breed.
 */
export const MIXED_BREED_SIZE_OPTIONS = [
  { label: 'Petit (moins de 10 kg)', value: 'croise-petit', sizeClass: 'small' as const },
  { label: 'Moyen (10 à 25 kg)', value: 'croise-moyen', sizeClass: 'medium' as const },
  { label: 'Grand (25 à 45 kg)', value: 'croise-grand', sizeClass: 'large' as const },
  { label: 'Très grand (plus de 45 kg)', value: 'croise-geant', sizeClass: 'giant' as const },
];

/**
 * Welcome messages from Bleiz shown after onboarding completion.
 * Rotated based on breed characteristics.
 */
export const BLEIZ_WELCOME_MESSAGES = [
  {
    id: 'welcome_default',
    titleFr: 'Kenavo ! Je suis Bleiz.',
    bodyFr: "Enchanté de faire la connaissance de {dog_name} ! Je suis Bleiz, votre compagnon IA. Mon rôle ? Vous accompagner au quotidien avec des conseils adaptés à {breed_name}. Chaque jour, je vous préparerai du contenu personnalisé : conseils de promenade, astuces d'éducation, rappels saisonniers... Tout pour que {dog_name} et vous passiez les meilleurs moments ensemble. Demat !",
    breedFilter: [],
  },
  {
    id: 'welcome_puppy',
    titleFr: 'Kenavo ! Bienvenue avec votre chiot !',
    bodyFr: "Un chiot, quelle aventure ! Je suis Bleiz, et je vais vous aider à naviguer ces premiers mois avec {dog_name}. C'est une période passionnante : tout est nouveau pour votre petit {breed_name}. Je vous guiderai sur la socialisation, la propreté, l'éducation de base et les étapes de croissance. Chaque jour, un conseil adapté à son âge vous attend. Allons-y ensemble !",
    breedFilter: [],
    ageMaxMonths: 12,
  },
  {
    id: 'welcome_senior',
    titleFr: 'Kenavo ! À l’aise de rencontrer {dog_name} !',
    bodyFr: "Quel bonheur de compter un chien d'expérience dans la communauté ! Je suis Bleiz, votre compagnon IA. {dog_name} a déjà une belle vie derrière lui, et je suis là pour que la suite soit tout aussi belle. Je vous proposerai des conseils adaptés à son âge : confort, promenades adaptées, enrichissement doux et bien-être au quotidien. Prenons soin de ce compagnon fidèle ensemble.",
    breedFilter: [],
    ageMinMonths: 96,
  },
  {
    id: 'welcome_brachy',
    titleFr: 'Kenavo ! {dog_name} a un compagnon IA !',
    bodyFr: "Enchanté de faire la connaissance de {dog_name} ! Les {breed_name} sont des compagnons extraordinaires, et je suis là pour vous aider à prendre soin du vôtre au mieux. Je connais les particularités de sa race — je vous enverrai des rappels adaptés, surtout quand il fait chaud. Chaque jour, un conseil ou une info utile pour {dog_name}. C'est parti !",
    breedFilter: ['bouledogue-francais', 'bouledogue-anglais', 'carlin', 'boston-terrier', 'pekinois', 'shih-tzu', 'cavalier-king-charles-spaniel'],
  },
  {
    id: 'welcome_active',
    titleFr: 'Kenavo ! Prêt pour l\'aventure avec {dog_name} ?',
    bodyFr: "Un {breed_name} — voilà un chien qui ne tient pas en place ! Je suis Bleiz, et j'ai hâte de vous accompagner dans vos aventures avec {dog_name}. Je vous proposerai des idées d'activités, des conseils de promenade et du contenu adapté à son niveau d'énergie. Ensemble, on va trouver le bon équilibre entre dépense physique et repos. Demat !",
    breedFilter: ['berger-australien', 'border-collie', 'jack-russell-terrier', 'husky-siberien', 'berger-belge-malinois', 'braque-allemand', 'braque-de-weimar', 'vizsla', 'rhodesian-ridgeback'],
  },
];
