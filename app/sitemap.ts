import type { MetadataRoute } from 'next';
import { getWrittenChapters } from '@/lib/book';

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://detailing-book.vercel.app';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const chapters = await getWrittenChapters();

  return [
    { url: SITE, changeFrequency: 'weekly', priority: 1 },
    ...chapters.map((c) => ({
      url: `${SITE}/read/${c.slug}`,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
  ];
}
