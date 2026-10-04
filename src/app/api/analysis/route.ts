import { NextRequest, NextResponse } from 'next/server';
import { getDataset } from '@/lib/data-source';
import { parseFilters } from '@/lib/validation';
import { analysisSchema, buildAnalysis } from '@/lib/analysis';
import { attachSession, sessionId } from '@/lib/security';
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  const id = sessionId(request);
  try {
    const filters = parseFilters(request.url),
      options = analysisSchema.parse(
        Object.fromEntries(request.nextUrl.searchParams)
      );
    return attachSession(
      NextResponse.json(buildAnalysis(await getDataset(id), filters, options), {
        headers: { 'Cache-Control': 'no-store' },
      }),
      id
    );
  } catch {
    return NextResponse.json(
      {
        error:
          'Invalid analysis parameters. Product analysis supports revenue only.',
      },
      { status: 400 }
    );
  }
}
