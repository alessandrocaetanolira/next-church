# Church Hub Next

Aplicativo Next.js para gestao de igrejas, com autenticacao, multi-tenancy, modulos administrativos, cantina, membros, grupos, escalas, materiais, notificacoes, leitura biblica, quiz, jogos e suporte offline/PWA.

## Stack

- Next.js 16.3.6 (App Router e Turbopack)
- React 19.2
- TypeScript
- Tailwind CSS
- shadcn/Radix UI
- NextAuth v5 beta
- Prisma 6
- SQLite
- Dexie/IndexedDB
- Vitest
- Serwist para PWA e service worker

## Estado do projeto

As Prioridades 1 (estabilização), 2 (template Web) e 3 (permissões e experiência
de acesso) estão concluídas. O próximo foco é a Prioridade 4: validar e fortalecer
o fluxo offline-first em dispositivos reais, mantendo sessão, cache, sincronização
e branding isolados por tenant e usuário. O acompanhamento detalhado está em
[docs/TODO.md](docs/TODO.md).

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

## Instalação de um ambiente novo

Siga esta ordem em um ambiente obtido por `git clone` ou `git pull`.

### 1. Instalar dependências

```bash
npm install
```

O `postinstall` gera os três clients Prisma. Se necessário, a geração pode ser repetida:

```bash
npm run prisma:generate
```

### 2. Criar o `.env`

Crie o arquivo `.env` na raiz do projeto. Não coloque variáveis de banco dentro de
`src/app`. Os scripts Prisma usam o `.env` da raiz.

Configuração mínima local:

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
exceção versionada, pois contém o catálogo bíblico compartilhado da aplicação. Ele
deve ser preservado: não remova, recrie ou substitua esse arquivo ao resetar o
ambiente local.

### 3. Executar o setup inicial

Execute o único script de inicialização:

```bash
npm run db:setup:initial
```

O script executa, nesta ordem:

1. geração dos clients Prisma;
2. migrations do banco global;
3. seed dos planos;
4. seed do administrador global;
5. migration da Bíblia e importação idempotente de AA, ACF e NVI;
6. provisionamento do tenant `igreja-teste`;
7. seed do branding inicial.

O `bible.db` existente é preservado. A migration e a importação são idempotentes e
não fazem reset do catálogo. O script não deve ser usado para apagar um ambiente em
produção; ele prepara um ambiente novo e ignora o provisionamento se o tenant já
existir.

### Reset local sem apagar a Bíblia

Para recriar somente os bancos global e de tenants em um ambiente de teste, remova
apenas os arquivos abaixo e execute novamente o setup:

```bash
rm -f prisma/databases/global.db prisma/databases/church_*.db
npm run db:setup:initial
```

Não use `rm -rf prisma/databases` nem remova `prisma/databases/bible.db`. O banco da
Bíblia é compartilhado por todos os tenants e deve permanecer preservado.

### 4. Acessar o ambiente inicial

Administrador global, sem informar slug:

```text
Email: admin@church.local
Senha: admin@church
```

Administrador da igreja:

```text
Igreja: igreja-teste
Email: admin@igreja-teste.com
Senha: 123456
```

### 5. Iniciar e validar

```bash
npm run dev
npm run lint
npm test
npm run build
```

Para conferir os bancos e migrations aplicadas:

```bash
npm run db:inventory
```

### Instalação manual — somente diagnóstico

Use a sequência abaixo apenas para investigar uma etapa específica. Não misture essa
sequência com `db:setup:initial` no mesmo ambiente:

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
pertence ao banco global. Não rode `db:tenant:migrate:all` logo depois de provisionar
um tenant novo; esse comando é para atualizar tenants já existentes.

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

```text
Igreja: igreja-teste
Email: admin@igreja-teste.com
Senha: 123456
```

Se o usuário existir no tenant, mas a senha do ambiente estiver divergente, atualize
somente a credencial com:

```bash
npm run db:tenant:reset-password -- --tenant igreja-teste --email admin@igreja-teste.com --password 123456
```

Na tela `/auth/login`, deixe o slug da igreja vazio para entrar como administrador global:

```text
Email: admin@church.local
Senha: admin@church
```

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
usuários de teste por perfil. Esse comando exige que os três bancos já existam:

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
- `src/server`: controllers, services, policies e repositories dos dominios.
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

- `npx tsc --noEmit` concluiu sem erros na última verificação.
- `npx eslint src/app src/components src/features src/server src/lib src/auth.ts`
  concluiu sem erros e sem warnings.
- `npx next build --webpack` concluiu com sucesso, incluindo TypeScript e geração
  das 73 páginas.
- `npm run build` usando Turbopack concluiu com sucesso, incluindo TypeScript,
  geração das 73 páginas e o service worker. A configuração fixa a raiz do
  projeto e mantém uma única configuração PostCSS.
- O build reporta apenas avisos de rastreamento dinâmico nos clientes Prisma;
  eles não impedem a compilação.
- `npm test` concluiu com sucesso fora do sandbox: 36 arquivos e 118 testes
  passaram. O binding opcional do Rolldown foi reinstalado com `npm install
  --include=optional`.
- O escopo de líderes foi aplicado para grupos, materiais e tarefas. `teamIds`
  agora percorre login, JWT, sessão, store e cache offline; administradores e
  pastores mantêm acesso global, incluindo a Cantina.
- As Prioridades 1, 2 e 3 do [TODO principal](docs/TODO.md) estão concluídas; a
  Prioridade 4 é o próximo ciclo de implementação e validação.
- A sessão offline agora usa cache separado por `tenantId + userId`, migra o
  formato legado com segurança e remove o contexto local no logout explícito.
- O sincronismo persiste o cursor em `offlineMetadata` e filtra a fila de saída
  por `tenantSlug + userId` antes do envio.
- As migrations global, Bíblia e tenant foram verificadas; o tenant existente foi
  migrado com backup automático. O `bible.db` foi preservado.
- Antes de deploy, execute novamente TypeScript, lint, testes e build após qualquer
  mudança em módulos, Prisma ou configuração do Next.

O projeto está em refatoração incremental. A ordem de execução fica em
[docs/TODO.md](docs/TODO.md); os documentos de domínio mantêm o detalhamento técnico.

## Referencia Legada

O projeto Vite/React em `../old/church-hub` deve ser usado apenas como referencia visual e funcional durante a organizacao do app Next.js.
