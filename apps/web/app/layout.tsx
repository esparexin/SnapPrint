import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SnapPrint — Digital Xerox & Print Cloud',
  description:
    'Multi-tenant photo printing and digital document Xerox SaaS platform. Zero-login QR mobile ordering and direct desktop printer spooling.',
  icons: {
    icon: [
      { url: '/brand/snapprint-icon.png', sizes: '512x512', type: 'image/png' },
      { url: '/favicon.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [{ url: '/apple-icon.png', sizes: '180x180', type: 'image/png' }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/brand/snapprint-icon.png" type="image/png" />
        <link rel="apple-touch-icon" href="/apple-icon.png" />
      </head>
      <body>{children}</body>
    </html>
  );
}
