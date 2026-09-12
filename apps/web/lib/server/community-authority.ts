import { NextResponse } from 'next/server';

export const LEGACY_COMMUNITY_DEMO_ENV = 'EMOPET_ALLOW_LEGACY_COMMUNITY_DEMO';
export const LEGACY_COMMUNITY_DISABLED_CODE = 'LEGACY_COMMUNITY_DATA_PLANE_DISABLED';

export function isLegacyCommunityDemoAllowed(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return env.NODE_ENV !== 'production' && env[LEGACY_COMMUNITY_DEMO_ENV] === '1';
}

export function legacyCommunityAuthorityGate(
  env: NodeJS.ProcessEnv = process.env,
): NextResponse | null {
  if (isLegacyCommunityDemoAllowed(env)) return null;

  return NextResponse.json(
    {
      ok: false,
      code: LEGACY_COMMUNITY_DISABLED_CODE,
      error: 'Legacy Next.js Community persistence is not a Product V1 release authority.',
      authority: 'Hono + durable Product V1 persistence',
      demoOptIn: LEGACY_COMMUNITY_DEMO_ENV,
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
