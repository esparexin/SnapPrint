import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://snap.palnadu.dev'),
  title: 'SnapPrint — Digital Xerox & Print Cloud',
  description:
    'Multi-tenant photo printing and digital document Xerox SaaS platform. Zero-login QR mobile ordering and direct desktop printer spooling.',
  manifest: '/site.webmanifest',
  icons: {
    icon: [
      { url: '/favicon.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
    apple: [{ url: '/apple-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  openGraph: {
    title: 'SnapPrint — Digital Xerox & Print Cloud',
    description:
      'Multi-tenant photo printing and digital document Xerox SaaS platform. Zero-login QR mobile ordering and direct desktop printer spooling.',
    url: 'https://snap.palnadu.dev',
    siteName: 'SnapPrint',
    images: [
      { url: '/brand/snapprint-logo.png', width: 1200, height: 630, alt: 'SnapPrint Cloud' },
    ],
    locale: 'en_IN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SnapPrint — Digital Xerox & Print Cloud',
    description:
      'Multi-tenant photo printing and digital document Xerox SaaS platform. Zero-login QR mobile ordering and direct desktop printer spooling.',
    images: ['/brand/snapprint-logo.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={plusJakartaSans.className} data-scroll-behavior="smooth">
      <head>
        <link rel="icon" href="/favicon.png" type="image/png" sizes="32x32" />
        <link rel="apple-touch-icon" href="/apple-icon.png" />
        <link rel="manifest" href="/site.webmanifest" />
      </head>
      <body>{children}</body>
    </html>
  );
}
