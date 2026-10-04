import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
export function equalSecret(a: string, b: string) {
  const aa = Buffer.from(a),
    bb = Buffer.from(b);
  return aa.length === bb.length && timingSafeEqual(aa, bb);
}
const signature = (id: string) =>
  createHmac('sha256', process.env.SESSION_SECRET || 'local-development-only')
    .update(id)
    .digest('hex');
export function sessionId(request: NextRequest) {
  const cookie = request.cookies.get('talentplan-session')?.value || '';
  const [id, sig] = cookie.split('.');
  if (
    id &&
    /^[0-9a-f-]{36}$/.test(id) &&
    sig &&
    equalSecret(sig, signature(id))
  )
    return id;
  return randomUUID();
}
export function attachSession(response: NextResponse, id: string) {
  response.cookies.set('talentplan-session', `${id}.${signature(id)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  });
  return response;
}
export function sameOrigin(request: NextRequest) {
  const origin = request.headers.get('origin');
  if (!origin || origin !== new URL(request.url).origin)
    throw new Error('Invalid request origin');
}
