# TODO — Separação Route/Controller/Service/Repository

Objetivo: retirar regras de negócio e acesso direto ao Prisma das route handlers, mantendo isolamento entre banco global e bancos de tenant.

## Arquitetura alvo

```text
src/app/api/<modulo>/route.ts
  -> controllers/<modulo>.controller.ts
    -> services/<modulo>.service.ts
      -> policies/<modulo>.policy.ts
      -> repositories/tenant/<modulo>.repository.ts
        -> Prisma tenant
```

Para operações da plataforma:

```text
src/app/api/admin/<modulo>/route.ts
  -> controllers/admin/<modulo>.controller.ts
    -> services/admin/<modulo>.service.ts
      -> repositories/global/<modulo>.repository.ts
        -> Prisma global
```

## Regras de dependência

- [ ] Route handler não acessa Prisma diretamente.
- [ ] Controller não contém regra de negócio nem SQL.
- [ ] Service não conhece `NextRequest` ou `NextResponse`.
- [ ] Repository não decide permissões nem regras de perfil.
- [ ] Policy concentra autorização, plano e escopo de tenant/equipe.
- [ ] Schemas validam payloads antes da chamada ao service.
- [ ] Transações ficam no service ou em métodos transacionais do repository.
- [ ] Repositories tenant recebem contexto de tenant já resolvido.
- [ ] Repositories globais nunca recebem dados vindos diretamente de uma rota tenant.
- [ ] Erros de domínio são convertidos em status HTTP somente no controller.

## Componentes compartilhados

- [x] Criar `src/lib/http/errors.ts` com erros de domínio e mapeamento HTTP.
- [x] Criar `src/lib/http/response.ts` para respostas padronizadas.
- [ ] Criar `src/lib/validation/` para schemas e mensagens de validação.
- [x] Criar `src/lib/contexts/tenant-context.ts`.
- [x] Criar `src/lib/contexts/platform-context.ts`.
- [ ] Padronizar `requireSession`, `requireTenant` e `requirePlatformAdmin`.
- [ ] Padronizar logs com `tenantId`, `userId`, módulo e ação.

## Ordem de migração por domínio

### Revisão inicial — 19/09/2026

- [x] Confirmado que ainda não existem camadas formais de controller/repository no código da aplicação.
- [x] Identificados 57 route handlers; os maiores candidatos à extração são Cantina, Sync, Feed, Grupos e Membros.
- [x] Confirmado que o isolamento de tenant já é resolvido por `tenantId/databaseKey` na autenticação e no `prisma-factory`.
- [x] Definido Membros como primeiro vertical slice, por concentrar cadastro, conta de acesso e permissões.
- [ ] Não iniciar a migração por `sync`, pois ela depende de vários domínios e ampliaria o raio da mudança.

### 1. Membros

- [x] `MembersRepository` para leitura, criação, edição e soft delete (collection/detail migrados; acesso ainda pendente).
- [x] `MembersPolicy` para view/create/update/delete (approve/manage_access ainda pendentes).
- [x] `MembersService` para cadastro, edição e soft delete (aprovação e acesso ainda pendentes).
- [x] `MembersController` para rotas collection e detail.
- [x] Migrar `/api/members/[id]/access` para controller/service/repository.
- [x] Validar perfil, permissões e senha no service antes de persistir o acesso.
- [ ] Migrar testes atuais para controller/service.

### 2. Materiais

- [x] `MaterialsRepository`.
- [x] `MaterialsPolicy`, incluindo `materials:manage`.
- [x] `MaterialsService` para estoque, criação, edição e exclusão.
- [x] Migrar `/api/materials`.
- [x] Adicionar testes unitários do service/policy.
- [ ] Validar escopo por equipe quando aplicável.

### 3. Cantina

- [x] `CanteenProductsRepository`.
- [x] `CanteenProductsPolicy` para catálogo e gerenciamento de produtos.
- [x] `CanteenProductsService` para validação, upload local, criação, edição e exclusão.
- [x] `CanteenProductsController` e migração das rotas de produtos.
- [x] Extrair operação abrir/fechar cantina para repository/policy/service/controller.
- [x] `CanteenSalesRepository` para consulta e criação transacional de vendas.
- [x] `CanteenSalesPolicy` e `CanteenSalesService` para catálogo de vendas, pedidos, estoque e fiado.
- [x] Migrar `GET/POST /api/canteen/sales`.
- [x] Migrar consulta de ledger e registro de pagamentos do fiado.
- [x] Migrar aprovação, preparo e cancelamento em `/api/canteen/sales/:id`.
- [x] Centralizar notificações de atualização do pedido no service.
- [x] Adicionar testes de regras transacionais de pedidos, estoque, cantina fechada, fiado e pagamentos.
- [x] Adicionar testes de integração SQLite para baixa de estoque, fiado e rollback transacional.
- [ ] `CanteenPolicy` com `view`, `sell`, `operate` e `manage_products`.
- [ ] `CanteenService` para estoque, venda, pedidos e pagamentos.
- [ ] Definir estado operacional de cantina aberta/fechada.
- [ ] Migrar produtos, PDV, pedidos, preparo, vendas e ledger.

