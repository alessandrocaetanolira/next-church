import { NotFoundError, ValidationError } from '@/lib/http/errors';
import { BibleRepository } from './bible.repository';

const BOOK_ALIASES: Record<string, string> = { 'gênesis': 'gn', genesis: 'gn', exodo: 'ex', 'êxodo': 'ex', levitico: 'lv', 'levítico': 'lv', numeros: 'nm', 'números': 'nm', deuteronomio: 'dt', 'deuteronômio': 'dt', josue: 'js', 'josué': 'js', juizes: 'jz', 'juízes': 'jz', rute: 'rt', '1-samuel': '1sm' };

export class BibleService {
  constructor(private readonly repository: BibleRepository) {}

  async manifest() {
    const translations = await this.repository.contentManifest();
    const contentVersion = this.buildContentVersion(translations);
    return { contentVersion, generatedAt: new Date().toISOString(), translations };
  }

  async listBooks(translation = 'NVI') {
    const books = await this.repository.listBooks(this.normalizeTranslation(translation));
    const translations = await this.repository.contentManifest();
    return { books, contentVersion: this.buildContentVersion(translations) };
  }

  async listChapters(book: string, translation = 'NVI') {
    const normalizedTranslation = this.normalizeTranslation(translation);
    const numbers = await this.repository.listChapterNumbers(this.resolveBook(book), normalizedTranslation);
    if (!numbers) throw new NotFoundError('Livro não encontrado.');
    const translations = await this.repository.contentManifest();
    return { chapters: numbers, contentVersion: this.buildContentVersion(translations) };
  }

  async getChapter(book: string, chapter: string, translation = 'NVI') {
    const number = Number(chapter);
    if (!Number.isInteger(number) || number <= 0) throw new ValidationError('Capítulo inválido.');
    const normalizedTranslation = this.normalizeTranslation(translation);
    const data = await this.repository.findChapter(this.resolveBook(book), number, normalizedTranslation);
    if (!data || !data.verses.length) throw new NotFoundError('Capítulo não encontrado.');
    const translations = await this.repository.contentManifest();
    return {
      book: data.name,
      chapter: number,
      translation: normalizedTranslation,
      verses: data.verses.map((verse) => verse.text),
      contentVersion: this.buildContentVersion(translations),
    };
  }

  private resolveBook(book: string) { const normalized = decodeURIComponent(book).trim().toLowerCase(); return BOOK_ALIASES[normalized] ?? normalized; }
  private buildContentVersion(translations: Array<{ translationCode: string; bookCount: number; verseCount: number }>) {
    return `shared-bible-v1-${translations.map((item) => `${item.translationCode}:${item.bookCount}:${item.verseCount}`).join('|')}`;
  }
  private normalizeTranslation(value: string) {
    const translation = value.trim().toUpperCase();
    if (!['AA', 'ACF', 'NVI'].includes(translation)) throw new ValidationError('Tradução inválida.');
    return translation;
  }
}
