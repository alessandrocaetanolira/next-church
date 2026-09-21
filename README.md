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

## Requisitos

- Node.js 20 ou superior
- npm
- SQLite (o Prisma usa os arquivos SQLite locais; não é necessário instalar um servidor de banco)

## Scripts

```bash
npm run dev
npm run build
npm run lint
npm test
npm run prisma:generate
npm run db:global:migrate:deploy
npm run db:tenant:migrate:all
npm run db:seed:platform-admin
npm run db:backup
```

## Ambiente local

Crie `.env.local` na raiz deste projeto (`church-hub-next/.env.local`). Não coloque o
arquivo dentro de `src/app`, pois o Next.js carrega as variáveis a partir da raiz.

Configuração mínima:

```bash
DATABASE_URL="file:./prisma/databases/global.db"
CHURCH_DATABASE_DIR="./prisma/databases"
AUTH_SECRET="gere-uma-chave-local-forte"
AUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_BASE_URL="http://localhost:3000"
AUTH_TRUST_HOST="true"
```

`DATABASE_URL` aponta para o banco global. `CHURCH_DATABASE_DIR` define onde ficam os
bancos físicos dos tenants; os caminhos relativos são resolvidos a partir da raiz do
projeto. Em produção, prefira caminhos absolutos em volume persistente.

Os arquivos SQLite locais ficam em `prisma/databases/` e são ignorados pelo Git.

### Instalação limpa

Na raiz do projeto:

```bash
npm install
npm run prisma:generate
npm run db:global:migrate:deploy
npx tsx prisma/provision.ts
npm run db:seed:platform-admin
```

O `provision.ts` cria a igreja `igreja-teste`, aplica o schema do tenant e cria o
usuário inicial da igreja. O seed de administrador global é executado separadamente
porque esse usuário pertence ao banco global.

Se os bancos dos tenants já existirem e apenas as migrations precisarem ser aplicadas:

```bash
npm run db:tenant:migrate:all
```

`prisma/seed-complete.ts` é um seed legado e não deve ser usado como fluxo principal
de instalação do app atual. Para criar usuários de teste adicionais, use os fixtures
documentados em [Operações](docs/operations.md).

### Acessos locais

Login da igreja em `/auth/login`:

```text
Igreja: igreja-teste
Email: admin@teste.com
Senha: 123456
```

Login do administrador global em `/admin/login`:

```text
Email: admin@teste.com
Senha: 123456
```

São contas distintas, mesmo usando o mesmo e-mail e senha por padrão: a primeira
fica no banco do tenant e a segunda na tabela `PlatformAdmin` do banco global.
O administrador global acessa as rotas `/admin/*`; ele não entra automaticamente
no contexto de dados da igreja.

Para recriar ou alterar o administrador global por variáveis de ambiente:

```bash
PLATFORM_ADMIN_EMAIL="admin@teste.com" \
PLATFORM_ADMIN_PASSWORD="123456" \
npm run db:seed:platform-admin
```

### Fixtures de permissões

Depois de provisionar os bancos `igreja-teste`, `ig2` e `ig3`, é possível criar os
usuários de teste por perfil:

```bash
npm run db:seed:permission-fixtures
```

As contas e senhas estão no arquivo `prisma/scripts/seed-permission-fixtures.ts`.
Esse seed é opcional e serve para validar permissões; não é necessário para iniciar
o app com o administrador padrão.

### Executar

```bash
npm run dev
```

Abra `http://localhost:3000/auth/login` para usuários da igreja ou
`http://localhost:3000/admin/login` para o administrador global.

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
- [TODO de arquitetura em camadas](docs/layered-architecture-todo.md)
- [TODO de separação de tenants](docs/tenant-separation-todo.md)
- [Ranking dos jogos](docs/game-ranking-plan.md)

## Estado atual da validação

As validações devem ser executadas na raiz do projeto:

- `npx tsc --noEmit` passa.
- `npm run lint` passa.
- `npm test` ainda não está totalmente verde: na última execução houve 26 arquivos
  aprovados e 4 com falha, totalizando 87 testes aprovados, 1 teste falho e 8
  ignorados. O teste da API Bíblia retornou 500 e três arquivos de integração
  falharam ao iniciar processos com `spawnSync /bin/sh EPERM` neste ambiente.
- `npm run build` deve ser executado antes de deploy e ainda precisa ser revalidado
  quando houver mudanças em módulos, Prisma ou configuração do Next.

O projeto está em refatoração incremental. O estado detalhado do trabalho pendente
fica em [docs/layered-architecture-todo.md](docs/layered-architecture-todo.md).

## Referencia Legada

O projeto Vite/React em `../old/church-hub` deve ser usado apenas como referencia visual e funcional durante a organizacao do app Next.js.
