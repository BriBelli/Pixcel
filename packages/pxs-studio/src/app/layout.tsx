import type { Metadata } from 'next';
import { IBM_Plex_Sans, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';

// Typography is IBM Plex Sans / Mono (Claude Design — the only font families). No Inter (rule §2).
// Self-hosted via next/font rather than a CDN @import: the @import was render-blocking and fell
// back to Helvetica on first paint, which is what made the type read "dead".
const plexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-plex-sans',
});

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  display: 'swap',
  variable: '--font-plex-mono',
});

export const metadata: Metadata = {
  title: 'Pixcel',
  description: 'AI-native creative studio — media as structured data.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${plexSans.variable} ${plexMono.variable}`}>
      <body>
        {children}
      </body>
    </html>
  );
}
