'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { SectionDoc } from '@/lib/sections';

type Hit = SectionDoc & { score: number; snippet: string };

const norm = (s: string) => s.toLowerCase().replace(/ё/g, 'е');

function makeSnippet(text: string, words: string[]): string {
  const haystack = norm(text);
  let at = -1;
  for (const w of words) {
    const found = haystack.indexOf(w);
    if (found !== -1 && (at === -1 || found < at)) at = found;
  }
  if (at === -1) return text.slice(0, 160);
  const start = Math.max(0, at - 60);
  const end = Math.min(text.length, at + 140);
  return `${start > 0 ? '…' : ''}${text.slice(start, end).trim()}${end < text.length ? '…' : ''}`;
}

function search(docs: SectionDoc[], query: string): Hit[] {
  const words = norm(query).split(/\s+/).filter((w) => w.length > 1);
  if (!words.length) return [];

  const hits: Hit[] = [];
  for (const doc of docs) {
    const inChapter = norm(doc.chapter);
    const inSection = norm(doc.section);
    const inText = norm(doc.text);

    let score = 0;
    let matchedAll = true;

    for (const word of words) {
      let wordScore = 0;
      if (inChapter.includes(word)) wordScore += 14;
      if (inSection.includes(word)) wordScore += 9;
      const occurrences = inText.split(word).length - 1;
      if (occurrences) wordScore += Math.min(6, occurrences) * 2;
      if (!wordScore) matchedAll = false;
      score += wordScore;
    }

    if (!matchedAll || !score) continue;
    hits.push({ ...doc, score, snippet: makeSnippet(doc.text, words) });
  }

  return hits.sort((a, b) => b.score - a.score || a.number - b.number).slice(0, 24);
}

export function SearchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [docs, setDocs] = useState<SectionDoc[] | null>(null);
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Индекс тянется один раз, при первом открытии поиска.
  useEffect(() => {
    if (!open || docs) return;
    fetch('/api/search')
      .then((r) => r.json())
      .then(setDocs)
      .catch(() => setDocs([]));
  }, [open, docs]);

  useEffect(() => {
    if (open) {
      setCursor(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const hits = useMemo(() => (docs ? search(docs, query) : []), [docs, query]);

  useEffect(() => setCursor(0), [query]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setCursor((c) => Math.min(c + 1, hits.length - 1));
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setCursor((c) => Math.max(c - 1, 0));
      }
      if (e.key === 'Enter' && hits[cursor]) {
        e.preventDefault();
        go(hits[cursor]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  useEffect(() => {
    listRef.current?.children[cursor]?.scrollIntoView({ block: 'nearest' });
  }, [cursor]);

  const go = (hit: Hit) => {
    router.push(`/read/${hit.slug}${hit.anchor ? `#${hit.anchor}` : ''}`);
    onClose();
    setQuery('');
  };

  if (!open) return null;

  return (
    <div className="no-print fixed inset-0 z-50 flex items-start justify-center px-4 pt-[8vh] sm:pt-[12vh]">
      <div className="absolute inset-0 bg-black/45 backdrop-blur-[3px]" onClick={onClose} />

      <div className="relative flex max-h-[76vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-rule bg-paper shadow-2xl">
        <div className="flex shrink-0 items-center gap-3 border-b border-rule px-4">
          <svg width="17" height="17" viewBox="0 0 20 20" fill="none" className="shrink-0 text-ink-faint">
            <circle cx="9" cy="9" r="5.5" stroke="currentColor" strokeWidth="1.7" />
            <path d="m13.5 13.5 3.5 3.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Найти в книге: керамика, прожог, толщиномер…"
            className="h-14 flex-1 bg-transparent text-[0.98rem] outline-none placeholder:text-ink-faint"
          />
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded border border-rule px-1.5 py-0.5 font-mono text-[0.62rem] text-ink-faint"
          >
            ESC
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
          {!query && (
            <p className="px-5 py-8 text-center text-[0.86rem] text-ink-faint">
              Поиск идёт по написанным главам — по разделам, таблицам и схемам.
            </p>
          )}

          {query && !docs && (
            <p className="px-5 py-8 text-center text-[0.86rem] text-ink-faint">Загружаю книгу…</p>
          )}

          {query && docs && !hits.length && (
            <p className="px-5 py-8 text-center text-[0.86rem] text-ink-faint">
              Ничего не нашлось. Попробуйте другое слово или его часть.
            </p>
          )}

          <ul ref={listRef} className="p-2">
            {hits.map((hit, i) => (
              <li key={`${hit.slug}-${hit.anchor}-${i}`}>
                <button
                  type="button"
                  onClick={() => go(hit)}
                  onMouseEnter={() => setCursor(i)}
                  className={`block w-full rounded-xl px-3 py-2.5 text-left transition-colors ${
                    i === cursor ? 'bg-accent-soft' : 'hover:bg-paper-sunk'
                  }`}
                >
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-[0.68rem] text-ink-faint tabular-nums">
                      {hit.number}
                    </span>
                    <span className="truncate text-[0.87rem] font-semibold text-ink">
                      {hit.chapter}
                    </span>
                    <span className="shrink-0 text-[0.72rem] text-accent">· {hit.section}</span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-[0.8rem] leading-relaxed text-ink-soft">
                    {hit.snippet}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        </div>

        {hits.length > 0 && (
          <div className="flex shrink-0 items-center gap-4 border-t border-rule px-4 py-2 text-[0.68rem] text-ink-faint">
            <span>
              <kbd className="font-mono">↑↓</kbd> выбрать
            </span>
            <span>
              <kbd className="font-mono">Enter</kbd> открыть
            </span>
            <span className="ml-auto">Найдено разделов: {hits.length}</span>
          </div>
        )}
      </div>
    </div>
  );
}
