import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { getDb } from '@/lib/db';
import { sessionId, attachSession, sameOrigin } from '@/lib/security';
import { scenarioSchema } from '@/lib/validation';
import { getDataset } from '@/lib/data-source';
import { buildDashboard, scenario } from '@/lib/finance';
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  const id = sessionId(request);
  try {
    const { rows } = await getDb().query(
      'SELECT id,name,assumptions,results,data_source,created_at FROM scenario WHERE session_id=$1 ORDER BY created_at DESC LIMIT 20',
      [id]
    );
    return attachSession(NextResponse.json({ scenarios: rows }), id);
  } catch {
    return NextResponse.json(
      { error: 'Neon is unavailable. Saved scenarios cannot be loaded.' },
      { status: 503 }
    );
  }
}
export async function POST(request: NextRequest) {
  try {
    sameOrigin(request);
  } catch {
    return NextResponse.json(
      { error: 'Request origin is invalid.' },
      { status: 403 }
    );
  }
  const parsed = scenarioSchema.safeParse(
    await request.json().catch(() => null)
  );
  if (!parsed.success)
    return NextResponse.json(
      { error: 'Invalid scenario assumptions.' },
      { status: 400 }
    );
  const id = sessionId(request),
    input = parsed.data;
  try {
    const dataset = await getDataset();
    if (!dataset.status.databaseConnected)
      return NextResponse.json(
        { error: 'Neon is unavailable. Scenario was not saved.' },
        { status: 503 }
      );
    const dashboard = buildDashboard(dataset, input.filters);
    const results = scenario(
      dashboard.actual,
      input.revenuePercent,
      input.salaryPercent,
      input.additionalFte
    );
    const client = await getDb().connect();
    try {
      await client.query('BEGIN');
      await client.query(
        "SELECT pg_advisory_xact_lock(hashtext('talentplan-scenarios'))"
      );
      const { rows } = await client.query(
        "SELECT count(*) FILTER (WHERE session_id=$1)::int AS personal,count(*)::int AS global FROM scenario WHERE created_at>now()-interval '24 hours'",
        [id]
      );
      if (rows[0].personal >= 20 || rows[0].global >= 300) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { error: 'Daily scenario limit reached. Try again tomorrow.' },
          { status: 429 }
        );
      }
      const saved = await client.query(
        'INSERT INTO scenario (id,session_id,name,assumptions,results,data_source) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id,name,created_at',
        [
          randomUUID(),
          id,
          input.name,
          JSON.stringify(input),
          JSON.stringify({ ...results, baseline: dashboard.actual }),
          dataset.status.source,
        ]
      );
      await client.query('COMMIT');
      return attachSession(
        NextResponse.json({ scenario: saved.rows[0], results }),
        id
      );
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch {
    return NextResponse.json(
      { error: 'The scenario could not be saved.' },
      { status: 503 }
    );
  }
}
