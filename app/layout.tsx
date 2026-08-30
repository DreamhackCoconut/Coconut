import type { Metadata } from 'next';
import 'maplibre-gl/dist/maplibre-gl.css';
import './globals.css';

export const metadata: Metadata = {
  title: 'Coconut — Made close. Moved together.',
  description: 'Coconut is a marketplace and shared-shipping workspace for island makers and curious buyers.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(() => { try { const theme = localStorage.getItem('coconut-theme'); if (theme === 'light' || theme === 'dark') document.documentElement.dataset.theme = theme; } catch {} })();`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
