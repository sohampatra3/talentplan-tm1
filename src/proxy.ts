import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
export function proxy(request: NextRequest) {
  const password = process.env.APP_ACCESS_PASSWORD;
  if (!password) return NextResponse.next();
  const auth = request.headers.get('authorization') || '';
  let submitted = '';
  if (auth.startsWith('Basic ')) {
    const raw = Buffer.from(auth.slice(6), 'base64').toString();
    submitted = raw.includes(':') ? raw.slice(raw.indexOf(':') + 1) : '';
  }
  const a = Buffer.from(submitted),
    b = Buffer.from(password);
  if (a.length === b.length && timingSafeEqual(a, b))
    return NextResponse.next();
  return new NextResponse('TalentPlan access password required.', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="TalentPlan"',
      'Cache-Control': 'no-store',
    },
  });
}
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
