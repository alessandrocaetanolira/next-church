# Operations

## Ambiente Local

Os bancos SQLite locais ficam em `prisma/databases/` e sao ignorados pelo Git.

Fluxo local:

```bash
npx prisma db push --skip-generate
npx tsx prisma/seed-complete.ts
```

Seed local principal:

```text
Igreja: igreja-teste
Email: admin@teste.com
Senha: 123456
```

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

## Deploy

Antes de deploy:

- `npm run build` deve passar.
- migrations precisam estar aplicadas ao banco global e aos bancos de tenant.
- `AUTH_SECRET` deve ser forte e definido no ambiente.
- `DATABASE_URL` deve apontar para o banco global.
- diretorios de dados devem ser persistentes.
