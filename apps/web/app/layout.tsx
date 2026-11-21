import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SnapPrint',
  description: 'SnapPrint — multi-tenant photo printing shop platform',
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
