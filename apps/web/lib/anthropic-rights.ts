import {
  ANTHROPIC_PRODUCTION_AUTHORITY,
  isAnthropicProductionEgressAuthorized,
  type AnthropicEgressAuthority,
} from './anthropic-service-authority';

export interface ControlledAnthropicEgress {
  apiKey: string;
  model: string;
}

export function getControlledAnthropicEgress(
  apiKey: string | undefined = process.env.ANTHROPIC_API_KEY,
  gate: string | undefined = process.env.EMOPET_ANTHROPIC_EGRESS_GATE,
  model: string | undefined = process.env.ANTHROPIC_MODEL,
  authority: AnthropicEgressAuthority = ANTHROPIC_PRODUCTION_AUTHORITY,
): ControlledAnthropicEgress | null {
  if (gate !== 'GO') return null;

  const normalizedApiKey = apiKey?.trim();
  const normalizedModel = model?.trim();
  if (!normalizedApiKey || !normalizedModel) return null;
  if (!isAnthropicProductionEgressAuthorized(normalizedModel, authority)) return null;

  return { apiKey: normalizedApiKey, model: normalizedModel };
}
