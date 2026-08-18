'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { BookPart } from '@/lib/book';

/**
 * Список частей и глав. Один и тот же и в боковой колонке, и в мобильной
 * шторке, чтобы навигация нигде не расходилась.
 */
export function ChapterList({ parts, onNavigate }: { parts: BookPart[]; onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="pb-16">
      {parts.map((part) => (
        <section key={part.index} className="mb-7">
          <h3 className="mb-2 flex items-baseline gap-2 px-3 text-[0.7rem] leading-snug font-bold tracking-[0.09em] text-ink-faint uppercase">
            <span className="text-balance">{part.title}</span>
            {part.levels && (
              <span className="ml-auto shrink-0 font-mono text-[0.62rem] tracking-normal normal-case">
                {part.levels}
              </span>
            )}
          </h3>

          <ul className="space-y-px">
            {part.chapters.map((chapter) => {
              const href = `/read/${chapter.slug}`;
              const active = pathname === href;

              if (chapter.status === 'planned') {
                return (
                  <li key={chapter.slug}>
                    <span
                      className="flex cursor-default items-baseline gap-2.5 rounded-lg px-3 py-1.5 text-[0.855rem] text-ink-faint/70"
                      title="Глава ещё не написана"
                    >
                      <span className="w-5 shrink-0 text-right font-mono text-[0.7rem] tabular-nums">
                        {chapter.number}
                      </span>
                      <span className="line-clamp-2 leading-snug">{chapter.title}</span>
                    </span>
                  </li>
                );
              }

              return (
                <li key={chapter.slug}>
                  <Link
                    href={href}
                    onClick={onNavigate}
                    aria-current={active ? 'page' : undefined}
                    className={`group relative flex items-baseline gap-2.5 rounded-lg px-3 py-1.5 text-[0.855rem] leading-snug transition-colors ${
                      active
                        ? 'bg-accent-soft font-semibold text-accent'
                        : 'text-ink-soft hover:bg-paper-sunk hover:text-ink'
                    }`}
                  >
                    {active && (
                      <span className="absolute top-1.5 bottom-1.5 -left-px w-[3px] rounded-full bg-accent" />
                    )}
                    <span
                      className={`w-5 shrink-0 text-right font-mono text-[0.7rem] tabular-nums ${
                        active ? 'text-accent' : 'text-ink-faint'
                      }`}
                    >
                      {chapter.number}
                    </span>
                    <span className="line-clamp-2">{chapter.title}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </nav>
  );
}
