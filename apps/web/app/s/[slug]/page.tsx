import { PublicStudio } from '@snapprint/contracts';
import { CustomerStudioView } from './customer-studio-view';
import { fetchPublicStudio } from '../../../src/customer-client';

interface StudioLandingPageProps {
  params: Promise<{ slug: string }>;
}

export default async function StudioLandingPage({ params }: StudioLandingPageProps) {
  const { slug } = await params;
  let initialStudio: PublicStudio | null = null;
  let initialError: string | null = null;

  try {
    initialStudio = await fetchPublicStudio(slug);
  } catch (err: unknown) {
    initialError = err instanceof Error ? err.message : 'Studio could not be resolved';
  }

  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      <CustomerStudioView
        slug={slug}
        initialStudio={initialStudio}
        initialError={initialError}
      />
    </main>
  );
}
