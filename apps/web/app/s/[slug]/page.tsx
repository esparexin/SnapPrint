import { CustomerStudioView } from './customer-studio-view';

interface StudioLandingPageProps {
  params: Promise<{ slug: string }>;
}

export default async function StudioLandingPage({ params }: StudioLandingPageProps) {
  const { slug } = await params;

  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      <CustomerStudioView slug={slug} />
    </main>
  );
}
