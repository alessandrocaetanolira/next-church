import { BiblePolicy } from './bible.policy';
import { BibleService } from './bible.service';

type User = Parameters<typeof BiblePolicy.assertView>[0];

export function listBibleBooks(user: User, service: BibleService, translation?: string) { BiblePolicy.assertView(user); return service.listBooks(translation); }
export function listBibleChapters(user: User, service: BibleService, book: string, translation?: string) { BiblePolicy.assertView(user); return service.listChapters(book, translation); }
export function getBibleChapter(user: User, service: BibleService, book: string, chapter: string, translation?: string) { BiblePolicy.assertView(user); return service.getChapter(book, chapter, translation); }
