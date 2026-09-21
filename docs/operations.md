# Operations

## Ambiente Local

Os bancos SQLite locais ficam em `prisma/databases/` e são ignorados pelo Git. Crie
`.env.local` na raiz do projeto, com pelo menos:

```bash
DATABASE_URL="file:./prisma/databases/global.db"
CHURCH_DATABASE_DIR="./prisma/databases"
AUTH_SECRET="gere-uma-chave-local-forte"
AUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_BASE_URL="http://localhost:3000"
AUTH_TRUST_HOST="true"
```

Fluxo local:

```bash
npm install
npm run prisma:generate
npm run db:global:migrate:deploy
npx tsx prisma/provision.ts
npm run db:seed:platform-admin
```

O provisionamento cria `igreja-teste` e o arquivo `church_igreja-teste.db`. Para um
tenant já existente, aplique a migration diretamente informando seu arquivo:

```bash
DATABASE_URL="file:/caminho/absoluto/prisma/databases/church_<databaseKey>.db" \
npm run db:tenant:migrate:deploy
```

`migrate dev` fica reservado para criar migrations em bancos de referencia. `db push` nao deve atualizar bancos reais.

Migrations de todos os tenants devem usar o orquestrador, que resolve cada arquivo pelo `databaseKey`, faz preflight e cria backup antes da alteracao:

```bash
npm run db:tenant:migrate:all -- --dry-run
npm run db:tenant:migrate:all
npm run db:tenant:migrate:all -- --tenant ig2 --backup-dir /tmp/church-hub-migration-backup
```

Use `--output /caminho/relatorio.json` para persistir o relatorio. Uma falha em um tenant nao interrompe os demais, mas encerra o comando com codigo diferente de zero.

Seed local principal:

```text
Igreja: igreja-teste
Email: admin@teste.com
Senha: 123456
```

O usuário acima é do tenant `igreja-teste`. O administrador global é uma conta
separada, criada por `npm run db:seed:platform-admin`, e usa `/admin/login`.

Para criar usuários de teste de todos os perfis nos tenants que já existem:

```bash
npm run db:seed:permission-fixtures
```

O script informa as contas no próprio arquivo `prisma/scripts/seed-permission-fixtures.ts`.

Não use `prisma/seed-complete.ts` como seed principal: ele é mantido apenas como
referência legada e não representa o fluxo atual de autenticação.

## Bancos

Em producao, `prisma/databases` precisa ficar em volume persistente. Sem volume, os dados somem em redeploy.

Arquivos `.db` nao devem ser versionados.

## Midia

Regra recomendada:

- armazenar arquivos fora do SQLite;
- gravar no banco apenas URL relativa ou identificador;
- separar por tenant e categoria quando houver storage local ou externo.

Categorias esperadas:

- avatars
- products
- announcements
- branding

## Backups

Para SQLite multi-tenant, definir rotina de backup dos bancos por arquivo:

- backup diario;
- compactacao;
- armazenamento externo;
- teste periodico de restore.

Backup manual local, sempre com destino novo e fora do Git:

```bash
npm run db:backup -- --destination /tmp/church-hub-backup-YYYYMMDD-HHMMSS
```

O comando usa o mecanismo de backup do SQLite para bancos validos, preserva artefatos invalidos para diagnostico e grava um `manifest.json` com tamanho e SHA-256 de origem e destino.

## Deploy

Antes de deploy:

- `npm run build` deve passar.
- migrations precisam estar aplicadas ao banco global e aos bancos de tenant.
- `AUTH_SECRET` deve ser forte e definido no ambiente.
- `DATABASE_URL` deve apontar para o banco global.
- `CHURCH_DATABASE_DIR` deve apontar para o volume persistente dos tenants.
- diretorios de dados devem ser persistentes.
