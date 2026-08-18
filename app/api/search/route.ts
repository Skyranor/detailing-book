import { getChapter, getWrittenChapters } from '@/lib/book';
import { splitSections, toPlainText, type SectionDoc } from '@/lib/sections';

/** Индекс собирается один раз при сборке и раздаётся как обычный файл. */
export const dynamic = 'force-static';

export async function GET() {
  const chapters = await getWrittenChapters();
  const docs: SectionDoc[] = [];

  for (const entry of chapters) {
    const chapter = await getChapter(entry.slug);
    if (!chapter) continue;

    for (const section of splitSections(chapter.body)) {
      const text = toPlainText(section.body);
      if (!text) continue;
      docs.push({
        slug: entry.slug,
        number: entry.number,
        chapter: chapter.heading,
        section: section.title,
        anchor: section.anchor,
        text,
      });
    }
  }

  return Response.json(docs);
}
