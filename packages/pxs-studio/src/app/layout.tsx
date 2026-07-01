import type { Metadata } from 'next';
import './globals.css';

// Typography is IBM Plex Sans / Mono (Claude Design — the only font families). It loads via the
// CDN @import in tokens.css and is applied through `--a2ui-font-family`. No Inter (design rule §2).

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
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
