import { NextResponse } from 'next/server';
import { searchBreizOfficialSources } from '@/lib/data/breiz/connectors/officialSources';

export const runtime = 'nodejs';

const MIN_QUERY_LENGTH = 2;
const MAX_QUERY_LENGTH = 120;
const DEFAULT_PER_SOURCE_LIMIT = 3;
const MAX_PER_SOURCE_LIMIT = 6;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = (searchParams.get('q') ?? '').trim();

  if (query.length < MIN_QUERY_LENGTH || query.length > MAX_QUERY_LENGTH) {
    return NextResponse.json(
      { error: 'invalid_query', minLength: MIN_QUERY_LENGTH, maxLength: MAX_QUERY_LENGTH },
      { status: 400 },
    );
  }

  const requestedLimit = Number.parseInt(searchParams.get('per_source') ?? '', 10);
  const perSourceLimit = Number.isFinite(requestedLimit)
    ? Math.max(1, Math.min(MAX_PER_SOURCE_LIMIT, requestedLimit))
    : DEFAULT_PER_SOURCE_LIMIT;

  try {
    const result = await searchBreizOfficialSources(query, { perSourceLimit });
    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'official_discovery_unavailable',
        detail: error instanceof Error ? error.message : 'unknown_error',
      },
      { status: 502 },
    );
  }
}
