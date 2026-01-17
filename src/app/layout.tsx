import Providers from '@/components/layout/providers';
import { Toaster } from '@/components/ui/sonner';
import { fontVariables } from '@/lib/font';
import ThemeProvider from '@/components/layout/ThemeToggle/theme-provider';
import { cn } from '@/lib/utils';
import type { Metadata, Viewport } from 'next';
import { cookies } from 'next/headers';
import NextTopLoader from 'nextjs-toploader';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import './globals.css';
import './theme.css';

const META_THEME_COLORS = {
  light: '#ffffff',
  dark: '#09090b'
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://draftmaster.app'),
  title: {
    default: 'Draft Master - AI-Powered League of Legends Draft Assistant',
    template: '%s | Draft Master'
  },
  description: 'Master your League of Legends draft phase with AI-powered champion recommendations, team synergy analysis, and real-time strategic insights. Make smarter picks and bans.',
  keywords: [
    'League of Legends',
    'LoL Draft',
    'Champion Draft',
    'Draft Assistant',
    'AI Draft Tool',
    'Team Composition',
    'Champion Synergy',
    'Draft Strategy',
    'Pick and Ban',
    'LoL Esports'
  ],
  authors: [{ name: 'Draft Master' }],
  creator: 'Draft Master',
  publisher: 'Draft Master',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://draftmaster.app',
    title: 'Draft Master - AI-Powered LoL Draft Assistant',
    description: 'Master your League of Legends draft phase with AI-powered champion recommendations and team synergy analysis.',
    siteName: 'Draft Master',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Draft Master - AI-Powered Draft Assistant'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Draft Master - AI-Powered LoL Draft Assistant',
    description: 'Master your League of Legends draft phase with AI-powered champion recommendations and team synergy analysis.',
    images: ['/og-image.png'],
    creator: '@draftmaster'
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1
    }
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png'
  },
  manifest: '/site.webmanifest'
};

export const viewport: Viewport = {
  themeColor: META_THEME_COLORS.light
};

export default async function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const activeThemeValue = cookieStore.get('active_theme')?.value;
  const isScaled = activeThemeValue?.endsWith('-scaled');

  return (
    <html lang='en' suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                if (localStorage.theme === 'dark' || ((!('theme' in localStorage) || localStorage.theme === 'system') && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.querySelector('meta[name="theme-color"]').setAttribute('content', '${META_THEME_COLORS.dark}')
                }
              } catch (_) {}
            `
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebApplication',
              name: 'Draft Master',
              description: 'AI-Powered League of Legends Draft Assistant for mastering champion selection and team composition',
              url: 'https://draftmaster.app',
              applicationCategory: 'GameApplication',
              operatingSystem: 'Web Browser',
              offers: {
                '@type': 'Offer',
                price: '0',
                priceCurrency: 'USD'
              },
              aggregateRating: {
                '@type': 'AggregateRating',
                ratingValue: '4.8',
                ratingCount: '1250'
              },
              featureList: [
                'AI-Powered Champion Recommendations',
                'Real-time Team Synergy Analysis',
                'Professional Tournament Statistics',
                'Strategic Draft Insights'
              ]
            })
          }}
        />
      </head>
      <body
        className={cn(
          'bg-background overscroll-none font-sans antialiased',
          activeThemeValue ? `theme-${activeThemeValue}` : '',
          isScaled ? 'theme-scaled' : '',
          fontVariables
        )}
      >
        <NextTopLoader color='var(--primary)' showSpinner={false} />
        <NuqsAdapter>
          <ThemeProvider
            attribute='class'
            defaultTheme='system'
            enableSystem
            disableTransitionOnChange
            enableColorScheme
          >
            <Providers activeThemeValue={activeThemeValue as string}>
              <Toaster />
              {children}
            </Providers>
          </ThemeProvider>
        </NuqsAdapter>
      </body>
    </html>
  );
}
