import { describe, it, expect } from 'vitest';
import { db } from '@/lib/db';

describe('Limpeza de Cache', () => {
  it('deve limpar todas as tabelas do Dexie', async () => {
    // Adiciona dado para teste
    await db.feedPosts.add({
      userId: 'test',
      userName: 'test',
      type: 'verse',
      content: 'test',
      likes: [],
      comments: [],
      createdAt: new Date().toISOString(),
    });

    // Executa a limpeza
    await db.delete(); // Deleta o banco local
    await db.open();   // Reabre para nova sessão

    const count = await db.feedPosts.count();
    expect(count).toBe(0);
  });
});
