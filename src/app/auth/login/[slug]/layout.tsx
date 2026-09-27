import type { Metadata } from 'next';

export default function TenantLoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const encodedSlug = encodeURIComponent(slug.trim().toLowerCase());

  return {
    manifest: `/api/public/manifest?igreja=${encodedSlug}`,
  };
}
