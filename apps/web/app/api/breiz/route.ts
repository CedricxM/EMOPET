/**
 * Route serveur de l'assistant régional (Breiz).
 *
 * Assemble le prompt système via le moteur régional (commun + profil + savoir
 * filtré) et appelle l'API Anthropic SI `ANTHROPIC_API_KEY` est défini. Sinon,
 * renvoie un signal de repli : le client utilise la base RAG locale.
 *
 * IMPORTANT : les claims autorisés/interdits ne sont jamais acceptés depuis le
 * client. L'enveloppe sémantique de compatibilité est construite côté serveur.
 */

import { NextResponse } from 'next/server';
import type { SemanticEvidenceEnvelope } from '../../../lib/language/types';
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
  /** Compatibilité historique. Un futur pipeline serveur fournira l'enveloppe complète. */
  eliConfidence?: 'VALID' | 'DEGRADED' | 'SUPPRESSED' | 'UNKNOWN';
}

const LANGUAGE_VERSIONS = {
  els: 'current-controlled-seed',
  motspet: 'v0.1-seed',
  claimGuard: 'current-controlled',
  persona: 'breiz-v0.1-proposed',
} as const;

function compatibilityEnvelope(body: BreizRequest): SemanticEvidenceEnvelope | undefined {
  if (!body.eliConfidence) return undefined;

  return {
    truthClass: 'INTERPRETED',
    evidenceLevel: 'mixed_or_inferred',
    publicationGate: body.eliConfidence,
    semanticVersions: LANGUAGE_VERSIONS,
    blockedClaims: [
      'diagnosis',
      'disease_detection',
      'pain_detection',
      'discrete_emotion_certainty',
      'unsupported_causality',
      'certainty_inflation',
    ],
  };
}

function transparencyMetadata(context: ConversationContext, responseMode: 'model' | 'retrieval') {
  const envelope = context.semanticEnvelope;
  return {
    aiSystem: true,
    assistantRole: 'regional_context_and_knowledge_assistant',
    responseMode,
    evidenceLevel: envelope?.evidenceLevel ?? (context.touchesEliData ? 'mixed_or_inferred' : 'external_context'),
    publicationGate: envelope?.publicationGate ?? null,
    truthClass: envelope?.truthClass ?? (context.touchesEliData ? 'INTERPRETED' : 'EXTERNAL_CONTEXT'),
    medicalStatus: 'non_diagnostic',
    provenanceRequired: true,
    semanticVersions: envelope?.semanticVersions ?? LANGUAGE_VERSIONS,
  } as const;
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
  const semanticEnvelope = compatibilityEnvelope(body);
  const context: ConversationContext = {
    userMessage,
    // Défense secondaire : le verrouillage ne dépend plus uniquement de ce regex.
    touchesEliData: Boolean(semanticEnvelope) || ELI_TERMS.test(userMessage),
    eliConfidence: body.eliConfidence,
    semanticEnvelope,
  };

  const built = buildAssistantSystemPrompt(region.profile, region.knowledge, context, {
    userDepartment: body.department,
  });

  const apiKey = process.env['ANTHROPIC_API_KEY'];

  if (!apiKey) {
    return NextResponse.json({
      via: 'fallback',
      assistantName: region.profile.assistantName,
      regionId: region.profile.regionId,
      isDefaultRegion: region.isDefault,
      invitation: region.invitation ?? null,
      touchesEliData: context.touchesEliData,
      semanticLock: built.semanticLock,
      knowledgeTokens: built.knowledgeTokens,
      transparency: transparencyMetadata(context, 'retrieval'),
    });
  }

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
      return NextResponse.json({
        via: 'fallback',
        assistantName: region.profile.assistantName,
        regionId: region.profile.regionId,
        isDefaultRegion: region.isDefault,
        touchesEliData: context.touchesEliData,
        semanticLock: built.semanticLock,
        transparency: transparencyMetadata(context, 'retrieval'),
        error: `anthropic_${res.status}`,
      });
    }
    const data = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
    const text = (data.content ?? []).filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
    return NextResponse.json({
      via: 'model',
      assistantName: region.profile.assistantName,
      regionId: region.profile.regionId,
      isDefaultRegion: region.isDefault,
      touchesEliData: context.touchesEliData,
      semanticLock: built.semanticLock,
      text,
      sources: [`${region.profile.assistantName} · ancrage ${region.profile.regionId}`],
      transparency: {
        ...transparencyMetadata(context, 'model'),
        modelProvider: 'Anthropic',
        modelId: model,
      },
    });
  } catch {
    return NextResponse.json({
      via: 'fallback',
      assistantName: region.profile.assistantName,
      regionId: region.profile.regionId,
      isDefaultRegion: region.isDefault,
      touchesEliData: context.touchesEliData,
      semanticLock: built.semanticLock,
      transparency: transparencyMetadata(context, 'retrieval'),
    });
  }
}
