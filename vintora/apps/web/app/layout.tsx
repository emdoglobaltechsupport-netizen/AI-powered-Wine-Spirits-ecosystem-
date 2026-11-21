import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: "Vintora — The World's Cellar, Intelligent",
  description: 'AI-native global wine and spirits marketplace, sommelier, wholesale and investment platform.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
