import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'EMDO Super Admin — Prototype',
  description: 'Aggregate-only executive reporting. Not for clinical use.',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="shell">
          <p className="prototype-banner">
            PROTOTYPE — NO-GO FOR PUBLIC LAUNCH. Aggregate evidence only; no PHI, clinical decisions
            or final business actions.
          </p>
          {children}
        </div>
      </body>
    </html>
  );
}
