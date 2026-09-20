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

- [ ] `MembersRepository` para leitura, criação, edição e soft delete.
- [ ] `MembersPolicy` para view/create/update/delete/approve/manage_access.
- [ ] `MembersService` para cadastro, aprovação e acesso do usuário.
- [ ] `MembersController` para rotas collection e detail.
- [ ] Migrar testes atuais para controller/service.

### 2. Materiais

- [ ] `MaterialsRepository`.
- [ ] `MaterialsPolicy`, incluindo `materials:manage`.
- [ ] `MaterialsService` para estoque, criação, edição e exclusão.
- [ ] Migrar `/api/materials`.

### 3. Cantina

- [ ] `CanteenProductsRepository`.
- [ ] `CanteenSalesRepository`.
- [ ] `CanteenPolicy` com `view`, `sell`, `operate` e `manage_products`.
- [ ] `CanteenService` para estoque, venda, pedidos e pagamentos.
- [ ] Definir estado operacional de cantina aberta/fechada.
- [ ] Migrar produtos, PDV, pedidos, preparo, vendas e ledger.

### 4. Grupos, equipes e tarefas

- [ ] `GroupsRepository` e `TeamsRepository`.
- [ ] `GroupsPolicy` com escopo de líder.
- [ ] `TasksRepository` e `TasksService`.
- [ ] Centralizar aprovação de solicitações de ingresso.
- [ ] Migrar sincronização offline para services transacionais.

### 5. Feed e comunicação

- [ ] `FeedRepository`.
- [ ] `FeedPolicy` com `publish`, `share`, `comment`, `moderate` e `delete`.
- [ ] `FeedService` para avisos, compartilhamentos, comentários, curtidas e notificações.
- [ ] Garantir que publicação em nome de grupo valide escopo do usuário.

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
