import { NextRequest, NextResponse } from 'next/server';
import { getDataset } from '@/lib/data-source';
import { selectFacts } from '@/lib/finance';
import { parseFilters } from '@/lib/validation';
import { ACCOUNTS, VERSIONS } from '@/lib/types';
import { sessionId } from '@/lib/security';
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  try {
    const filters = parseFilters(request.url),
      params = request.nextUrl.searchParams;
    const version = params.get('version') || 'Actual',
      account = params.get('account') || 'All accounts';
    if (
      !VERSIONS.includes(version as (typeof VERSIONS)[number]) ||
      (account !== 'All accounts' &&
        !ACCOUNTS.includes(account as (typeof ACCOUNTS)[number]))
    )
      return NextResponse.json(
        { error: 'Invalid cube slice' },
        { status: 400 }
      );
    const dataset = await getDataset(sessionId(request));
    const facts = selectFacts(dataset.facts, filters).filter(
      (f) =>
        f.version === version &&
        (account === 'All accounts' || f.account === account)
    );
    const page = Math.max(1, Number(params.get('page')) || 1),
      size = 30;
    return NextResponse.json(
      {
        facts: facts.slice((page - 1) * size, page * size),
        total: facts.length,
        page,
        pages: Math.ceil(facts.length / size),
        status: dataset.status,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch {
    return NextResponse.json(
      { error: 'Could not load the cube slice.' },
      { status: 400 }
    );
  }
}
