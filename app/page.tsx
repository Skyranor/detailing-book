import Link from 'next/link';
import {
  getAllChapters,
  getBookStats,
  getParts,
  getReadmeSections,
  type BookPart,
} from '@/lib/book';
import { renderMarkdown } from '@/lib/markdown';

const STATUS_DOT: Record<string, string> = {
  done: 'bg-[var(--success)]',
  wip: 'bg-[var(--money)]',
  planned: 'bg-rule-strong',
};

function plural(n: number, forms: [string, string, string]) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return forms[1];
  return forms[2];
}

function PartCard({ part }: { part: BookPart }) {
  const done = part.chapters.filter((c) => c.status !== 'planned').length;

  return (
    <section className="flex flex-col rounded-2xl border border-rule bg-paper-raised p-5 shadow-[var(--shadow-card)]">
      <header className="mb-4 flex items-baseline justify-between gap-3 border-b border-rule pb-3">
        <h3 className="text-[0.95rem] leading-tight font-bold tracking-tight">{part.title}</h3>
        <span className="shrink-0 font-mono text-[0.65rem] text-ink-faint">
          {part.levels ?? ''} · {done}/{part.chapters.length}
        </span>
      </header>

      <ul className="space-y-1">
        {part.chapters.map((chapter) => {
          const inner = (
            <>
              <span
                aria-hidden="true"
                className={`mt-[0.55em] h-1.5 w-1.5 shrink-0 rounded-full ${STATUS_DOT[chapter.status]}`}
              />
              <span className="w-5 shrink-0 font-mono text-[0.7rem] text-ink-faint tabular-nums">
                {chapter.number}
              </span>
              <span className="leading-snug">{chapter.title}</span>
            </>
          );

          return (
            <li key={chapter.slug}>
              {chapter.status === 'planned' ? (
                <span
                  className="flex items-start gap-2 rounded-lg px-1.5 py-1 text-[0.845rem] text-ink-faint/75"
                  title="Глава ещё не написана"
                >
                  {inner}
                </span>
              ) : (
                <Link
                  href={`/read/${chapter.slug}`}
                  className="flex items-start gap-2 rounded-lg px-1.5 py-1 text-[0.845rem] text-ink-soft transition-colors hover:bg-accent-soft hover:text-accent"
                >
                  {inner}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default async function HomePage() {
  const [parts, stats, all, readme] = await Promise.all([
    getParts(),
    getBookStats(),
    getAllChapters(),
    getReadmeSections(),
  ]);

  const written = new Set(all.filter((c) => c.status !== 'planned').map((c) => c.slug));
  const titles = new Map(all.map((c) => [c.slug, c.title]));
  const opts = { written, titles, dropRules: true };

  const order = [
    'Границы книги',
    'Как читать цифры в этой книге',
    'Уровни мастера',
    'Маршруты чтения',
    'Практика: донорская деталь',
    'Параметры, под которые считалась книга',
  ];

  const rendered = await Promise.all(
    order
      .filter((title) => readme.sections.has(title))
      .map(async (title) => ({
        title,
        html: (await renderMarkdown(readme.sections.get(title)!, opts)).html,
      })),
  );

  const disclaimer = readme.sections.get('Дисклеймер');
  const disclaimerHtml = disclaimer ? (await renderMarkdown(disclaimer, opts)).html : null;

  const first = all.find((c) => c.status !== 'planned');

  return (
    <div className="mx-auto w-full max-w-5xl px-5 pb-24 sm:px-8">
      {/* Обложка */}
      <header className="border-b border-rule py-14 sm:py-20">
        <p className="mb-5 font-mono text-[0.7rem] tracking-[0.18em] text-accent uppercase">
          Ремесло · Книга
        </p>

        <h1 className="max-w-3xl text-balance text-[2.1rem] leading-[1.08] font-bold tracking-tight sm:text-[3.1rem]">
          Детейлинг:{' '}
          <span className="text-ink-soft">от новичка до владельца студии</span>
        </h1>

        <p className="mt-6 max-w-2xl font-serif text-[1.15rem] leading-relaxed text-ink-soft">
          Книга не про то, какую банку купить. Она про то, что физически происходит
          с лаком, водой, абразивом и деньгами, — и почему порядок работы именно такой.
        </p>

        <div className="mt-9 flex flex-wrap items-center gap-3">
          <Link
            href="/read/07-safety"
            className="rounded-xl bg-accent px-5 py-3 text-[0.9rem] font-semibold text-paper transition-opacity hover:opacity-90"
          >
            Читать с главы 7 — безопасность
          </Link>
          {first && (
            <Link
              href={`/read/${first.slug}`}
              className="rounded-xl border border-rule bg-paper-raised px-5 py-3 text-[0.9rem] font-semibold text-ink transition-colors hover:border-rule-strong"
            >
              Начать с главы 1
            </Link>
          )}
        </div>

        <dl className="mt-10 flex flex-wrap gap-x-10 gap-y-4 border-t border-rule pt-7 text-[0.85rem]">
          <div>
            <dt className="text-ink-faint">Написано глав</dt>
            <dd className="mt-0.5 font-mono text-lg font-bold tabular-nums">
              {stats.written} <span className="text-ink-faint">/ {stats.total}</span>
            </dd>
          </div>
          <div>
            <dt className="text-ink-faint">Объём</dt>
            <dd className="mt-0.5 font-mono text-lg font-bold tabular-nums">
              {stats.words.toLocaleString('ru-RU')}{' '}
              <span className="text-ink-faint">{plural(stats.words, ['слово', 'слова', 'слов'])}</span>
            </dd>
          </div>
          <div>
            <dt className="text-ink-faint">Время чтения</dt>
            <dd className="mt-0.5 font-mono text-lg font-bold tabular-nums">
              ≈ {Math.round(stats.minutes / 60)}{' '}
              <span className="text-ink-faint">
                {plural(Math.round(stats.minutes / 60), ['час', 'часа', 'часов'])}
              </span>
            </dd>
          </div>
        </dl>
      </header>

      {/* Главный тезис и главный риск */}
      <section className="grid gap-5 border-b border-rule py-12 sm:grid-cols-2">
        <div className="rounded-2xl border border-rule bg-paper-raised p-6">
          <h2 className="mb-3 text-[0.7rem] font-bold tracking-[0.1em] text-ink-faint uppercase">
            Главный тезис
          </h2>
          <p className="font-serif text-[1.02rem] leading-relaxed">
            Рецепт без модели не переносится. «Полируй на 1500 оборотах» — не знание.
            Знание — это связь «твёрдость лака → режущая способность пары паста+пад →
            тепловой предел → сколько микрон уходит за проход», из которой обороты
            выводятся под конкретную машину.
          </p>
        </div>

        <div className="rounded-2xl border border-[var(--danger)]/25 bg-[var(--danger-soft)] p-6">
          <h2 className="mb-3 text-[0.7rem] font-bold tracking-[0.1em] text-[var(--danger)] uppercase">
            Главный риск
          </h2>
          <p className="font-serif text-[1.02rem] leading-relaxed">
            Ошибка необратима. Пересолённый суп можно вылить и сварить заново,
            криво повешенную полку — перевесить. Прожог лака на крыле не отменяется
            ничем: это перекрас за свой счёт и минус к цене автомобиля навсегда.
          </p>
        </div>
      </section>

      {/* Предупреждение про главу 7 */}
      <section className="border-b border-rule py-10">
        <div className="flex flex-col gap-4 rounded-2xl border border-[var(--money)]/30 bg-[var(--money-soft)] p-6 sm:flex-row sm:items-center">
          <span aria-hidden="true" className="text-2xl leading-none text-[var(--money)]">
            ⚠
          </span>
          <p className="flex-1 text-[0.95rem] leading-relaxed">
            <strong className="font-semibold">Прочитайте это до первой покупки химии.</strong>{' '}
            Глава 7 — про кислоты, щёлочи, полировальную пыль и аэрозоли покрытий —
            написана первой и читается первой, до главы 1. Кислотный очиститель дисков
            и распыляемая керамика калечат людей раньше, чем те успевают испортить
            первую деталь.
          </p>
          <Link
            href="/read/07-safety"
            className="shrink-0 rounded-lg border border-[var(--money)]/40 px-4 py-2 text-[0.85rem] font-semibold text-[var(--money)] hover:bg-[var(--money)]/10"
          >
            Открыть главу 7
          </Link>
        </div>
      </section>

      {/* Оглавление */}
      <section className="py-14">
        <h2 className="mb-2 text-2xl font-bold tracking-tight">Оглавление</h2>
        <p className="mb-8 text-[0.87rem] text-ink-faint">
          <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-[var(--success)] align-middle" />
          написана
          <span className="mx-1 ml-5 inline-block h-1.5 w-1.5 rounded-full bg-rule-strong align-middle" />
          запланирована
        </p>

        <div className="grid gap-5 md:grid-cols-2">
          {parts.map((part) => (
            <PartCard key={part.index} part={part} />
          ))}
        </div>
      </section>

      {/* Разделы предисловия из README */}
      {rendered.map((section) => (
        <section key={section.title} className="border-t border-rule py-12">
          <h2 className="mb-6 text-2xl font-bold tracking-tight">{section.title}</h2>
          <div className="prose" dangerouslySetInnerHTML={{ __html: section.html }} />
        </section>
      ))}

      {disclaimerHtml && (
        <section className="border-t border-rule py-12">
          <h2 className="mb-6 text-[0.7rem] font-bold tracking-[0.1em] text-ink-faint uppercase">
            Дисклеймер
          </h2>
          <div
            className="prose text-[0.95rem] text-ink-soft"
            dangerouslySetInnerHTML={{ __html: disclaimerHtml }}
          />
        </section>
      )}
    </div>
  );
}
