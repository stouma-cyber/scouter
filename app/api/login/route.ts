import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { code } = await request.json();
  const AUTH_PASSWORD = process.env.APP_PASSWORD;

  if (!AUTH_PASSWORD || code !== AUTH_PASSWORD) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set('auth', 'authenticated', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30日
    path: '/',
  });
  return res;
}
