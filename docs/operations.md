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

## Rate limit de login e cadastro público

O limiter protege somente as tentativas de credenciais do Auth.js e o POST público
de cadastro. Sessões válidas, atualização de sessão, logout, SSE, Push, sync,
branding, assets e navegação não consomem essas quotas.

Os contadores ficam em `auth-security.db`, no mesmo diretório configurado por
`CHURCH_DATABASE_DIR` (padrão: `prisma/databases`). Esse arquivo é independente dos
bancos global, de igrejas e da Bíblia; sua tabela técnica é inicializada na primeira
tentativa protegida. O processo precisa de permissão de escrita nesse diretório.
Não remover o arquivo como procedimento de restart: isso apagaria quotas ativas.
Todos os processos precisam apontar para o mesmo arquivo persistente, em filesystem
local compatível com locking SQLite. A implementação não compartilha contadores
entre hosts com discos independentes; essa topologia exige outro store antes do deploy.

O limiter usa `AUTH_SECRET` ou `NEXTAUTH_SECRET` para derivar chaves HMAC. Não
armazena senhas ou e-mails em texto nas chaves. Falha do store retorna 503 no
login/cadastro e não libera tentativas ilimitadas; outras rotas não dependem dele.

| Variável opcional | Padrão | Janela |
| --- | --- | --- |
| `AUTH_LOGIN_ACCOUNT_LIMIT` | 5 | 15 minutos por conta e igreja/global |
| `AUTH_LOGIN_IP_LIMIT` | 60 | 5 minutos, agregado entre contextos de login |
| `AUTH_REGISTER_ACCOUNT_LIMIT` | 3 | 1 hora por e-mail e igreja |
| `AUTH_REGISTER_IP_LIMIT` | 5 | 15 minutos, agregado entre igrejas |

Para distinguir IPs reais, definir `AUTH_RATE_LIMIT_IP_HEADER` como
`cf-connecting-ip`, `x-real-ip` ou `x-forwarded-for` **somente se o proxy conhecido
sobrescrever o header e impedir acesso direto que permita falsificá-lo**. Em
`x-forwarded-for`, definir também `AUTH_RATE_LIMIT_PROXY_HOPS` com o número de
endereços confiáveis a contar da direita. Validar a cadeia real antes de configurar.
Sem header confiável, ou com valor ausente/inválido, as requisições compartilham
um bucket de origem não verificada. Isso impede bypass por header arbitrário,
mas pode bloquear usuários legítimos juntos. Validar configuração de proxy, volume
em Wi-Fi compartilhado e limites antes de publicar; não presumir IP individual.

Excesso retorna 429 com `Retry-After`. A janela não se estende por novas recusas;
logout, login bem-sucedido ou restart não zeram o contador. Corpo de tentativa
pública é limitado a 16 KiB; cadastro exige JSON (charset é aceito), e o callback
de credenciais preserva o form-urlencoded usado pelo Auth.js.

Roteiro completo, lacunas restantes e aceites de produção:
[public-auth-security-todo.md](./public-auth-security-todo.md).

### Cloudflare Tunnel em produção

Ambiente confirmado pelo usuário: Cloudflare Tunnel com serviço de origem local.
Quando `cloudflared` e Next.js executam no mesmo host/namespace de rede:

```bash
npm run build
npm run start:tunnel
```

O script `start:tunnel` define `AUTH_RATE_LIMIT_IP_HEADER=cf-connecting-ip` no
processo e inicia Next.js somente em `127.0.0.1:3001`. Não precisa alterar `.env`
para selecionar o header. `npm run dev` e `npm run start` mantêm seus comandos
existentes para outros cenários.

No serviço publicado pelo túnel, usar `http://127.0.0.1:3001`. O hostname público
continua HTTPS. Não abrir/redirecionar a porta 3001 no roteador/firewall nem expor
outro proxy público que aceite esse header arbitrário. Se o conector estiver em
outro container/host, não presumir que seu loopback aponta para o app: primeiro
definir a rede privada e a restrição de acesso da origem.

O [CF-Connecting-IP](https://developers.cloudflare.com/fundamentals/reference/http-headers/)
fornecido pela Cloudflare identifica o visitante. Nesse modo, o limiter ignora
`X-Forwarded-For`, não exige `AUTH_RATE_LIMIT_PROXY_HOPS`, mantém quotas distintas
por IP e preserva o limite por conta ao trocar de IP. Header ausente/inválido usa
quota agregada; nunca confiar automaticamente em outro header enviado pelo cliente.

Antes de publicar, confirmar no ambiente real que o header chega ao Next.js e
validar tráfego de usuários no mesmo Wi-Fi. Testes com headers simulados e build
local não comprovam a configuração remota do Tunnel. Não registrar IPs/e-mails
em texto ou tokens para fazer essa conferência.

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
- `consumerType` identifica a venda como `MEMBER`, `VISITOR` ou `UNIDENTIFIED`;
  somente `MEMBER` pode usar fiado.

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
`igreja-teste`; comandos de migration usam essa chave física. O login da igreja
usa `/auth/login?igreja=amesachurch`; `/auth/login` sem igreja válida exibe a UI
404 sem formulário. O smoke local identificou HTTP 200 nessa resposta em streaming;
o status HTTP é uma pendência separada registrada no plano de segurança.
O administrador global usa `/admin/login` e segue para `/admin/tenants`, sem
depender do slug de uma igreja. Ele não é um usuário de tenant.

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
