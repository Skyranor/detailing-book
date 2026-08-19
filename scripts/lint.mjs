#!/usr/bin/env node
// Линтер оформления книги. Правила и обоснования — CONVENTIONS.md.
//
//   npm run lint                    все файлы, ненулевой код при находках
//   npm run lint -- --report        отчёт без ненулевого кода возврата
//   npm run lint -- chapters/07-safety.md   только эти файлы
//
// Зависимостей нет намеренно: линтер должен работать на голом Node
// в любой момент жизни репозитория.

import { readdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');

/** Теги, допустимые у блока кода. Роль → тег описана в CONVENTIONS §2.1. */
const ALLOWED_TAGS = new Set(['text', 'bash']);

/** Эмодзи, разрешённые мастер-промтом. */
const ALLOWED_EMOJI = new Set(['❌', '✅', '⚠️', '⚠']);
/** Дополнительно разрешены в README: легенда статуса глав. */
const README_EMOJI = new Set(['🟡', '⬜', '☐']);

// Пиктографические эмодзи и «галочки/крестики/ромбы». Стрелки (→ ← ▲ ▼ ◀ ▶)
// и рамки псевдографики — обычная типографика схем, они не ловятся.
const DECORATIVE =
  /[\u{1F300}-\u{1FAFF}\u{2700}-\u{27BF}\u{2611}\u{2612}\u{2713}\u{2714}\u{2717}\u{2718}\u{25CF}\u{25CB}\u{25C6}\u{25C7}\u{25D0}]/gu;

/** Максимальная ширина строки внутри блока `text`: шире — ломается переносом. */
const MAX_FENCE_WIDTH = 80;

/** Слова, с которых начинается врезка (CONVENTIONS §4). */
const CALLOUT_WORDS = new Set(['Пример', 'Откуда цифра', 'Для новичка', 'Для опытного']);

/**
 * Начала абзацев, похожие на врезку. Опечатка в слове не ломает сборку —
 * абзац просто выходит обычным текстом, поэтому её ловит линтер.
 */
const CALLOUT_NEAR = /^(пример|откуда|для новичк|для опытн|внимание|важно)/i;

/**
 * Файлы, где запрещённые формы — сам предмет текста: перечисление
 * недопустимых символов, примеры битых ссылок, тексты промтов.
 * Проверять их означает ловить находки в собственных примерах.
 */
const EXEMPT = [/^CONVENTIONS\.md$/, /^system\//];

const argv = process.argv.slice(2);
const REPORT_ONLY = argv.includes('--report');
const ONLY = argv.filter((a) => !a.startsWith('--'));

const findings = [];
let planned = 0;

const report = (file, line, rule, text) =>
  findings.push({ file: path.relative(ROOT, file), line, rule, text });

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else if (entry.name.endsWith('.md')) out.push(full);
  }
  return out;
}

/**
 * Главы, объявленные в оглавлении README. Ссылка на объявленную,
 * но ещё не написанную главу — норма, а не находка (CONVENTIONS §5).
 */
async function plannedChapters() {
  const readme = await readFile(path.join(ROOT, 'README.md'), 'utf8');
  const set = new Set();
  for (const m of readme.matchAll(/\]\((chapters\/[\w.-]+\.md)\)/g)) {
    set.add(path.resolve(ROOT, m[1]));
  }
  return set;
}

/** Ссылки и изображения с учётом вложенных скобок в тексте ссылки. */
function findLinks(line) {
  const out = [];
  for (let i = 0; i < line.length; i++) {
    if (line[i] !== '[') continue;
    if (i > 0 && line[i - 1] === '\\') continue;
    const isImage = i > 0 && line[i - 1] === '!';
    let depth = 0;
    let end = -1;
    for (let j = i; j < line.length; j++) {
      if (line[j] === '[') depth++;
      else if (line[j] === ']') {
        depth--;
        if (depth === 0) {
          end = j;
          break;
        }
      }
    }
    if (end === -1 || line[end + 1] !== '(') continue;
    const close = line.indexOf(')', end + 2);
    if (close === -1) continue;
    out.push({
      target: line.slice(end + 2, close).trim(),
      text: line.slice(i + 1, end).trim(),
      isImage,
    });
    i = close;
  }
  return out;
}

