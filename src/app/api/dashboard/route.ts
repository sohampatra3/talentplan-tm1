import { NextRequest, NextResponse } from 'next/server';
import { getDataset } from '@/lib/data-source';
import { buildDashboard } from '@/lib/finance';
import { parseFilters } from '@/lib/validation';
import { sessionId, attachSession } from '@/lib/security';
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  try {
    const filters = parseFilters(request.url);
    const id = sessionId(request);
    const data = buildDashboard(await getDataset(id), filters);
    return attachSession(
      NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } }),
      id
    );
  } catch {
    return NextResponse.json(
      { error: 'Invalid dashboard filters.' },
      { status: 400 }
    );
  }
}
