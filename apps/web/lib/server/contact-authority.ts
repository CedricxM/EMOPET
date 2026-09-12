import { NextResponse } from 'next/server';

export const LEGACY_CONTACT_DEMO_ENV = 'EMOPET_ALLOW_LEGACY_CONTACT_DEMO';
export const LEGACY_CONTACT_DISABLED_CODE = 'LEGACY_CONTACT_DATA_PLANE_DISABLED';

export function isLegacyContactDemoAllowed(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return env.NODE_ENV !== 'production' && env[LEGACY_CONTACT_DEMO_ENV] === '1';
}

export function legacyContactAuthorityGate(
  env: NodeJS.ProcessEnv = process.env,
): NextResponse | null {
  if (isLegacyContactDemoAllowed(env)) return null;

  return NextResponse.json(
    {
      ok: false,
      code: LEGACY_CONTACT_DISABLED_CODE,
      error: 'Legacy file-backed Contact persistence is not a Product V1 PII authority.',
      authority: 'Product V1 Contact/support authority not yet wired',
      demoOptIn: LEGACY_CONTACT_DEMO_ENV,
    },
    {
      status: 503,
      headers: {
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    },
  );
}
