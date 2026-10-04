import { NextRequest, NextResponse } from 'next/server';
import { attachSession, sameOrigin, sessionId } from '@/lib/security';
import {
  blankConnection,
  connectionSchema,
  discoverMcp,
  loadConnection,
  publicProfile,
  readProfileRest,
  saveConnection,
} from '@/lib/connections';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
export async function GET(request: NextRequest) {
  const id = sessionId(request);
  try {
    return attachSession(
      NextResponse.json(
        {
          profile: publicProfile((await loadConnection(id)) || blankConnection),
        },
        { headers: { 'Cache-Control': 'no-store' } }
      ),
      id
    );
  } catch {
    return NextResponse.json(
      { error: 'Connection settings are unavailable.' },
      { status: 503 }
    );
  }
}
export async function POST(request: NextRequest) {
  try {
    sameOrigin(request);
  } catch {
    return NextResponse.json(
      { error: 'Invalid request origin.' },
      { status: 403 }
    );
  }
  const id = sessionId(request);
  try {
    const body = await request.json();
    const profile = connectionSchema.parse(body.profile);
    const stored = await loadConnection(id);
    for (const kind of ['rest', 'mcp'] as const) {
      if (
        !profile[kind].secret &&
        stored &&
        profile[kind].url === stored[kind].url &&
        profile[kind].auth === stored[kind].auth
      )
        profile[kind].secret = stored[kind].secret;
    }
    if (body.action === 'save') {
      await saveConnection(id, profile);
      return attachSession(
        NextResponse.json(
          { profile: publicProfile(profile), saved: true },
          { headers: { 'Cache-Control': 'no-store' } }
        ),
        id
      );
    }
    if (body.action === 'test-rest') {
      const facts = await readProfileRest(profile);
      return attachSession(
        NextResponse.json(
          { connected: true, rowCount: facts.length },
          { headers: { 'Cache-Control': 'no-store' } }
        ),
        id
      );
    }
    if (body.action === 'test-mcp') {
      const tools = await discoverMcp(profile);
      return attachSession(
        NextResponse.json(
          { connected: true, tools },
          { headers: { 'Cache-Control': 'no-store' } }
        ),
        id
      );
    }
    return NextResponse.json(
      { error: 'Choose a connection action.' },
      { status: 400 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Connection test failed.';
    const safe =
      /^(Use a public|Private or reserved|Enter |REST requires|REST connection failed|Endpoint redirects|TM1 |Connection storage)/.test(
        message
      )
        ? message
        : 'The connection could not be verified. Check the endpoint, authentication and IBM entitlement.';
    return NextResponse.json({ error: safe }, { status: 400 });
  }
}
