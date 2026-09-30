const RESEND_EMAIL_ENDPOINT = 'https://api.resend.com/emails';

export interface EmailVerificationDeliveryInput {
  to: string;
  verificationUrl: string;
}

export type EmailVerificationDeliveryResult =
  | {
      ok: true;
      provider: 'resend';
      providerMessageId: string | null;
    }
  | {
      ok: false;
      error:
        | 'invalid_input'
        | 'provider_not_configured'
        | 'provider_rejected'
        | 'provider_unavailable';
      providerStatus?: number;
    };

export interface EmailVerificationDeliveryDeps {
  env?: NodeJS.ProcessEnv;
  fetchImpl?: typeof fetch;
}

function readNonEmpty(env: NodeJS.ProcessEnv, key: string): string | null {
  const value = env[key]?.trim();
  return value ? value : null;
}

function isBoundedEmail(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.length > 2 && trimmed.length <= 255 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

function isHttpVerificationUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

function parseVerificationBaseUrl(env: NodeJS.ProcessEnv): URL | null {
  const raw = readNonEmpty(env, 'AUTH_EMAIL_VERIFICATION_URL');
  if (!raw) return null;

  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    if (url.username || url.password) return null;
    if (env['NODE_ENV'] === 'production' && url.protocol !== 'https:') return null;
    return url;
  } catch {
    return null;
  }
}

export function buildEmailVerificationUrl(
  rawToken: string,
  env: NodeJS.ProcessEnv = process.env,
): string | null {
  const url = parseVerificationBaseUrl(env);
  if (!url) return null;
  url.searchParams.set('token', rawToken);
  return url.toString();
}

export function assertEmailVerificationRuntimeConfiguration(
  env: NodeJS.ProcessEnv = process.env,
): void {
  if (env['NODE_ENV'] !== 'production') return;

  const missing: string[] = [];
  if (!readNonEmpty(env, 'RESEND_API_KEY')) missing.push('RESEND_API_KEY');
  if (!readNonEmpty(env, 'RESEND_FROM')) missing.push('RESEND_FROM');
  if (!parseVerificationBaseUrl(env)) missing.push('AUTH_EMAIL_VERIFICATION_URL_HTTPS');

  if (missing.length > 0) {
    throw new Error(`Email verification runtime configuration missing/invalid: ${missing.join(', ')}`);
  }
}

/**
 * Server-side transport primitive for email ownership verification.
 *
 * This function deliberately does not create tokens, persist token material,
 * verify ownership, mutate user state or issue a session. The caller owns those
 * authorities. The verification URL may contain the raw one-time token and is
 * therefore never logged or returned from this function.
 */
export async function deliverEmailVerification(
  input: EmailVerificationDeliveryInput,
  deps: EmailVerificationDeliveryDeps = {},
): Promise<EmailVerificationDeliveryResult> {
  const env = deps.env ?? process.env;
  const fetchImpl = deps.fetchImpl ?? fetch;
  const to = input.to.trim();

  if (!isBoundedEmail(to) || !isHttpVerificationUrl(input.verificationUrl)) {
    return { ok: false, error: 'invalid_input' };
  }

  const apiKey = readNonEmpty(env, 'RESEND_API_KEY');
  const from = readNonEmpty(env, 'RESEND_FROM');
  if (!apiKey || !from) {
    return { ok: false, error: 'provider_not_configured' };
  }

  try {
    const response = await fetchImpl(RESEND_EMAIL_ENDPOINT, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to,
        subject: 'Verify your EMOPET email',
        text: [
          'Confirm that this email address belongs to you:',
          '',
          input.verificationUrl,
          '',
          'If you did not request this, you can ignore this message.',
        ].join('\n'),
      }),
    });

    if (!response.ok) {
      return {
        ok: false,
        error: 'provider_rejected',
        providerStatus: response.status,
      };
    }

    let providerMessageId: string | null = null;
    try {
      const body = await response.json() as { id?: unknown };
      if (typeof body.id === 'string' && body.id.trim()) {
        providerMessageId = body.id.trim();
      }
    } catch {
      // A successful provider response without parseable metadata still proves
      // transport acceptance. Do not surface or log the raw provider body.
    }

    return { ok: true, provider: 'resend', providerMessageId };
  } catch {
    return { ok: false, error: 'provider_unavailable' };
  }
}
