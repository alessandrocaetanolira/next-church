import { NotFoundError, ValidationError } from '@/lib/http/errors';
import { BibleRepository } from './bible.repository';

const BOOK_ALIASES: Record<string, string> = { 'gênesis': 'gn', genesis: 'gn', exodo: 'ex', 'êxodo': 'ex', levitico: 'lv', 'levítico': 'lv', numeros: 'nm', 'números': 'nm', deuteronomio: 'dt', 'deuteronômio': 'dt', josue: 'js', 'josué': 'js', juizes: 'jz', 'juízes': 'jz', rute: 'rt', '1-samuel': '1sm' };

export class BibleService {
  constructor(private readonly repository: BibleRepository) {}

  listBooks() { return this.repository.listBooks(); }

  async listChapters(book: string) {
    const numbers = await this.repository.listChapterNumbers(this.resolveBook(book));
    if (!numbers) throw new NotFoundError('Livro não encontrado.');
    return numbers;
  }

  async getChapter(book: string, chapter: string) {
    const number = Number(chapter);
    if (!Number.isInteger(number) || number <= 0) throw new ValidationError('Capítulo inválido.');
    const data = await this.repository.findChapter(this.resolveBook(book), number);
    if (!data || !data.chapters.length) throw new NotFoundError('Capítulo não encontrado.');
    return { book: data.name, chapter: data.chapters[0].number, verses: data.chapters[0].verses.map((verse) => verse.text) };
  }

  private resolveBook(book: string) { const normalized = decodeURIComponent(book).trim().toLowerCase(); return BOOK_ALIASES[normalized] ?? normalized; }
}
