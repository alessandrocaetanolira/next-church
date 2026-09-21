# Architecture

## Camadas

- `src/app`: rotas App Router, pages e route handlers.
- `src/components/ui`: primitives genericos de UI baseados em shadcn/Radix.
- `src/components/layout`: shell global, sidebar, header e bottom navigation.
- `src/components/providers`: providers globais de auth, PWA, settings e notificacoes.
- `src/components`: componentes compartilhados da aplicacao.
- `src/features/<module>`: componentes, hooks, stores e servicos por dominio.
- `src/lib`: infraestrutura compartilhada, banco, permissoes, notificacoes e utilitarios.
- `src/test`: testes automatizados.
- `prisma`: schema, migrations e seeds.

## Regra Para UI

Componentes de interface devem ser reutilizados por padrao:

- Use `src/components/ui` para primitives: `Button`, `Card`, `Input`, `Select`, `Dialog`, `Drawer`, `Sheet`, `Badge`, `Table`, `Tabs`, `Switch`.
- Crie componentes compostos em `src/components/common` quando um padrao se repetir entre modulos.
- Crie componentes especificos em `src/features/<module>/components` quando o componente depender do dominio.
- Evite HTML cru para controles comuns em telas de aplicacao: prefira `Button`, `Input`, `Textarea`, `Select`, `Table` e componentes derivados.

## Multi-Tenancy

O app deve usar um banco global e bancos por igreja, com separacao fisica e conceitual:

- `global.db`: cadastro de igrejas, status, plano, branding e dados administrativos da plataforma.
- `church_<databaseKey>.db`: usuarios da igreja e todos os dados operacionais da igreja.

O login da igreja recebe `churchSlug`, valida a igreja ativa e provisionada no banco global, resolve o `databaseKey`, monta o datasource do tenant e autentica o usuario dentro do banco da propria igreja. O `tenantId` entra na sessao e as APIs usam uma referencia validada para escolher o banco correto. Esse fluxo fica em `/auth/login`.

O administrador global usa um fluxo separado em `/admin/login`. Ele é autenticado pela tabela `PlatformAdmin` do banco global e acessa somente as rotas `/admin/*`; não deve ser tratado como um `User` de tenant.

Regra de separacao:

- Modelos globais nao devem existir no schema do tenant.
- Modelos de tenant nao devem existir no schema global.
- O `databaseKey` e imutavel; alterar o slug nao pode mover ou recriar o banco fisico.
- Usuarios comuns, administradores de igreja, pastores, lideres e membros autenticaveis pertencem ao tenant.
- O email deve ser unico apenas dentro do banco da igreja, nao globalmente.
- Um super admin da plataforma é modelado separadamente no banco global, na tabela `PlatformAdmin`, sem reutilizar `User` de tenant.
- Nenhuma requisicao comum cria banco ou executa DDL; migrations sao operacao controlada.

Estrutura Prisma alvo:

```txt
prisma/
  global/
    schema.prisma
    migrations/
    seed.ts
  tenant/
    schema.prisma
    migrations/
    seed.ts
  databases/
    global.db
    church_<databaseKey>.db
```

Clientes Prisma alvo:

- `src/generated/prisma-global`: client para `global.db`.
- `src/generated/prisma-tenant`: client para bancos `church_<slug>.db`.

## Autorizacao

O middleware protege rotas de pagina e redireciona acessos sem sessao. As APIs tambem precisam validar sessao e permissao internamente, pois o middleware libera rotas `/api`.

Perfis principais:

- `ADMIN`: acesso amplo.
- `PASTOR`: gestao ministerial e areas administrativas relevantes.
- `LEADER`: acesso por permissoes e, quando aplicavel, por escopo de grupo.
- `MEMBER`: area pessoal, feed, Biblia, quiz, jogos e grupos.

## Offline

Dexie armazena dados locais e uma fila de sincronizacao. A estrategia atual e incremental:

- Pull: buscar registros alterados depois de `lastSync`.
- Push: enviar outbox local para APIs do tenant.
- Soft delete: usar `deletedAt`.
- Estoque e vendas devem ser tratados com cuidado para evitar sobrescrita indevida.

## Tempo Real

SSE e usado para eventos com o app aberto. O broker fica em `src/lib/server/sse-broker.ts` e o endpoint principal e `/api/events`.

Web Push ainda deve ser tratado como evolucao futura, nao como funcionalidade plenamente consolidada.
