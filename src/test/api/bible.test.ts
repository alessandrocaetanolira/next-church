import { describe, it, expect, vi } from 'vitest';
import { GET } from '@/app/api/bible/[book]/[chapter]/route';
import { NextRequest } from 'next/server';

// Mock do prisma e auth
vi.mock('@/lib/prisma-factory', () => ({
  getTenantClient: () => ({
    book: {
      findUnique: vi.fn().mockResolvedValue({
        id: '1',
        name: 'Gênesis',
        chapters: [{
          verses: [{ number: 1, text: 'No princípio, Deus criou os céus e a terra.' }]
        }]
      })
    }
  })
}));

vi.mock('@/auth', () => ({
  auth: () => Promise.resolve({ user: { tenantId: 'test' } }),
}));

describe('API Bíblia', () => {
  it('deve buscar versículos de um capítulo', async () => {
    const req = new NextRequest('http://localhost:3000/api/bible/gn/1');
    const response = await GET(req, { params: Promise.resolve({ book: 'gn', chapter: '1' }) });
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.verses).toBeDefined();
    expect(data.verses[0]).toBe('No princípio, Deus criou os céus e a terra.');
  });
});
