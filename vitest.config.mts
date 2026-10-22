import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    // Os testes de integração executam migrations Prisma e usam variáveis de
    // ambiente/processos compartilhados. Paralelizar esses arquivos causa
    // contenção e falsos timeouts nos hooks de preparação dos bancos.
    fileParallelism: false,
    maxWorkers: 1,
    setupFiles: ['./src/test/setup.ts'],
    // Auth.js usa imports next/server sem extensão que exigem resolução pelo Vite.
    server: { deps: { inline: ['next-auth'] } },
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
});
