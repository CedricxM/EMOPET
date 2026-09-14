/**
 * Notification de l'équipe (Resend) — point d'extension du §6 « remontée équipe ».
 *
 * Env-gated : un email ne peut partir que si RESEND_API_KEY + TEAM_EMAIL sont
 * définis ET EMOPET_RESEND_EGRESS_GATE=GO. Le gate est un contrôle opérateur,
 * pas une clearance juridique du fournisseur.
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
  const resendEgressAllowed = process.env['EMOPET_RESEND_EGRESS_GATE'] === 'GO';

  if (!apiKey || !to) {
    console.info(`[contact] nouvelle demande ${req.id} (${req.channel}/${req.reason}) — Resend non configuré, pas d'email.`);
    return { sent: false, reason: 'resend_not_configured' };
  }
  if (!resendEgressAllowed) {
    console.info(`[contact] nouvelle demande ${req.id} (${req.channel}/${req.reason}) — egress Resend non autorisé, pas d'email.`);
    return { sent: false, reason: 'resend_egress_not_authorized' };
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
