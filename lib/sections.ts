import GithubSlugger from 'github-slugger';

export type SectionDoc = {
  slug: string;
  number: number;
  chapter: string;
  section: string;
  anchor: string;
  text: string;
};

/** Убирает разметку, оставляя читаемый текст для поиска и подсказок. */
export function toPlainText(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^\s*\|[\s:-]+\|\s*$/gm, ' ')
    .replace(/\|/g, ' · ')
    .replace(/[*_`>#]/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\s*\n\s*/g, ' ')
    .trim();
}

/**
 * Режет главу на разделы по заголовкам второго уровня. Якоря считаются
 * тем же способом, что и при отрисовке страницы, иначе ссылки поиска
 * будут вести в начало главы.
 */
export function splitSections(body: string): Array<{ title: string; anchor: string; body: string }> {
  const slugger = new GithubSlugger();
  const lines = body.split('\n');
  const out: Array<{ title: string; anchor: string; body: string }> = [];
  let current: { title: string; anchor: string; lines: string[] } | null = null;
  let inFence = false;

  for (const line of lines) {
    if (/^\s*```/.test(line)) inFence = !inFence;

    const heading = !inFence && line.match(/^(#{2,4})\s+(.+?)\s*$/);
    if (heading) {
      const title = heading[2];
      const anchor = slugger.slug(title);
      if (heading[1].length === 2) {
        if (current) out.push({ title: current.title, anchor: current.anchor, body: current.lines.join('\n') });
        current = { title, anchor, lines: [] };
        continue;
      }
    }

    if (current) current.lines.push(line);
    else if (line.trim()) {
      current = { title: 'Начало главы', anchor: '', lines: [line] };
    }
  }

  if (current) out.push({ title: current.title, anchor: current.anchor, body: current.lines.join('\n') });
  return out;
}
