import { NextResponse } from 'next/server';
import { SESSION_COOKIE } from '../../../../lib/session';

export async function POST() {
  const secureCookie = ['production', 'staging'].includes(String(process.env.NODE_ENV));
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    secure: secureCookie,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return response;
}
