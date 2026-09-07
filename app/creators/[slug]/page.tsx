import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { CREATORS, getCreator } from '@/lib/data/creators';
import { CreatorProfile } from './creator-profile';

/** Static params: the directory is fixed seed data, so every profile prerenders. */
export function generateStaticParams() {
  return CREATORS.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const creator = getCreator(slug);
  if (!creator) return { title: 'Creator not found' };

  return {
    title: creator.name,
    description: `${creator.headline} — book a sponsored post from ${creator.name} at a fixed price on Vouch.`,
  };
}

export default async function CreatorPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const creator = getCreator(slug);
  if (!creator) notFound();

  return <CreatorProfile creator={creator} />;
}
