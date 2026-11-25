import Link from 'next/link';
import type { PortalSession } from '../lib/contracts';
import { portalCountryScope, visibleInsightGroups } from '../lib/session';

export function PortalNav({ session }: { session: PortalSession }) {
  const groups = visibleInsightGroups(session);
  return (
    <nav className="portal-nav" aria-label="Super Admin navigation">
      <div className="portal-nav__links">
        <Link href="/">Overview</Link>
        <Link href="/metrics">Metric catalogue</Link>
        <Link href="/reports">Reports</Link>
      </div>
      <div className="portal-nav__scope">
        <span>Scope: {portalCountryScope(session)}</span>
        <span>{groups.length} report group(s)</span>
      </div>
      <ul className="portal-nav__groups" aria-label="Visible report groups">
        {groups.map((group) => <li key={group}>{group}</li>)}
      </ul>
      <form action="/api/session/logout" method="post">
        <button type="submit">Sign out</button>
      </form>
      <ul className="portal-nav__roles" aria-label="Assigned roles">
        {session.roles.map((role) => <li key={role}>{role}</li>)}
      </ul>
    </nav>
  );
}
