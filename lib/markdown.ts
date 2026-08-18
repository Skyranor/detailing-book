import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeRaw from 'rehype-raw';
import rehypeSlug from 'rehype-slug';
import rehypeStringify from 'rehype-stringify';
import { visit } from 'unist-util-visit';
import { toString } from 'hast-util-to-string';
import type { Element, ElementContent, Properties, Root, Text } from 'hast';

export type Heading = { id: string; text: string; level: 2 | 3 };

/**
 * Разделы главы одинаковы во всех главах, поэтому каждый получает свой
 * характер: «Безопасность» и «Цена ошибки» должны быть видны при
 * пролистывании, «Глубже» — наоборот, не отвлекать.
 */
const SECTION_KINDS: Array<[RegExp, string]> = [
  [/^Зачем это знать/i, 'why'],
  [/^Ментальная модель/i, 'model'],
  [/^Что происходит физически/i, 'physics'],
  [/^Протокол/i, 'protocol'],
  [/^Проверка на тест-панели/i, 'test'],
  [/^Безопасность/i, 'safety'],
  [/^Цена ошибки/i, 'cost'],
  [/^Мифы/i, 'myths'],
  [/^Срок годности совета/i, 'expiry'],
  [/^Ловушки перехода/i, 'traps'],
  [/^Что меняется на потоке/i, 'flow'],
  [/^Деньги/i, 'money'],
  [/^Что нельзя обещать клиенту/i, 'promise'],
  [/^Глубже/i, 'deeper'],
  [/^Правила мастера/i, 'rules'],
  [/^Так делать нельзя/i, 'never'],
  [/^Как отличают профи/i, 'pro'],
  [/^Практика/i, 'practice'],
  [/^Итоги главы/i, 'summary'],
];

const MARKERS: Record<string, string> = {
  'ПРОВЕРЬ TDS': 'tds',
  'СПОРНО': 'debated',
  'НЕ ОБЕЩАЙ КЛИЕНТУ': 'promise',
};

const MARKER_RE = /\[(ПРОВЕРЬ TDS|СПОРНО|НЕ ОБЕЩАЙ КЛИЕНТУ)\]/g;
const ICON_RE = /([❌✅])/g;

function sectionKind(text: string): string | null {
  for (const [re, kind] of SECTION_KINDS) if (re.test(text)) return kind;
  return null;
}

function el(tagName: string, properties: Properties, children: ElementContent[]): Element {
  return { type: 'element', tagName, properties, children };
}

export type RenderOptions = {
  /** Главы, у которых есть страница. Ссылки на остальные не должны вести в 404. */
  written?: Set<string>;
  /** Названия глав по слагу — для подписи «ещё не написана». */
  titles?: Map<string, string>;
  /** Убирать горизонтальные линии: на сайте разделы разделяет вёрстка. */
  dropRules?: boolean;
};

function rewriteHref(href: string): { to: string; slug: string | null } | null {
  if (/^(https?:|mailto:|tel:)/.test(href)) return null;
  if (href.startsWith('#')) return { to: href, slug: null };

  const [pathPart, hash] = href.split('#');
  const anchor = hash ? `#${hash}` : '';

  if (/(^|\/)README\.md$/.test(pathPart)) return { to: `/${anchor}`, slug: null };

  const chapter = pathPart.match(/(?:^|\/)([\w.-]+)\.md$/);
  if (chapter) {
    const slug = chapter[1];
    return { to: `/read/${slug}${anchor}`, slug };
  }
  return null;
}

function splitText(value: string): ElementContent[] | null {
  if (!MARKER_RE.test(value) && !ICON_RE.test(value)) return null;
  MARKER_RE.lastIndex = 0;
  ICON_RE.lastIndex = 0;

  const out: ElementContent[] = [];
  const combined = /\[(?:ПРОВЕРЬ TDS|СПОРНО|НЕ ОБЕЩАЙ КЛИЕНТУ)\]|[❌✅]/g;
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = combined.exec(value))) {
    if (match.index > last) out.push({ type: 'text', value: value.slice(last, match.index) });
    const token = match[0];
    if (token.startsWith('[')) {
      const key = token.slice(1, -1);
      out.push(
        el('span', { className: ['marker', `marker--${MARKERS[key]}`] }, [
          { type: 'text', value: key },
        ]),
      );
    } else {
      out.push(
        el('span', { className: ['ico', token === '✅' ? 'ico--yes' : 'ico--no'], 'aria-hidden': 'true' }, [
          { type: 'text', value: token },
        ]),
      );
    }
    last = match.index + token.length;
  }
  if (last < value.length) out.push({ type: 'text', value: value.slice(last) });
  return out;
}

