import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getDataset } from '@/lib/data-source';
import { buildDashboard } from '@/lib/finance';
import { parseFilters } from '@/lib/validation';
import {
  deterministicAnalysis,
  providerConfiguration,
  askProvider,
} from '@/lib/copilot';
import { sessionId, attachSession, sameOrigin } from '@/lib/security';
import { getDb } from '@/lib/db';
import { visualIntent } from '@/lib/analysis';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
export async function GET() {
  return NextResponse.json(providerConfiguration(), {
    headers: { 'Cache-Control': 'no-store' },
  });
}
const inputSchema = z.object({
  question: z.string().trim().min(3).max(1200),
  provider: z.enum(['built-in', 'openrouter', 'ollama']).default('built-in'),
  language: z.enum(['en', 'de']).default('en'),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().max(6000),
      })
    )
    .max(6)
    .default([]),
});
export async function POST(request: NextRequest) {
  try {
    sameOrigin(request);
  } catch {
    return NextResponse.json(
      { error: 'Invalid request origin.' },
      { status: 403 }
    );
  }
  const input = inputSchema.safeParse(await request.json().catch(() => null));
  if (!input.success)
    return NextResponse.json(
      { error: 'Ask a question between 3 and 1,200 characters.' },
      { status: 400 }
    );
  const id = sessionId(request);
  let data;
  try {
    data = buildDashboard(await getDataset(id), parseFilters(request.url));
  } catch {
    return NextResponse.json(
      { error: 'Invalid finance filters.' },
      { status: 400 }
    );
  }
  const { question, provider, language, history } = input.data;
  const fallback = deterministicAnalysis(data, question, language);
  const respond = (answer: string, mode: string, notice: string) =>
    attachSession(
      NextResponse.json({
        answer,
        mode,
        notice,
        visualization: { ...visualIntent(question), filters: data.filters },
        source: data.status.source,
        checkedAt: data.status.checkedAt,
      }),
      id
    );
  if (provider === 'built-in')
    return respond(
      fallback,
      'calculated',
      'Calculated analysis · no language model used'
    );
  const config = providerConfiguration()[provider];
  if (!config.configured)
    return respond(
      fallback,
      'calculated',
      `${provider === 'openrouter' ? 'OpenRouter' : 'Ollama Cloud'} API key is not configured. Showing calculated analysis.`
    );
  try {
    const client = await getDb().connect();
    try {
      await client.query('BEGIN');
      await client.query(
        "SELECT pg_advisory_xact_lock(hashtext('talentplan-ai-quota'))"
      );
      const { rows } = await client.query(
        "SELECT count(*) FILTER (WHERE session_id=$1)::int AS personal,count(*)::int AS global FROM ai_usage WHERE created_at>now()-interval '24 hours'",
        [id]
      );
      if (rows[0].personal >= 15 || rows[0].global >= 100) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          {
            error:
              'Daily AI quota reached. Calculated analysis is still available.',
          },
          { status: 429 }
        );
      }
      await client.query('INSERT INTO ai_usage (session_id) VALUES ($1)', [id]);
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
    const answer = await askProvider(
      provider,
      question,
      data,
      language,
      history
    );
    return respond(
      answer,
      'ai',
      provider === 'openrouter' ? 'OpenRouter' : 'Ollama Cloud'
    );
  } catch {
    return respond(
      fallback,
      'calculated',
      'Cloud AI is unavailable or timed out. Showing calculated analysis.'
    );
  }
}
