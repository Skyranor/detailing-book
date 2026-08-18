import { readFile } from 'node:fs/promises';
import path from 'node:path';

/**
 * Единственный источник правды о составе книги — оглавление в README.md.
 * Сайт его разбирает, а не дублирует: добавили главу в README — она
 * появилась в навигации сайта.
 */

const ROOT = process.cwd();

export type ChapterStatus = 'done' | 'wip' | 'planned';

export type ChapterEntry = {
  number: number;
  slug: string;
  title: string;
  status: ChapterStatus;
  partIndex: number;
};

export type BookPart = {
  index: number;
  title: string;
  levels: string | null;
  chapters: ChapterEntry[];
};

export type ChapterMeta = {
  level: string | null;
  block: string | null;
  risk: string | null;
  requires: number[];
};

export type Chapter = {
  entry: ChapterEntry;
  part: BookPart;
  heading: string;
  meta: ChapterMeta;
  body: string;
  words: number;
  minutes: number;
  prev: ChapterEntry | null;
  next: ChapterEntry | null;
};

const STATUS_BY_MARK: Record<string, ChapterStatus> = {
  '✅': 'done',
  '🟡': 'wip',
  '⬜': 'planned',
};

let cache: BookPart[] | null = null;

/** Разбирает таблицы оглавления README.md в список частей и глав. */
export async function getParts(): Promise<BookPart[]> {
  if (cache) return cache;

  const readme = await readFile(path.join(ROOT, 'README.md'), 'utf8');
  const afterToc = readme.split('\n## Оглавление\n')[1] ?? '';
  const tocBlock = afterToc.split('\n## ')[0];

  const parts: BookPart[] = [];
  let current: BookPart | null = null;

  for (const line of tocBlock.split('\n')) {
    const partMatch = line.match(/^###\s+(.+?)\s*$/);
    if (partMatch) {
      const levels = partMatch[1].match(/\(([^)]+)\)\s*$/);
      current = {
        index: parts.length,
        title: partMatch[1].replace(/\s*\([^)]+\)\s*$/, ''),
        levels: levels ? levels[1] : null,
        chapters: [],
      };
      parts.push(current);
      continue;
    }

    const row = line.match(
      /^\|\s*(\d+)\s*\|\s*\[([^\]]+)\]\(chapters\/([\w.-]+)\.md\)\s*\|\s*(.)\s*\|/u,
    );
    if (row && current) {
      current.chapters.push({
        number: Number(row[1]),
        title: row[2],
        slug: row[3],
        status: STATUS_BY_MARK[row[4]] ?? 'planned',
        partIndex: current.index,
      });
    }
  }

  cache = parts;
  return parts;
}

export async function getAllChapters(): Promise<ChapterEntry[]> {
  return (await getParts()).flatMap((p) => p.chapters);
}

/** Главы, у которых есть файл: только они открываются как страницы. */
export async function getWrittenChapters(): Promise<ChapterEntry[]> {
  return (await getAllChapters()).filter((c) => c.status !== 'planned');
}

export async function getSlugMap(): Promise<Map<string, ChapterEntry>> {
  return new Map((await getAllChapters()).map((c) => [c.slug, c]));
}

/**
 * Метаданные главы лежат строками сразу под заголовком, а не во
 * frontmatter, — чтобы файл оставался читаемым как обычный текст.
 */
function parseMetaLine(line: string): [string, string] | null {
  const m = line.trim().match(/^`([^:`]+):\s*([^`]+)`$/);
  return m ? [m[1].trim(), m[2].trim()] : null;
}

function stripFooter(lines: string[]): string[] {
  const out = [...lines];
  while (out.length && !out[out.length - 1].trim()) out.pop();
  if (out.length && out[out.length - 1].includes('](../README.md)')) {
    out.pop();
    while (out.length && !out[out.length - 1].trim()) out.pop();
    if (out.length && out[out.length - 1].trim() === '---') out.pop();
  }
  return out;
}

export async function getChapter(slug: string): Promise<Chapter | null> {
  const parts = await getParts();
  const all = parts.flatMap((p) => p.chapters);
  const index = all.findIndex((c) => c.slug === slug);
  if (index === -1) return null;

  const entry = all[index];
  if (entry.status === 'planned') return null;

  let raw: string;
  try {
    raw = await readFile(path.join(ROOT, 'chapters', `${slug}.md`), 'utf8');
  } catch {
    return null;
  }

  const lines = raw.split('\n');
  let i = 0;
  let heading = entry.title;
  if (lines[0]?.startsWith('# ')) {
    heading = lines[0].slice(2).replace(/^\d+\.\s*/, '').trim();
    i = 1;
  }

  const meta: ChapterMeta = { level: null, block: null, risk: null, requires: [] };
  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line) {
      i++;
      continue;
    }
    const pair = parseMetaLine(line);
    if (!pair) break;
    const [key, value] = pair;
    if (key.startsWith('Уровень')) meta.level = value;
    else if (key.startsWith('Блок')) meta.block = value;
    else if (key.startsWith('Риск')) meta.risk = value;
    else if (key.startsWith('Предполагает')) {
      meta.requires = value.split(/[,\s]+/).map(Number).filter(Number.isFinite);
    }
    i++;
  }

  while (i < lines.length && (!lines[i].trim() || lines[i].trim() === '---')) i++;

  const body = stripFooter(lines.slice(i)).join('\n');
  const words = body.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;

  const written = all.filter((c) => c.status !== 'planned');
  const writtenIndex = written.findIndex((c) => c.slug === slug);

  return {
    entry,
    part: parts[entry.partIndex],
    heading,
    meta,
    body,
    words,
    minutes: Math.max(1, Math.round(words / 180)),
    prev: writtenIndex > 0 ? written[writtenIndex - 1] : null,
    next: writtenIndex < written.length - 1 ? written[writtenIndex + 1] : null,
  };
}

/**
 * README разбирается на разделы по заголовкам второго уровня: обложка
 * сайта собирается из них, чтобы текст не пришлось держать в двух местах.
 */
export async function getReadmeSections(): Promise<{
  intro: string;
  sections: Map<string, string>;
}> {
  const readme = await readFile(path.join(ROOT, 'README.md'), 'utf8');
  const [head, ...rest] = readme.split(/\n## /);
  const sections = new Map<string, string>();

  for (const chunk of rest) {
    const nl = chunk.indexOf('\n');
    const title = chunk.slice(0, nl).trim();
    const body = chunk
      .slice(nl + 1)
      .replace(/^\s*---\s*$/gm, '')
      .trim();
    sections.set(title, body);
  }

  const intro = head
    .split('\n')
    .filter((l) => !l.startsWith('# '))
    .join('\n')
    .replace(/^\s*---\s*$/gm, '')
    .trim();

  return { intro, sections };
}

/** Сводка для обложки: сколько написано и какой объём получился. */
export async function getBookStats() {
  const all = await getAllChapters();
  const written = all.filter((c) => c.status !== 'planned');
  let words = 0;
  for (const c of written) {
    const chapter = await getChapter(c.slug);
    if (chapter) words += chapter.words;
  }
  return {
    total: all.length,
    written: written.length,
    words,
    minutes: Math.round(words / 180),
  };
}
