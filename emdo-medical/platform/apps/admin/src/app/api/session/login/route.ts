import { NextResponse } from 'next/server';
import { InsightApiError, loginWithApi } from '../../../../lib/api';
import { readJsonBody, safeErrorResponse } from '../../../../lib/route-helpers';
import {
  createSessionCookie,
  hasPortalAccess,
  readSessionCookie,
  SESSION_COOKIE,
} from '../../../../lib/session';

export async function POST(request: Request) {
  try {
    const body = await readJsonBody(request);
    const identifier = body['identifier'];
    const password = body['password'];
    if (typeof identifier !== 'string' || typeof password !== 'string') {
      throw new InsightApiError(400, 'VALIDATION_ERROR');
    }

    const issued = await loginWithApi(identifier, password);
    const cookie = createSessionCookie(issued.accessToken, issued.expiresIn);
    const session = readSessionCookie(cookie);
    if (!session) throw new Error('INVALID_ACCESS_TOKEN');
    if (!hasPortalAccess(session)) throw new Error('PORTAL_ROLE_FORBIDDEN');

    // The response never includes the access token or the discarded refresh token.
    const response = NextResponse.json({
      ok: true,
      roles: session.roles,
      countryCode: session.countryCode,
    });
    response.cookies.set(SESSION_COOKIE, cookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: issued.expiresIn,
    });
    return response;
  } catch (error) {
    return safeErrorResponse(error);
  }
}
