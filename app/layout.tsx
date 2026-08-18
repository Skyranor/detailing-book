import type { Metadata, Viewport } from 'next';
import { Literata, Manrope, JetBrains_Mono } from 'next/font/google';
import { getParts } from '@/lib/book';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import './globals.css';

const literata = Literata({
  subsets: ['cyrillic', 'latin'],
  display: 'swap',
  variable: '--font-literata',
});

const manrope = Manrope({
  subsets: ['cyrillic', 'latin'],
  display: 'swap',
  variable: '--font-manrope',
});

const mono = JetBrains_Mono({
  subsets: ['cyrillic', 'latin'],
  display: 'swap',
  variable: '--font-mono-book',
});

export const metadata: Metadata = {
  title: {
    default: 'Детейлинг: от новичка до владельца студии',
    template: '%s — Детейлинг: от новичка до владельца студии',
  },
  description:
    'Книга о том, что физически происходит с лаком, водой, абразивом и деньгами, ' +
    'и почему порядок работы именно такой. От первой мойки до своей студии.',
  openGraph: {
    type: 'book',
    locale: 'ru_RU',
    title: 'Детейлинг: от новичка до владельца студии',
    description:
      'Не про то, какую банку купить. Про физику лака, цену ошибки и экономику студии.',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fbf9f5' },
    { media: '(prefers-color-scheme: dark)', color: '#151412' },
  ],
};

/** Тема выбирается до первой отрисовки, иначе на секунду мигает белым. */
const themeScript = `
(function () {
  try {
    var saved = localStorage.getItem('theme');
    var dark = saved ? saved === 'dark'
      : window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (dark) document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const parts = await getParts();

  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${literata.variable} ${manrope.variable} ${mono.variable}`}>
        <Header parts={parts} />
        <div className="mx-auto flex w-full max-w-[1600px]">
          <Sidebar parts={parts} />
          <div className="min-w-0 flex-1">{children}</div>
        </div>
      </body>
    </html>
  );
}
