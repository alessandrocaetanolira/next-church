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
npm run db:setup:initial
```

## Ambiente local

Crie `.env.local` na raiz deste projeto (`church-hub-next/.env.local`). Não coloque o
arquivo dentro de `src/app`, pois o Next.js carrega as variáveis a partir da raiz.

Configuração mínima:

```bash
DATABASE_URL="file:../databases/global.db"
BIBLE_DATABASE_URL="file:../databases/bible.db"
CHURCH_DATABASE_DIR="./prisma/databases"
AUTH_SECRET="gere-uma-chave-local-forte"
AUTH_URL="http://localhost:3000"

# Em produção, use a origem pública do deploy, sem barra final:
# AUTH_URL="https://church.bennipersonalizados.com.br"
# NEXTAUTH_URL="https://church.bennipersonalizados.com.br"
NEXT_PUBLIC_APP_BASE_URL="http://localhost:3000"
AUTH_TRUST_HOST="true"

# Web Push (opcional; gere um par VAPID para habilitar notificações com o app fechado)
# VAPID_SUBJECT="mailto:admin@church.local"
# VAPID_PUBLIC_KEY="..."
# VAPID_PRIVATE_KEY="..."
# WEB_PUSH_TTL_SECONDS="86400"
# WEB_PUSH_TIMEOUT_MS="10000"
```

`DATABASE_URL` aponta para o banco global e `BIBLE_DATABASE_URL` para o banco bíblico
compartilhado; ambos são resolvidos a partir de seus schemas Prisma e, por isso,
localmente usam `file:../databases/<nome>.db`.
`CHURCH_DATABASE_DIR` define onde ficam os bancos físicos dos tenants; seus caminhos
relativos são resolvidos a partir da raiz do projeto. Em produção, prefira caminhos
absolutos em volume persistente.

Os bancos de tenant e o global são locais e ignorados pelo Git. O `bible.db` é uma
exceção versionada, pois contém o catálogo bíblico compartilhado da aplicação.

### Instalação limpa — comando inicial

Use o comando único para preparar o ambiente na ordem correta:

```bash
npm run db:setup:initial
```

Ele executa geração dos clients, migration global, planos, administrador global,
migration/importação da Bíblia e provisionamento do tenant de desenvolvimento. Se o
tenant já existir, o provisionamento é ignorado; a Bíblia existente é preservada.

Execução manual equivalente, apenas para diagnóstico:

Na raiz do projeto:

```bash
npm install
npm run prisma:generate
npm run db:global:migrate:deploy
npm run db:seed:platform-admin
npx tsx prisma/provision.ts
```

O `provision.ts` cria a igreja `igreja-teste`, aplica as migrations do tenant e cria o
usuário inicial da igreja. O seed de administrador global vem antes porque esse usuário
pertence ao banco global. Não rode `db:tenant:migrate:all` nessa instalação inicial.

Se os bancos dos tenants já existirem e apenas as migrations precisarem ser aplicadas:

```bash
npm run db:tenant:migrate:all
```

Para criar uma migration de tenant, use um banco SQLite de referência separado do
`global.db` e informe-o explicitamente:

```bash
TENANT_MIGRATION_URL="file:/caminho/absoluto/church_reference.db" \
  npm run db:tenant:migrate:dev
```

Para criar usuários de teste adicionais, use os fixtures documentados em
[Operações](docs/operations.md).

### Bíblia completa

Os JSONs AA, ACF e NVI usados pelo importador ficam em `prisma/bible-source`. O texto
bíblico é importado uma vez para `prisma/databases/bible.db` e compartilhado por todas
as igrejas:

```bash
npm run db:bible:migrate:deploy
npm run db:import:bible
```

Caso precise utilizar outra fonte, informe `BIBLE_SOURCE_DIR` com o caminho do diretório
que contém `aa.json`, `acf.json` e `nvi.json`. As fontes incluídas possuem licença
CC BY-NC; confirme os direitos das traduções antes de qualquer uso comercial.

### Acessos locais

Login da igreja em `/auth/login`:

````text
Igreja: igreja-teste
Email: admin@igreja-teste.com
Senha: 123456

Se o usuário existir no tenant, mas a senha do ambiente estiver divergente, atualize
somente a credencial com:

```bash
npm run db:tenant:reset-password -- --tenant igreja-teste --email admin@igreja-teste.com --password 123456
````

````

Na tela `/auth/login`, deixe o slug da igreja vazio para entrar como administrador global:

```text
Email: admin@church.local
Senha: admin@church
````

São contas distintas e ficam em bancos diferentes: a primeira fica no banco do tenant
e a segunda na tabela `PlatformAdmin` do banco global.
O administrador global acessa as rotas `/admin/*`; ele não entra automaticamente
no contexto de dados da igreja.

Para recriar ou alterar o administrador global por variáveis de ambiente:

```bash
PLATFORM_ADMIN_EMAIL="admin@church.local" \
PLATFORM_ADMIN_PASSWORD="admin@church" \
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
- [TODO principal](docs/TODO.md)
- [Roadmap](docs/roadmap.md)
- [Operacoes](docs/operations.md)
- [TODO de arquitetura em camadas](docs/layered-architecture-todo.md)
- [TODO de separação de tenants](docs/tenant-separation-todo.md)
- [TODO da Bíblia offline](docs/bible-offline-todo.md)
- [TODO do offline-first](docs/offline-first-todo.md)
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

O projeto está em refatoração incremental. A ordem de execução fica em
[docs/TODO.md](docs/TODO.md); os documentos de domínio mantêm o detalhamento técnico.

## Referencia Legada

O projeto Vite/React em `../old/church-hub` deve ser usado apenas como referencia visual e funcional durante a organizacao do app Next.js.
