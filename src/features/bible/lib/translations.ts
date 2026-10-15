import type { BibleTranslation } from '../api/bible.api';

export const BIBLE_TRANSLATIONS: ReadonlyArray<{ code: BibleTranslation; name: string }> = [
  { code: 'NVI', name: 'Nova Versão Internacional' },
  { code: 'ACF', name: 'Almeida Corrigida Fiel' },
  { code: 'AA', name: 'Almeida Atualizada' },
];
