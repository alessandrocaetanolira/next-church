# Church Hub Next

Aplicativo Next.js para gestao de igrejas, com autenticacao, multi-tenancy, modulos administrativos, cantina, membros, grupos, escalas, materiais, notificacoes, leitura biblica, quiz, jogos e suporte offline/PWA.

## Stack

- Next.js 15
- React 18
- TypeScript
- Tailwind CSS
- shadcn/Radix UI
- NextAuth v5 beta
- Prisma 6
- SQLite
- Dexie/IndexedDB
- Vitest

## Scripts

```bash
npm run dev
npm run build
npm run lint
npm test
```

## Ambiente Local

Crie um `.env` local com:

```bash
DATABASE_URL="file:./databases/global.db"
AUTH_SECRET="troque-esta-chave-localmente"
AUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_BASE_URL="http://localhost:3000"
AUTH_TRUST_HOST="true"
```

Os bancos SQLite locais ficam em `prisma/databases/` e sao ignorados pelo Git.

Para preparar o banco global e popular dados locais:

```bash
npx prisma db push --skip-generate
npx tsx prisma/seed-complete.ts
```

Credenciais locais criadas pelo seed:

```text
Igreja: igreja-teste
Email: admin@teste.com
Senha: 123456
```

O acesso administrativo da plataforma usa uma tela separada em `/admin/login`.
O administrador global local padrão também usa `admin@teste.com` e `123456`, mas é
armazenado na tabela `PlatformAdmin` do banco global, separado do usuário da igreja.
Para recriá-lo:

```bash
DATABASE_URL="file:$(pwd)/prisma/databases/global.db" npm run db:seed:platform-admin
```

## Organizacao

- `src/app`: rotas App Router e APIs.
- `src/components/ui`: primitives reutilizaveis de UI.
- `src/components/layout`: estrutura global da aplicacao.
- `src/components/providers`: providers globais.
- `src/features`: modulos de dominio.
- `src/lib`: infraestrutura, banco, permissoes e utilitarios.
- `src/test`: testes automatizados.
- `prisma`: schema, migrations e seeds.
- `docs`: documentacao viva do projeto.

## Documentacao

- [Overview](docs/overview.md)
- [Arquitetura](docs/architecture.md)
- [Design system](docs/design-system.md)
- [Roadmap](docs/roadmap.md)
- [Operacoes](docs/operations.md)
- [Ranking dos jogos](docs/game-ranking-plan.md)

## Estado Conhecido

Antes da proxima rodada de organizacao/refatoracao:

- `npx tsc --noEmit` passa.
- `npm run lint` passa com warnings.
- `npm test` falha nos testes de sync por mocks incompletos para chamadas raw do Prisma.
- `npm run build` ainda falha em webpack sem diagnostico detalhado no output atual.

## Referencia Legada

O projeto Vite/React em `../old/church-hub` deve ser usado apenas como referencia visual e funcional durante a organizacao do app Next.js.
