'use client';

import { useEffect, useState } from 'react';
import type { Heading } from '@/lib/markdown';

/** Содержание главы справа с подсветкой раздела, который сейчас на экране. */
export function ChapterToc({ headings }: { headings: Heading[] }) {
  const [active, setActive] = useState<string>('');

  useEffect(() => {
    const targets = headings
      .map((h) => document.getElementById(h.id))
      .filter((el): el is HTMLElement => Boolean(el));
    if (!targets.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: '-88px 0px -70% 0px', threshold: 0 },
    );

    targets.forEach((t) => observer.observe(t));
    return () => observer.disconnect();
  }, [headings]);

  if (headings.length < 3) return null;

  return (
    <nav className="no-print sticky top-14 hidden max-h-[calc(100vh-3.5rem)] w-60 shrink-0 overflow-y-auto py-8 pr-4 xl:block scrollbar-thin">
      <p className="mb-3 text-[0.68rem] font-bold tracking-[0.09em] text-ink-faint uppercase">
        В этой главе
      </p>
      <ul className="space-y-0.5 border-l border-rule">
        {headings.map((h) => (
          <li key={h.id}>
            <a
              href={`#${h.id}`}
              className={`-ml-px block border-l-2 py-1 text-[0.79rem] leading-snug transition-colors ${
                h.level === 3 ? 'pl-6' : 'pl-3.5'
              } ${
                active === h.id
                  ? 'border-accent font-semibold text-accent'
                  : 'border-transparent text-ink-faint hover:border-rule-strong hover:text-ink-soft'
              }`}
            >
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
