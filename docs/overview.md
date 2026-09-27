# Overview

`church-hub-next` e o app principal em Next.js para gestao de igrejas.

O projeto atual substitui a referencia antiga em Vite (`../old/church-hub`) e deve evoluir de forma incremental. O Vite pode ser consultado para paridade visual ou comportamento legado, mas nao deve ser tratado como fonte canônica.

## Stack

- Next.js App Router
- React 19
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
- A última execução completa fora do sandbox aprovou 41 arquivos e 136 testes.
- No sandbox restrito, testes de integração Prisma podem falhar com `EPERM` ao criar
  subprocessos; isso é limitação do ambiente de execução, não falha funcional já
  reproduzida fora dele.
- `npm run build` é obrigatório antes de deploy e deve ser revalidado após mudanças
  em módulos, Prisma ou configuração do Next.

Para iniciar localmente, consulte o fluxo completo no README e em
`docs/operations.md`. O app possui dois contextos de autenticação na mesma tela
`/auth/login`: usuários da igreja informam o slug; administradores globais deixam o
slug vazio.

## Direcao

O foco atual é organização, estabilidade e reutilização de UI. Antes de grandes refatorações, priorizar:

1. Tratar os itens P0/P1 da [auditoria técnica](./technical-audit-2026-09.md).
2. Alinhar PWA/Serwist ao bundler oficial e validar em dispositivos reais.
3. Consolidar notificações, SSE e polling.
4. Reduzir páginas grandes movendo estado e UI para `features`.
5. Manter os componentes de `src/components/ui` como primitives reutilizáveis.
