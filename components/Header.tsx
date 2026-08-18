'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { BookPart } from '@/lib/book';
import { ChapterList } from './ChapterList';
import { SearchDialog } from './SearchDialog';

export function Header({ parts }: { parts: BookPart[] }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'));
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    try {
      localStorage.setItem('theme', next ? 'dark' : 'light');
    } catch {}
  };

  return (
    <>
      <header className="no-print sticky top-0 z-40 border-b border-rule bg-paper/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 w-full max-w-[1600px] items-center gap-2 px-3 sm:px-4">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Оглавление"
            className="-ml-1 rounded-lg p-2 text-ink-soft hover:bg-paper-sunk hover:text-ink lg:hidden"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path
                d="M3 5.5h14M3 10h14M3 14.5h14"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </button>

          <Link href="/" className="flex min-w-0 items-center gap-2.5">
            <span
              aria-hidden="true"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-accent font-mono text-[0.7rem] font-bold text-paper"
            >
              Д
            </span>
            <span className="min-w-0 truncate">
              <span className="block truncate text-[0.92rem] leading-tight font-bold tracking-tight">
                Детейлинг
              </span>
              <span className="hidden truncate text-[0.68rem] leading-tight text-ink-faint sm:block">
                от новичка до владельца студии
              </span>
            </span>
          </Link>

          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2 rounded-lg border border-rule bg-paper-raised py-1.5 pr-2 pl-2.5 text-ink-faint transition-colors hover:border-rule-strong hover:text-ink-soft"
              aria-label="Поиск по книге"
            >
              <svg width="15" height="15" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <circle cx="9" cy="9" r="5.5" stroke="currentColor" strokeWidth="1.7" />
                <path d="m13.5 13.5 3.5 3.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
              <span className="hidden text-[0.82rem] sm:inline">Поиск</span>
              <kbd className="hidden rounded border border-rule px-1.5 py-0.5 font-mono text-[0.62rem] md:inline">
                ⌘K
              </kbd>
            </button>

            <button
              type="button"
              onClick={toggleTheme}
              aria-label={dark ? 'Светлая тема' : 'Тёмная тема'}
              className="rounded-lg p-2 text-ink-soft transition-colors hover:bg-paper-sunk hover:text-ink"
            >
              {dark ? (
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <circle cx="10" cy="10" r="3.6" stroke="currentColor" strokeWidth="1.6" />
                  <path
                    d="M10 1.8v1.6M10 16.6v1.6M18.2 10h-1.6M3.4 10H1.8M15.8 4.2l-1.1 1.1M5.3 14.7l-1.1 1.1M15.8 15.8l-1.1-1.1M5.3 5.3 4.2 4.2"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path
                    d="M16.5 12.4A7 7 0 0 1 7.6 3.5a7 7 0 1 0 8.9 8.9Z"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>
      </header>

      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-[85%] max-w-sm flex-col bg-paper shadow-2xl">
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-rule px-4">
              <span className="text-[0.7rem] font-bold tracking-[0.09em] text-ink-faint uppercase">
                Оглавление
              </span>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                aria-label="Закрыть"
                className="rounded-lg p-2 text-ink-soft hover:bg-paper-sunk"
              >
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path
                    d="m5 5 10 10M15 5 5 15"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 pt-4 scrollbar-thin">
              <ChapterList parts={parts} onNavigate={() => setMenuOpen(false)} />
            </div>
          </div>
        </div>
      )}

      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
