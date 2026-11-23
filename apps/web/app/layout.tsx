import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SnapPrint — Digital Xerox & Print Cloud',
  description:
    'Multi-tenant photo printing and digital document Xerox SaaS platform. Zero-login QR mobile ordering and direct desktop printer spooling.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
