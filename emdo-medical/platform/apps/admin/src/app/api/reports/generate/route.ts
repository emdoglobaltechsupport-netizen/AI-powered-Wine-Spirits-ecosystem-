import { NextResponse } from 'next/server';
import { generateReport, InsightApiError } from '../../../../lib/api';
import { readJsonBody, safeErrorResponse } from '../../../../lib/route-helpers';
import { readPortalSession } from '../../../../lib/server-session';

export async function POST(request: Request) {
  try {
    const session = await readPortalSession();
    if (!session) throw new InsightApiError(401, 'AUTH_REQUIRED');
    const body = await readJsonBody(request);
    const report = await generateReport(session, body);
    return NextResponse.json({ report });
  } catch (error) {
    return safeErrorResponse(error);
  }
}
