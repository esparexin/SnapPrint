import Link from 'next/link';

export default function NotFound() {
  return (
    <div style={{ padding: '4rem 1.5rem', textAlign: 'center' }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 1rem' }}>Page Not Found</h2>
      <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>Could not find requested resource</p>
      <Link href="/" style={{ color: '#0284c7', fontWeight: 600 }}>
        Return Home
      </Link>
    </div>
  );
}
