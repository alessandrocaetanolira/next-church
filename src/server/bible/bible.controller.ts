import { BiblePolicy } from './bible.policy';
import { BibleService } from './bible.service';

type User = Parameters<typeof BiblePolicy.assertView>[0];

export function listBibleBooks(user: User, service: BibleService) { BiblePolicy.assertView(user); return service.listBooks(); }
export function listBibleChapters(user: User, service: BibleService, book: string) { BiblePolicy.assertView(user); return service.listChapters(book); }
export function getBibleChapter(user: User, service: BibleService, book: string, chapter: string) { BiblePolicy.assertView(user); return service.getChapter(book, chapter); }
