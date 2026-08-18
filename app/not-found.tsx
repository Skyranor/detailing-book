import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-xl flex-col justify-center px-6 py-20">
      <p className="font-mono text-[0.7rem] tracking-[0.18em] text-accent uppercase">Страница 404</p>
      <h1 className="mt-4 text-3xl font-bold tracking-tight">Такой главы здесь нет</h1>
      <p className="mt-4 font-serif text-[1.05rem] leading-relaxed text-ink-soft">
        Возможно, глава ещё не написана: книга выходит по частям, и оглавление
        объявлено целиком заранее. Открытые главы собраны на первой странице.
      </p>
      <Link
        href="/"
        className="mt-8 w-fit rounded-xl bg-accent px-5 py-3 text-[0.9rem] font-semibold text-paper hover:opacity-90"
      >
        К оглавлению
      </Link>
    </div>
  );
}
