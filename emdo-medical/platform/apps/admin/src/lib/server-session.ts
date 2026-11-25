import { cookies } from 'next/headers';
import type { PortalSession } from './contracts';
import { readSessionCookie, SESSION_COOKIE } from './session';

export async function readPortalSession(): Promise<PortalSession | null> {
  const jar = await cookies();
  try {
    return readSessionCookie(jar.get(SESSION_COOKIE)?.value);
  } catch {
    // A missing or invalid signing secret must fail closed, not expose a stack trace.
    return null;
  }
}
