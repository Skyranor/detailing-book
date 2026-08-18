import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  getAllChapters,
  getChapter,
  getWrittenChapters,
  type ChapterEntry,
} from '@/lib/book';
import { renderMarkdown } from '@/lib/markdown';
import { toPlainText } from '@/lib/sections';
import { ChapterToc } from '@/components/ChapterToc';
import { ReadingProgress } from '@/components/ReadingProgress';

type Params = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return (await getWrittenChapters()).map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const chapter = await getChapter(slug);
  if (!chapter) return {};
  const lead = toPlainText(chapter.body).slice(0, 180);
  return {
    title: `${chapter.entry.number}. ${chapter.heading}`,
    description: lead,
    openGraph: { title: `${chapter.entry.number}. ${chapter.heading}`, description: lead },
  };
}

const RISK_TONE: Record<string, string> = {
  низкий: 'text-[var(--success)] bg-[var(--success-soft)] border-[var(--success)]/25',
  средний: 'text-[var(--money)] bg-[var(--money-soft)] border-[var(--money)]/30',
  необратимый: 'text-[var(--danger)] bg-[var(--danger-soft)] border-[var(--danger)]/30',
};

function Badge({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <span
      className={`inline-flex items-baseline gap-1.5 rounded-full border px-2.5 py-1 text-[0.73rem] ${
        tone ?? 'border-rule bg-paper-raised text-ink-soft'
      }`}
    >
      <span className="text-[0.62rem] tracking-[0.06em] uppercase opacity-65">{label}</span>
      <span className="font-semibold">{value}</span>
    </span>
  );
}

function NavCard({ entry, side }: { entry: ChapterEntry; side: 'prev' | 'next' }) {
  return (
    <Link
      href={`/read/${entry.slug}`}
      className={`group flex flex-1 flex-col gap-1 rounded-xl border border-rule bg-paper-raised px-4 py-3.5 transition-colors hover:border-accent/50 hover:bg-accent-soft ${
        side === 'next' ? 'text-right' : ''
      }`}
    >
      <span className="text-[0.68rem] tracking-[0.08em] text-ink-faint uppercase">
        {side === 'prev' ? '← Предыдущая' : 'Следующая →'}
      </span>
      <span className="text-[0.9rem] leading-snug font-semibold text-ink group-hover:text-accent">
        {entry.number}. {entry.title}
      </span>
    </Link>
  );
}

export default async function ChapterPage({ params }: Params) {
  const { slug } = await params;
  const chapter = await getChapter(slug);
  if (!chapter) notFound();

  const all = await getAllChapters();
  const written = new Set(all.filter((c) => c.status !== 'planned').map((c) => c.slug));
  const titles = new Map(all.map((c) => [c.slug, c.title]));

  const { html, headings } = await renderMarkdown(chapter.body, {
    written,
    titles,
    dropRules: true,
  });

  const required = chapter.meta.requires
    .map((n) => all.find((c) => c.number === n))
    .filter((c): c is ChapterEntry => Boolean(c));

  return (
    <>
      <ReadingProgress />
      <div className="mx-auto flex w-full max-w-[86rem] gap-10 px-5 sm:px-8">
        <article className="min-w-0 flex-1 py-10 lg:py-14">
          <header className="mb-10">
            <p className="mb-3 text-[0.7rem] font-bold tracking-[0.1em] text-ink-faint uppercase">
              {chapter.part.title}
              {chapter.part.levels && ` · ${chapter.part.levels}`}
            </p>

            <div className="flex items-start gap-4">
              <span
                aria-hidden="true"
                className="mt-1 font-mono text-4xl leading-none font-bold text-accent/25 tabular-nums sm:text-5xl"
              >
                {String(chapter.entry.number).padStart(2, '0')}
              </span>
              <h1 className="text-balance text-[1.75rem] leading-[1.15] font-bold tracking-tight sm:text-[2.3rem]">
                {chapter.heading}
              </h1>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-2">
              {chapter.meta.level && <Badge label="Уровень" value={chapter.meta.level} />}
              {chapter.meta.block && <Badge label="Блок" value={chapter.meta.block} />}
              {chapter.meta.risk && (
                <Badge
                  label="Риск ошибки"
                  value={chapter.meta.risk}
                  tone={RISK_TONE[chapter.meta.risk]}
                />
              )}
              <Badge label="Чтение" value={`${chapter.minutes} мин`} />
            </div>

            {required.length > 0 && (
              <p className="mt-4 text-[0.82rem] text-ink-faint">
                Предполагает знание глав:{' '}
                {required.map((c, i) => (
                  <span key={c.slug}>
                    {i > 0 && ', '}
                    {c.status === 'planned' ? (
                      <span className="text-ink-faint/70">{c.number}</span>
                    ) : (
                      <Link
                        href={`/read/${c.slug}`}
                        className="text-accent underline decoration-accent/30 underline-offset-2 hover:decoration-accent"
                      >
                        {c.number}
                      </Link>
                    )}
                  </span>
                ))}
              </p>
            )}
          </header>

          <div className="prose" dangerouslySetInnerHTML={{ __html: html }} />

          <nav className="no-print mt-16 flex flex-col gap-3 border-t border-rule pt-8 sm:flex-row">
            {chapter.prev ? <NavCard entry={chapter.prev} side="prev" /> : <div className="flex-1" />}
            {chapter.next ? <NavCard entry={chapter.next} side="next" /> : <div className="flex-1" />}
          </nav>

          <p className="no-print mt-6 text-center text-[0.78rem] text-ink-faint">
            <Link href="/" className="hover:text-accent">
              Ко всем главам
            </Link>
          </p>
        </article>

        <ChapterToc headings={headings} />
      </div>
    </>
  );
}
