import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';

import { StoreProvider } from '@/lib/store';
import { ToastProvider } from '@/components/ui/feedback';
import './globals.css';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-jakarta',
  weight: ['400', '500', '600', '700', '800'],
});

/**
 * Absolute base for OG/social URLs. VERCEL_URL is injected by Vercel itself at
 * build time - there is nothing to configure in the dashboard - so previews and
 * production each resolve to their own hostname, and local dev falls back to
 * localhost rather than pointing social tags at a domain that may not exist.
 */
const siteUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Vouch — the B2B creator marketplace',
    template: '%s · Vouch',
  },
  description:
    'Find the creators your buyers already trust, brief them in minutes, and trace the clicks, leads and pipeline back to every post.',
  openGraph: {
    title: 'Vouch — the B2B creator marketplace',
    description:
      'Find the creators your buyers already trust, brief them in minutes, and trace the clicks, leads and pipeline back to every post.',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: '#f6f7f9',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={jakarta.variable}>
      <body className="min-h-dvh antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[200] focus:rounded-[8px] focus:bg-brand-600 focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white"
        >
          Skip to content
        </a>
        <StoreProvider>
          <ToastProvider>{children}</ToastProvider>
        </StoreProvider>
      </body>
    </html>
  );
}
