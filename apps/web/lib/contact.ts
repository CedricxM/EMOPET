/**
 * Mise en relation humaine (demande & planification de contact).
 *
 * Approche SOBRE : l'app sert à DEMANDER et PLANIFIER un contact (tél/visio).
 * Elle N'HÉBERGE PAS la visio/appel. Pas de WebRTC, pas d'enregistrement.
 *
 * ⚠ Ligne non médicale : ce canal parle d'expérience/usage produit, JAMAIS de
 * demandes vétérinaires. Toute question qui exige un avis vétérinaire → vétérinaire.
 *
 * Frontend-first : validation + localStorage. Le backend (Drizzle/Postgres,
 * chiffrement au repos de `contactValue`, purge cron à 6 mois, vue admin
 * authentifiée) est la passe serveur différée (cf. R3).
 */

export type ContactChannel = 'phone' | 'video';

export type ContactReason = 'retour_experience' | 'question_usage' | 'probleme_technique' | 'autre';
// PAS de 'sante_chien' : ce canal ne traite jamais une demande vétérinaire.

export type ContactStatus = 'pending' | 'scheduled' | 'completed' | 'cancelled';
export type ContactLocale = 'fr' | 'en';

export const REASON_LABELS: Record<ContactReason, string> = {
  retour_experience: "Retour d'expérience",
  question_usage: "Question sur l'usage",
  probleme_technique: 'Problème technique',
  autre: 'Autre',
};

export const CHANNEL_LABELS: Record<ContactChannel, string> = {
  phone: 'Téléphone',
  video: 'Visio',
};

export const STATUS_LABELS: Record<ContactStatus, string> = {
  pending: 'En attente',
  scheduled: 'Créneau confirmé',
  completed: 'Échange réalisé',
  cancelled: 'Annulé',
};

const REASON_LABELS_EN: Record<ContactReason, string> = {
  retour_experience: 'Feedback',
  question_usage: 'Usage question',
  probleme_technique: 'Technical issue',
  autre: 'Other',
};

const CHANNEL_LABELS_EN: Record<ContactChannel, string> = {
  phone: 'Phone',
  video: 'Video',
};

const STATUS_LABELS_EN: Record<ContactStatus, string> = {
  pending: 'Pending',
  scheduled: 'Scheduled',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export interface TimeSlot {
  start: string; // ISO
  end: string; // ISO
}

export interface ContactRequest {
  id: string;
  ownerToken: string;
  channel: ContactChannel;
  reason: ContactReason;
  message?: string;
  /** Téléphone (canal phone) ou email (canal video). En prod : chiffré au repos. */
  contactValue: string;
  contactValueType: 'phone' | 'email';
  proposedSlots: TimeSlot[];
  consentGiven: boolean;
  consentTimestamp: string;
  status: ContactStatus;
  createdAt: string;
  /** Rempli par l'équipe lors du traitement (vue admin). */
  scheduledSlot?: TimeSlot;
  teamNotes?: string;
}

export const MAX_ACTIVE_REQUESTS = 3;
export const RETENTION_MONTHS = 6; // purge des demandes completed/cancelled (cron serveur, différé)
const STORAGE_KEY = 'breiz-contact-requests';
const OWNER_TOKEN_KEY = 'breiz-contact-owner-token';

/* ------------------------------------------------------------------ */
/* Validation (équivalent du schéma Zod côté serveur)                  */
/* ------------------------------------------------------------------ */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^(\+?\d[\d\s.\-]{7,17})$/;

export interface NewContactInput {
  channel: ContactChannel;
  reason: ContactReason;
  message?: string;
  contactValue: string;
  proposedSlots: TimeSlot[];
  consentGiven: boolean;
  ownerToken?: string;
}

export function validateContactInput(input: NewContactInput, now: Date = new Date()): string[] {
  const errors: string[] = [];
  if (input.channel !== 'phone' && input.channel !== 'video') errors.push('Canal invalide.');
  if (!(input.reason in REASON_LABELS)) errors.push('Motif invalide.');
  // @ts-expect-error — garde-fou explicite : ce motif n'existe pas dans ce canal.
  if (input.reason === 'sante_chien') errors.push('Ce canal ne traite pas les demandes vétérinaires.');

  const v = input.contactValue.trim();
  if (input.channel === 'phone' && !PHONE_RE.test(v)) errors.push('Numéro de téléphone invalide.');
  if (input.channel === 'video' && !EMAIL_RE.test(v)) errors.push('Adresse email invalide.');

  if (input.proposedSlots.length < 1 || input.proposedSlots.length > 5) errors.push('Proposez 1 à 5 créneaux.');
  for (const s of input.proposedSlots) {
    if (new Date(s.start).getTime() <= now.getTime()) errors.push('Les créneaux doivent être dans le futur.');
    if (new Date(s.end).getTime() <= new Date(s.start).getTime()) errors.push('Fin de créneau avant le début.');
  }
  if (input.message && input.message.length > 500) errors.push('Message trop long (500 max).');
  if (input.consentGiven !== true) errors.push('Le consentement est obligatoire.');
  return errors;
}

/* ------------------------------------------------------------------ */
/* Persistance (localStorage — passe serveur différée)                 */
/* ------------------------------------------------------------------ */

export function loadRequests(): ContactRequest[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as ContactRequest[];
  } catch {
    return [];
  }
}

