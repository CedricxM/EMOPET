/**
 * Notification de l'équipe (Resend) — point d'extension du §6 « remontée équipe ».
 *
 * Env-gated : si RESEND_API_KEY + TEAM_EMAIL sont définis, envoie un email à
 * l'équipe quand une demande de contact arrive. Sinon, no-op (log serveur).
 * La coordonnée de l'utilisateur n'est PAS incluse en clair dans le sujet.
 *
 * ⚠ Server-only.
 */

import type { ContactRequest } from '../contact';
import { CHANNEL_LABELS, REASON_LABELS, formatSlot } from '../contact';

export interface NotifyResult {
  sent: boolean;
  reason?: string;
}

export async function notifyTeamOfContactRequest(req: ContactRequest): Promise<NotifyResult> {
  const apiKey = process.env['RESEND_API_KEY'];
  const to = process.env['TEAM_EMAIL'];
  const from = process.env['RESEND_FROM'] ?? 'emopet <onboarding@resend.dev>';

  if (!apiKey || !to) {
    // Pas configuré : la demande reste visible dans la file admin. On journalise.
    console.info(`[contact] nouvelle demande ${req.id} (${req.channel}/${req.reason}) — Resend non configuré, pas d'email.`);
    return { sent: false, reason: 'resend_not_configured' };
  }

  const slots = req.proposedSlots.map((s) => `• ${formatSlot(s)}`).join('\n');
  const text = [
    `Nouvelle demande de contact emopet`,
    ``,
    `Canal : ${CHANNEL_LABELS[req.channel]}`,
    `Motif : ${REASON_LABELS[req.reason]}`,
    `Coordonnée (${req.contactValueType}) : ${req.contactValue}`,
    req.message ? `Message : ${req.message}` : '',
    ``,
    `Créneaux proposés :`,
    slots,
    ``,
    `⚠ Canal non médical : pour toute question qui demande un avis vétérinaire, rediriger vers un vétérinaire.`,
    `Demande #${req.id} — à traiter dans la file admin.`,
  ].filter(Boolean).join('\n');

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        from,
        to,
        subject: `Contact emopet · ${REASON_LABELS[req.reason]} (${CHANNEL_LABELS[req.channel]})`,
        text,
      }),
    });
    if (!res.ok) return { sent: false, reason: `resend_${res.status}` };
    return { sent: true };
  } catch {
    return { sent: false, reason: 'resend_error' };
  }
}