async function lintFile(file, planningSet) {
  const src = await readFile(file, 'utf8');
  const lines = src.split('\n');
  const rel = path.relative(ROOT, file);
  const isReadme = rel === 'README.md';
  const isChapter = rel.startsWith('chapters/');
  const emoji = new Set([...ALLOWED_EMOJI, ...(isReadme ? README_EMOJI : [])]);

  if (lines[0]?.trim() === '---') {
    report(file, 1, 'frontmatter', 'YAML-frontmatter запрещён (CONVENTIONS §1)');
  }

  let fence = null; // { tag, line, indent }
  let inDetails = false;

  lines.forEach((raw, idx) => {
    const num = idx + 1;
    const line = raw;
    const trimmed = line.trim();
    const fenceMatch = trimmed.match(/^(`{3,})(.*)$/);

    if (fenceMatch && !fence) {
      const info = fenceMatch[2].trim();
      const indent = line.length - line.trimStart().length;
      if (!info) {
        report(file, num, 'fence-untagged', 'блок кода без тега');
      } else if (/\s|[{=]/.test(info)) {
        report(file, num, 'fence-meta', `метаданные у фенса: ${info}`);
      } else if (!ALLOWED_TAGS.has(info)) {
        report(file, num, 'fence-unknown-tag', `тег «${info}» не из списка text/bash`);
      }
      if (indent > 0) {
        report(file, num, 'fence-indented', 'блок кода с отступом (внутри списка)');
      }
      if (/^\s*>/.test(line)) {
        report(file, num, 'fence-in-quote', 'блок кода внутри blockquote');
      }
      fence = { tag: info, line: num };
      return;
    }

    if (fenceMatch && fence) {
      fence = null;
      return;
    }

    if (fence) {
      if (fence.tag === 'text' && [...line].length > MAX_FENCE_WIDTH) {
        report(
          file,
          num,
          'fence-wide',
          `строка схемы ${[...line].length} символов, максимум ${MAX_FENCE_WIDTH}`,
        );
      }
      return; // внутри блока остальные правила не действуют
    }

    // --- эмодзи и маркеры, вне блоков кода ---
    for (const m of line.matchAll(DECORATIVE)) {
      const ch = m[0];
      if (emoji.has(ch)) continue;
      report(file, num, /[✓✔✗✘●○◆◇◐]/.test(ch) ? 'marks' : 'emoji', `символ ${ch}`);
    }

    // --- <details> ---
    if (trimmed === '<details>') inDetails = true;
    if (trimmed === '</summary>' && lines[idx + 1]?.trim() !== '') {
      report(file, num, 'details-blank-line', 'нужна пустая строка после </summary>');
    }
    if (trimmed === '</details>') {
      if (lines[idx - 1]?.trim() !== '') {
        report(file, num, 'details-blank-line', 'нужна пустая строка перед </details>');
      }
      inDetails = false;
    }

    // --- врезки: слово из списка §4 или обычный текст, но не «почти врезка» ---
    const callout = trimmed.match(/^\*\*([^*]{1,24})[.:]\*\*/);
    if (callout) {
      const word = callout[1].trim();
      if (!CALLOUT_WORDS.has(word) && CALLOUT_NEAR.test(word)) {
        report(
          file,
          num,
          'callout-unknown',
          `врезка «${word}» не из списка ${[...CALLOUT_WORDS].join(' / ')}`,
        );
      }
    }

    // --- ссылки и изображения ---
    for (const { target, text, isImage } of findLinks(line)) {
      if (isImage) {
        if (!text) report(file, num, 'image-no-alt', 'изображение без подписи');
        if (/^(https?:|data:)/.test(target)) continue;
        // Сайт отдаёт содержимое public по адресу от корня: /img/… → public/img/…
        const abs = target.startsWith('/')
          ? path.join(ROOT, 'public', target)
          : path.resolve(path.dirname(file), target);
        if (!existsSync(abs)) {
          report(file, num, 'image-missing', `нет файла изображения: ${target}`);
        }
        continue;
      }
      if (/^(https?:|mailto:|#)/.test(target)) continue;
      const clean = target.split('#')[0];
      if (!clean) continue;
      const abs = path.resolve(path.dirname(file), clean);
      if (existsSync(abs)) continue;
      if (planningSet.has(abs)) {
        planned++;
        continue;
      }
      report(file, num, 'link-broken', `битая ссылка: ${target}`);
    }
  });

  if (fence) {
    report(file, fence.line, 'fence-unclosed', 'незакрытый блок кода');
  }
  if (inDetails) {
    report(file, lines.length, 'details-blank-line', 'незакрытый <details>');
  }

  if (isChapter) {
    const tail = lines.filter((l) => l.trim()).at(-1) ?? '';
    if (!tail.includes('](../README.md)')) {
      report(
        file,
        lines.length,
        'footer-missing',
        'нет подвала навигации (CONVENTIONS §7)',
      );
    }
  }
}

const planningSet = await plannedChapters();
const files = (
  ONLY.length ? ONLY.map((f) => path.resolve(ROOT, f)) : (await walk(ROOT)).sort()
).filter((f) => {
  const rel = path.relative(ROOT, f);
  return !EXEMPT.some((re) => re.test(rel));
});

for (const file of files) await lintFile(file, planningSet);

findings.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);
for (const f of findings) {
  console.log(`${f.file}:${f.line} — [${f.rule}] ${f.text}`);
}

const byRule = findings.reduce((acc, f) => {
  acc[f.rule] = (acc[f.rule] ?? 0) + 1;
  return acc;
}, {});

console.log(`\nПроверено файлов: ${files.length}. Находок: ${findings.length}.`);
if (planned) {
  console.log(`   ${String(planned).padStart(4)}  ссылок на ещё не написанные главы (не находка)`);
}
for (const [rule, count] of Object.entries(byRule).sort((a, b) => b[1] - a[1])) {
  console.log(`   ${String(count).padStart(4)}  ${rule}`);
}

if (findings.length && !REPORT_ONLY) process.exit(1);
