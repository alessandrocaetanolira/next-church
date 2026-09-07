# Overview

`church-hub-next` e o app principal em Next.js para gestao de igrejas.

O projeto atual substitui a referencia antiga em Vite (`../old/church-hub`) e deve evoluir de forma incremental. O Vite pode ser consultado para paridade visual ou comportamento legado, mas nao deve ser tratado como fonte canônica.

## Stack

- Next.js App Router
- React 18
- TypeScript
- Prisma 6
- SQLite multi-tenant
- Dexie/IndexedDB
- Tailwind CSS
- shadcn/Radix UI
- NextAuth v5 beta
- SSE e PWA

## Estado Validado

- `npx tsc --noEmit` passa.
- `npm run lint` passa com warnings.
- `npm test` falha nos testes de sync por mocks incompletos de chamadas raw do Prisma.
- `npm run build` ainda falha na etapa webpack sem diagnostico detalhado no output atual.

## Direcao

O foco atual e organizacao, estabilidade e reutilizacao de UI. Antes de grandes refatoracoes, priorizar:

1. Corrigir build.
2. Corrigir testes de sync.
3. Padronizar componentes compartilhados.
4. Reduzir paginas grandes movendo estado e UI para `features`.
5. Manter os componentes de `src/components/ui` como primitives reutilizaveis.