function rehypeBook(options: RenderOptions) {
  return (tree: Root) => {
    // Ссылки: относительные пути между файлами → адреса страниц сайта.
    visit(tree, 'element', (node: Element, index, parent) => {
      if (node.tagName !== 'a' || typeof node.properties?.href !== 'string') return;
      const rewritten = rewriteHref(node.properties.href);
      if (!rewritten) {
        if (/^https?:/.test(String(node.properties.href))) {
          node.properties.target = '_blank';
          node.properties.rel = ['noreferrer'];
        }
        return;
      }
      if (rewritten.slug && options.written && !options.written.has(rewritten.slug)) {
        const title = options.titles?.get(rewritten.slug);
        const replacement = el(
          'span',
          {
            className: ['link-planned'],
            title: title ? `«${title}» — глава ещё не написана` : 'Глава ещё не написана',
          },
          node.children,
        );
        if (parent && typeof index === 'number') parent.children[index] = replacement;
        return;
      }
      node.properties.href = rewritten.to;
    });

    // Заголовки разделов получают вид, а не просто размер.
    visit(tree, 'element', (node: Element) => {
      if (node.tagName !== 'h2') return;
      const kind = sectionKind(toString(node));
      if (kind) node.properties = { ...node.properties, 'data-kind': kind };
    });

    // Таблицы шире экрана: горизонтальная прокрутка вместо ломаной вёрстки.
    visit(tree, 'element', (node: Element, index, parent) => {
      if (node.tagName !== 'table' || !parent || typeof index !== 'number') return;
      if ((parent as Element).tagName === 'figure') return;
      parent.children[index] = el('figure', { className: ['table-scroll'] }, [node]);
    });

    // Блоки схем: моноширинный текст с горизонтальной прокруткой.
    visit(tree, 'element', (node: Element) => {
      if (node.tagName !== 'pre') return;
      const code = node.children.find(
        (c): c is Element => c.type === 'element' && c.tagName === 'code',
      );
      const cls = code?.properties?.className;
      const lang = Array.isArray(cls)
        ? String(cls.find((c) => String(c).startsWith('language-')) ?? '').replace('language-', '')
        : '';
      node.properties = { ...node.properties, 'data-lang': lang || 'text' };
    });

    // Абзацы-предупреждения: ⚠️ в начале строки → выделенная плашка.
    visit(tree, 'element', (node: Element, index, parent) => {
      if (node.tagName !== 'p' || !parent || typeof index !== 'number') return;
      const first = node.children[0];
      if (first?.type !== 'text' || !/^\s*⚠️?/.test(first.value)) return;
      (first as Text).value = first.value.replace(/^\s*⚠️?\s*/, '');
      parent.children[index] = el('div', { className: ['callout', 'callout--warn'] }, [node]);
    });

    if (options.dropRules) {
      visit(tree, 'element', (node: Element, index, parent) => {
        if (node.tagName === 'hr' && parent && typeof index === 'number') {
          parent.children.splice(index, 1);
          return index;
        }
      });
    }

    // Текстовые маркеры книги и значки ❌ ✅.
    visit(tree, 'text', (node: Text, index, parent) => {
      if (!parent || typeof index !== 'number') return;
      if (parent.type === 'element' && ['code', 'pre'].includes((parent as Element).tagName)) return;
      const parts = splitText(node.value);
      if (parts) parent.children.splice(index, 1, ...parts);
    });

    // `[НЕ ОБЕЩАЙ КЛИЕНТУ]` встречается и как строчный код.
    visit(tree, 'element', (node: Element, index, parent) => {
      if (node.tagName !== 'code' || !parent || typeof index !== 'number') return;
      const value = toString(node).trim();
      const key = value.replace(/^\[|\]$/g, '');
      if (!(key in MARKERS)) return;
      parent.children[index] = el('span', { className: ['marker', `marker--${MARKERS[key]}`] }, [
        { type: 'text', value: key },
      ]);
    });
  };
}

function rehypeCollectHeadings(sink: Heading[]) {
  return (tree: Root) => {
    visit(tree, 'element', (node: Element) => {
      if (node.tagName !== 'h2' && node.tagName !== 'h3') return;
      const id = typeof node.properties?.id === 'string' ? node.properties.id : '';
      if (!id) return;
      sink.push({ id, text: toString(node), level: node.tagName === 'h2' ? 2 : 3 });
    });
  };
}

export async function renderMarkdown(
  markdown: string,
  options: RenderOptions = {},
): Promise<{ html: string; headings: Heading[] }> {
  const headings: Heading[] = [];

  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeSlug)
    .use(rehypeCollectHeadings, headings)
    .use(rehypeBook, options)
    .use(rehypeStringify, { allowDangerousHtml: true })
    .process(markdown);

  return { html: String(file), headings };
}
