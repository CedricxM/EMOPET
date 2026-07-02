/**
 * Route serveur de l'assistant régional (Breiz).
 *
 * Assemble le prompt système via le MOTEUR régional (commun + profil + savoir
 * filtré) et appelle l'API Anthropic SI `ANTHROPIC_API_KEY` est défini. Sinon,
 * renvoie un signal de repli : le client utilise la base RAG locale (R4).
 *
 * La clé reste côté serveur (jamais exposée au client). Prompt caching activé
 * sur le prompt système (cache_control ephemeral).
 */

import { NextResponse } from 'next/server';
import { buildAssistantSystemPrompt } from '../../../lib/regional/build-system-prompt';
import { detectRegion } from '../../../lib/regional/detect-region';
import type { ConversationContext } from '../../../lib/regional/types';
import { createFixedWindowRateLimiter } from '../../../lib/server/rate-limit';
import { enforceRateLimit, readLimitedJson } from '../../../lib/server/request-security';

export const runtime = 'nodejs';

const ELI_TERMS = /(eli|indicateur|bien-?[êe]tre|repos|sommeil|activit[ée]|baseline|confiance|score|wqi|rsi|veto)/i;
const BREIZ_RATE_LIMIT_MAX = 20;
const BREIZ_RATE_LIMIT_WINDOW_MS = 60_000;
const BREIZ_MAX_BODY_BYTES = 8 * 1024;
const BREIZ_MAX_MESSAGE_LENGTH = 1200;
const breizRateLimiter = createFixedWindowRateLimiter({
  limit: BREIZ_RATE_LIMIT_MAX,
  windowMs: BREIZ_RATE_LIMIT_WINDOW_MS,
});

interface BreizRequest {
  userMessage?: string;
  declaredRegionId?: string;
  department?: string;
  eliConfidence?: 'VALID' | 'DEGRADED' | 'SUPPRESSED';
}

export async function POST(req: Request) {
  const limited = enforceRateLimit(req, breizRateLimiter, 'breiz:post');
  if (limited) return limited;

  const parsed = await readLimitedJson<BreizRequest>(req, BREIZ_MAX_BODY_BYTES);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  const body = parsed.data;

  const userMessage = (body.userMessage ?? '').trim();
  if (!userMessage) return NextResponse.json({ error: 'empty_message' }, { status: 400 });
  if (userMessage.length > BREIZ_MAX_MESSAGE_LENGTH) return NextResponse.json({ error: 'message_too_long' }, { status: 413 });

  const region = detectRegion({ declaredRegionId: body.declaredRegionId, department: body.department });
  const context: ConversationContext = {
    userMessage,
    touchesEliData: ELI_TERMS.test(userMessage),
    eliConfidence: body.eliConfidence,
  };

  const built = buildAssistantSystemPrompt(region.profile, region.knowledge, context, {
    userDepartment: body.department,
  });

  const apiKey = process.env['ANTHROPIC_API_KEY'];

  // Pas de clé → repli RAG côté client. On renvoie quand même l'identité régionale
  // et des métadonnées (transparence + démonstration que le moteur a tourné).
  if (!apiKey) {
    return NextResponse.json({
      via: 'fallback',
      assistantName: region.profile.assistantName,
      regionId: region.profile.regionId,
      isDefaultRegion: region.isDefault,
      invitation: region.invitation ?? null,
      touchesEliData: context.touchesEliData,
      knowledgeTokens: built.knowledgeTokens,
    });
  }

  // Chemin modèle réel : API Anthropic, prompt système caché.
  try {
    const model = process.env['ANTHROPIC_MODEL'] ?? 'claude-3-5-haiku-latest';
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 600,
        system: [{ type: 'text', text: built.prompt, cache_control: { type: 'ephemeral' } }],
        messages: [{ role: 'user', content: userMessage }],
      }),
    });
    if (!res.ok) {
      return NextResponse.json({ via: 'fallback', assistantName: region.profile.assistantName, regionId: region.profile.regionId, isDefaultRegion: region.isDefault, touchesEliData: context.touchesEliData, error: `anthropic_${res.status}` });
    }
    const data = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
    const text = (data.content ?? []).filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
    return NextResponse.json({
      via: 'model',
      assistantName: region.profile.assistantName,
      regionId: region.profile.regionId,
      isDefaultRegion: region.isDefault,
      touchesEliData: context.touchesEliData,
      text,
      sources: [`${region.profile.assistantName} · ancrage ${region.profile.regionId}`],
    });
  } catch {
    return NextResponse.json({ via: 'fallback', assistantName: region.profile.assistantName, regionId: region.profile.regionId, isDefaultRegion: region.isDefault, touchesEliData: context.touchesEliData });
  }
}
