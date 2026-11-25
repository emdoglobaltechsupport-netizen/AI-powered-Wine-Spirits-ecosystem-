import { renderToStaticMarkup } from 'react-dom/server';
import type { PortalSession } from '../lib/contracts';
import { PortalNav } from './portal-nav';

function session(roles: PortalSession['roles'], countryCode = 'SANDBOX'): PortalSession {
  return {
    accessToken: 'header.payload.signature',
    userId: '00000000-0000-4000-8000-000000000001',
    countryCode,
    roles,
    expiresAt: Math.floor(Date.now() / 1000) + 900,
  };
}

describe('Role-filtered portal navigation', () => {
  it('shows only the canonical groups assigned to the caller role', () => {
    const html = renderToStaticMarkup(<PortalNav session={session(['finance_manager'])} />);
    expect(html).toContain('>finance<');
    expect(html).not.toContain('>clinical_capacity<');
    expect(html).not.toContain('>expansion<');
    expect(html).toContain('1 report group(s)');
    expect(html).toContain('Scope: SANDBOX');
  });

  it('shows the full catalogue for super admin without granting PHI links', () => {
    const html = renderToStaticMarkup(<PortalNav session={session(['super_admin'])} />);
    expect(html).toContain('>executive<');
    expect(html).toContain('>clinical_capacity<');
    expect(html).toContain('>expansion<');
    expect(html).toContain('Scope: ALL');
    expect(html).not.toContain('/records');
  });
});