function save(reqs: ContactRequest[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(reqs)); } catch {}
}

export function activeCount(reqs: ContactRequest[]): number {
  return reqs.filter((r) => r.status === 'pending' || r.status === 'scheduled').length;
}

function makeToken(prefix: string): string {
  const uuid = globalThis.crypto?.randomUUID?.();
  return uuid ? `${prefix}-${uuid}` : `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getOwnerToken(): string {
  if (typeof window === 'undefined') return '';
  try {
    const existing = localStorage.getItem(OWNER_TOKEN_KEY);
    if (existing) return existing;
    const created = makeToken('owner');
    localStorage.setItem(OWNER_TOKEN_KEY, created);
    return created;
  } catch {
    return makeToken('owner');
  }
}

export function contactReasonLabel(reason: ContactReason, locale: ContactLocale = 'fr'): string {
  return locale === 'en' ? REASON_LABELS_EN[reason] : REASON_LABELS[reason];
}

export function contactChannelLabel(channel: ContactChannel, locale: ContactLocale = 'fr'): string {
  return locale === 'en' ? CHANNEL_LABELS_EN[channel] : CHANNEL_LABELS[channel];
}

export function contactStatusLabel(status: ContactStatus, locale: ContactLocale = 'fr'): string {
  return locale === 'en' ? STATUS_LABELS_EN[status] : STATUS_LABELS[status];
}

/** Construit une demande à partir d'un input validé (pure — client ET serveur). */
export function buildRequest(input: NewContactInput): ContactRequest {
  const now = new Date().toISOString();
  return {
    id: makeToken('req'),
    ownerToken: input.ownerToken?.trim() || makeToken('owner'),
    channel: input.channel,
    reason: input.reason,
    message: input.message?.trim() || undefined,
    contactValue: input.contactValue.trim(),
    contactValueType: input.channel === 'phone' ? 'phone' : 'email',
    proposedSlots: input.proposedSlots,
    consentGiven: true,
    consentTimestamp: now,
    status: 'pending',
    createdAt: now,
  };
}

export type CreateResult = { ok: true; request: ContactRequest } | { ok: false; errors: string[] };

export function createRequest(input: NewContactInput): CreateResult {
  const ownerToken = input.ownerToken?.trim() || getOwnerToken();
  const payload = { ...input, ownerToken };
  const errors = validateContactInput(payload);
  if (errors.length > 0) return { ok: false, errors };
  const existing = loadRequests();
  if (activeCount(existing.filter((r) => r.ownerToken === ownerToken)) >= MAX_ACTIVE_REQUESTS) {
    return { ok: false, errors: [`Vous avez déjà ${MAX_ACTIVE_REQUESTS} demandes actives. Patientez ou annulez-en une.`] };
  }
  const request = buildRequest(payload);
  save([request, ...existing]);
  return { ok: true, request };
}

/** Annulation (droit à l'effacement RGPD). */
export function cancelRequest(id: string): ContactRequest[] {
  const next = loadRequests().filter((r) => r.id !== id);
  save(next);
  return next;
}

function intlLocale(locale: ContactLocale): string {
  return locale === 'fr' ? 'fr-FR' : 'en-US';
}

export function formatSlot(s: TimeSlot, locale: ContactLocale = 'fr'): string {
  const d = new Date(s.start);
  const e = new Date(s.end);
  const day = new Intl.DateTimeFormat(intlLocale(locale), { day: 'numeric', month: 'short' }).format(d);
  const t = (x: Date) => x.toLocaleTimeString(intlLocale(locale), { hour: '2-digit', minute: '2-digit' });
  return `${day} · ${t(d)}–${t(e)}`;
}
