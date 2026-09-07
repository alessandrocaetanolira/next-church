# Operations

## Ambiente Local

Os bancos SQLite locais ficam em `prisma/databases/` e sao ignorados pelo Git.

Fluxo local:

```bash
npm run prisma:generate
npm run db:global:migrate:deploy
DATABASE_URL="file:/caminho/absoluto/church_<databaseKey>.db" npm run db:tenant:migrate:deploy
```

`migrate dev` fica reservado para criar migrations em bancos de referencia. `db push` nao deve atualizar bancos reais.

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
- diretorios de dados devem ser persistentes.
