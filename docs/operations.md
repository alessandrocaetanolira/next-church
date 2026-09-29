# Operations

## Ambiente Local

Os bancos SQLite locais ficam em `prisma/databases/` e são ignorados pelo Git. Crie
`.env.local` na raiz do projeto, com pelo menos:

```bash
DATABASE_URL="file:../databases/global.db"
CHURCH_DATABASE_DIR="./prisma/databases"
AUTH_SECRET="gere-uma-chave-local-forte"
AUTH_TRUST_HOST="true"

# AUTH_URL/NEXTAUTH_URL e NEXT_PUBLIC_APP_BASE_URL são opcionais.
# Quando definidos, use a origem pública do deploy, sem localhost.
```

`DATABASE_URL` é relativo ao arquivo `prisma/global/schema.prisma`; portanto,
`file:../databases/global.db` aponta para `prisma/databases/global.db`.

### Logs de autenticação e Push

Os eventos de autenticação e Web Push são enviados ao terminal com timestamp e
também gravados em arquivos diários no diretório `logs/`:

```text
logs/2026-09-29.log
```

O diretório pode ser alterado com `LOG_DIR`. Os arquivos são ignorados pelo Git e
não devem conter segredos, tokens ou chaves privadas.

### Ordem obrigatória — ambiente novo

Use preferencialmente o comando único:

```bash
npm run db:setup:initial
```

Ele coordena todas as etapas e é idempotente para o tenant de desenvolvimento.
Para diagnóstico manual, a ordem é:

Execute nesta ordem:

```bash
npm install
npm run prisma:generate
npm run db:global:migrate:deploy
npm run db:seed:platform-admin
npx tsx prisma/provision.ts
```

O `provision.ts` deve ser executado depois do banco global e do administrador
estrutural. Ele registra o tenant, aplica as migrations do tenant e cria o usuário
administrador da igreja. O setup inicial executa depois `db:tenant:migrate:all` para
alinhar tenants existentes; esse orquestrador cria backup antes de cada migration.

Se o `bible.db` ainda não existir, inicialize-o separadamente, antes de iniciar o app:

```bash
npm run db:bible:migrate:deploy
npm run db:import:bible
```

Se o `bible.db` já existir e estiver íntegro, não remova nem reimporte os dados.

O provisionamento cria `igreja-teste` e o arquivo `church_igreja-teste.db`. Para um
tenant já existente, aplique a migration diretamente informando seu arquivo:

```bash
DATABASE_URL="file:/caminho/absoluto/prisma/databases/church_<databaseKey>.db" \
npm run db:tenant:migrate:deploy
```

`migrate dev` fica reservado para criar migrations em bancos de referencia. `db push` nao deve atualizar bancos reais.

Para impedir que uma migration de tenant use acidentalmente o banco global, o comando
exige uma URL explícita para um banco de referência separado:

```bash
TENANT_MIGRATION_URL="file:/caminho/absoluto/church_reference.db" \
  npm run db:tenant:migrate:dev
```

Migrations de todos os tenants devem usar o orquestrador, que resolve cada arquivo pelo `databaseKey`, faz preflight e cria backup antes da alteracao:

```bash
npm run db:tenant:migrate:all -- --dry-run
npm run db:tenant:migrate:all
npm run db:tenant:migrate:all -- --tenant ig2 --backup-dir /tmp/church-hub-migration-backup
```

Use `--output /caminho/relatorio.json` para persistir o relatorio. Uma falha em um tenant nao interrompe os demais, mas encerra o comando com codigo diferente de zero.

## Sincronização offline da Cantina

Pedidos criados ou operados sem conexão são persistidos no Dexie do dispositivo:

- `sales` mantém a representação local do pedido e o estado `_status: pending`;
- `syncOutbox` registra a operação `sales/create` ou `sales/update`;
- mudanças de status usam as ações `approve`, `reject`, `status` e `archive`;
- arquivamento é apenas uma marcação local (`deletedAt`) até a confirmação do servidor;
- ao voltar a conexão, o sincronizador envia as mudanças para `/api/sync/push`;
- o servidor aplica a política de operação da Cantina, valida `updatedAt` e rejeita
  alterações obsoletas como conflito;
- `idempotencyKey` impede que um retry reaplique uma operação já confirmada.

Em caso de falha, o pedido permanece pendente para retry manual ou automático. Não
remova registros pendentes diretamente do IndexedDB; primeiro confirme a operação no
servidor ou resolva o conflito pelo indicador de sincronização.

Seed local principal (slug público atual):

```text
Igreja: amesachurch
Email: admin@igreja-teste.com
Senha: 123456
```

O usuário acima é do tenant `amesachurch`, cujo `databaseKey` físico é
`igreja-teste`; comandos de migration usam essa chave física. Na mesma tela `/auth/login`, deixe o
campo de slug vazio para autenticar o administrador global; nesse caso o sistema
redireciona para `/admin/tenants`. O administrador global não é um usuário de tenant.

## Bíblia completa

Os JSONs AA, ACF e NVI ficam em `prisma/bible-source`. O conteúdo é importado no
`bible.db` compartilhado por todos os tenants:

```bash
npm run db:bible:migrate:deploy
npm run db:import:bible
```

Para outra fonte compatível, use `BIBLE_SOURCE_DIR=/caminho/dos/json`. O importador
é idempotente para uma versão já completa e substitui somente a versão incompleta
correspondente. Verifique licenças e direitos de uso das traduções antes de distribuir
o conteúdo comercialmente.

Para criar usuários de teste de todos os perfis nos tenants que já existem:

```bash
npm run db:seed:permission-fixtures
```

O script informa as contas no próprio arquivo `prisma/scripts/seed-permission-fixtures.ts`.

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