### 4. Grupos, equipes e tarefas

- [x] `GroupsRepository` para listagem e criação.
- [x] `GroupsPolicy` para consulta e criação.
- [x] `GroupsService` e `GroupsController` para `GET/POST /api/groups`.
- [x] Adicionar testes unitários de Policy/Service para listagem e criação.
- [x] Migrar detalhe, edição, exclusão e escopo de líder de grupos.
- [x] `TeamsRepository` para listagem e criação.
- [x] `TeamsPolicy`, `TeamsService` e `TeamsController` para `GET/POST /api/teams`.
- [x] Migrar edição e exclusão de equipes com escopo de líder.
- [ ] `GroupsPolicy` com escopo de líder completo.
- [x] `TasksRepository`, `TasksPolicy`, `TasksService` e `TasksController` para `GET/POST /api/schedules/tasks`.
- [x] Eliminar a route duplicada `/schedules/tasks`, reutilizando o mesmo controller de leitura.
- [x] Migrar criação, atualização e exclusão offline das tarefas pelo `sync/push`.
- [x] Adicionar testes unitários de Policy/Service para sincronização de tarefas.
- [x] Aplicar escopo de equipe na leitura e nas mutações de tarefas, inclusive no `sync/push`.
- [x] Centralizar solicitações, listagem e aprovação de ingresso em repository/policy/service/controller.
- [x] Adicionar teste de escopo para impedir aprovação de solicitação fora da equipe do líder.
- [x] Migrar os domínios atualmente suportados pela sincronização offline (`sales`, `memberCredits`, `products` e `tasks`) para services transacionais.
- [x] Migrar o branch offline de `products` para `CanteenProductsService` e `CanteenProductsController`.
- [x] Migrar o branch offline de `memberCredits` para repository/policy/service/controller transacionais.
- [x] Adicionar testes unitários do fluxo de créditos sincronizados.
- [x] Migrar o branch offline de `sales` para `CanteenSalesService`, preservando estoque, fiado e notificações.

### 5. Feed e comunicação

- [x] `FeedRepository` para leitura e publicação.
- [x] `FeedPolicy` com `publish`, `share` e `moderate` na criação.
- [x] `FeedService` para listagem, publicação e notificações.
- [x] Garantir que publicação em nome de grupo valide escopo do usuário.
- [x] Extrair comentários, curtidas e exclusão da rota de detalhe.
- [x] Centralizar as permissões de `comment` e `delete` do Feed.

### 6. Módulos restantes

- [ ] Pastoral.
- [ ] Infantil.
- [ ] Estacionamento.
- [ ] Bíblia e jogos.
- [ ] Notificações e engajamento.
- [ ] Branding e configurações.
- [ ] Rotas administrativas globais de tenants e planos.

## Migração segura

- [ ] Migrar um domínio por vez sem alterar o contrato HTTP.
- [ ] Manter adapters temporários para chamadas antigas.
- [ ] Não misturar refatoração arquitetural com alteração de schema sem necessidade.
- [ ] Remover duplicação apenas depois dos testes do domínio passarem.
- [ ] Remover Prisma/raw SQL das routes ao final de cada domínio.
- [ ] Registrar decisões incompatíveis com a arquitetura anterior.

## Testes e aceite

- [ ] Testes unitários de cada policy.
- [ ] Testes unitários de cada service com repositories mockados.
- [ ] Testes de repository contra SQLite temporário.
- [ ] Testes de controller para 401, 403, 404, 409 e 422.
- [ ] Testes de isolamento entre três tenants.
- [ ] Testes de plano sem recurso.
- [ ] Testes de líder limitado ao próprio grupo/equipe.
- [ ] Testes de transação para venda e baixa de estoque.
- [ ] Testes de sincronização offline usando services.
- [ ] Critério final: nenhuma regra de negócio nova deve ser implementada diretamente em uma route.

## Primeiro incremento recomendado

1. Criar erros, contexto tenant e contrato de resposta.
2. Migrar `members` como primeiro vertical slice.
3. Comparar respostas antes/depois.
4. Repetir o padrão em `materials` e `canteen`.
