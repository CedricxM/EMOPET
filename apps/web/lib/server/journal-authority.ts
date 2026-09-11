import { NextResponse } from 'next/server';

export const LEGACY_JOURNAL_DEMO_ENV = 'EMOPET_ALLOW_LEGACY_JOURNAL_DEMO';
export const LEGACY_JOURNAL_DISABLED_CODE = 'LEGACY_JOURNAL_DATA_PLANE_DISABLED';

export function isLegacyJournalDemoAllowed(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return env.NODE_ENV !== 'production' && env[LEGACY_JOURNAL_DEMO_ENV] === '1';
}

export function legacyJournalAuthorityGate(
  env: NodeJS.ProcessEnv = process.env,
): NextResponse | null {
  if (isLegacyJournalDemoAllowed(env)) return null;

  return NextResponse.json(
    {
      ok: false,
      code: LEGACY_JOURNAL_DISABLED_CODE,
      error: 'Legacy Next.js Journal persistence is not a Product V1 release authority.',
      authority: 'Product V1 Journal/Memory authority not yet wired',
      demoOptIn: LEGACY_JOURNAL_DEMO_ENV,
    },
    { status: 503 },
  );
}
