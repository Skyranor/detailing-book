import type { BookPart } from '@/lib/book';
import { ChapterList } from './ChapterList';

export function Sidebar({ parts }: { parts: BookPart[] }) {
  return (
    <aside className="no-print sticky top-14 hidden h-[calc(100vh-3.5rem)] w-[19rem] shrink-0 overflow-y-auto border-r border-rule px-3 pt-6 lg:block scrollbar-thin">
      <ChapterList parts={parts} />
    </aside>
  );
}
