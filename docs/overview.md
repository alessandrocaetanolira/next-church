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

## Estado da validação

- `npx tsc --noEmit` passa.
- `npm run lint` passa.
- A última execução de `npm test` teve 26 arquivos aprovados e 4 com falha: o teste
  da API Bíblia retornou 500 e três suítes de integração receberam `spawnSync
  /bin/sh EPERM` ao tentar executar migrations neste ambiente.
- `npm run build` é obrigatório antes de deploy e deve ser revalidado após mudanças
  em módulos, Prisma ou configuração do Next.

Para iniciar localmente, consulte o fluxo completo no README e em
`docs/operations.md`. O app possui dois contextos de autenticação: usuários da
igreja em `/auth/login` e administradores globais em `/admin/login`.

## Direcao

O foco atual é organização, estabilidade e reutilização de UI. Antes de grandes refatorações, priorizar:

1. Corrigir build.
2. Corrigir testes de sync.
3. Padronizar componentes compartilhados.
4. Reduzir paginas grandes movendo estado e UI para `features`.
5. Manter os componentes de `src/components/ui` como primitives reutilizaveis.
