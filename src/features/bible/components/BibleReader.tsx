'use client';
import { useBibleChapter } from '../hooks/use-bible';
import { Card, CardContent } from '@/components/ui/card';

export function BibleReader({ book, chapter }: { book: string, chapter: number }) {
  const data = useBibleChapter(book, chapter);

  if (!data) {
    return <div className="text-center py-10">Carregando Bíblia...</div>;
  }

  return (
    <Card>
      <CardContent className="p-6">
        <h2 className="text-2xl font-bold mb-4 border-b pb-2">{book} {chapter}</h2>
        <div className="space-y-4 text-lg">
          {data.verses.map((v: string, i: number) => (
            <p key={i}>
              <span className="font-bold text-primary mr-2 text-sm">{i + 1}</span>
              {v}
            </p>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
