# TODO — Separação Route/Controller/Service/Repository

## Intenção e resultado esperado

Este documento é o plano vivo da refatoração. A intenção não é apenas mover arquivos:
é estabelecer fronteiras previsíveis para que cada módulo possa evoluir, ser testado
e aplicar autorização sem duplicar regras nas rotas.

O resultado esperado é:

- rotas finas, responsáveis somente por HTTP, sessão, validação de entrada e delegação;
- controllers responsáveis por traduzir HTTP para comandos do domínio e erros para status;
- services responsáveis por casos de uso, transações e orquestração;
- policies responsáveis por perfil, permissão, plano e escopo de tenant/equipe;
- repositories responsáveis exclusivamente por persistência e consultas;
- banco global isolado para plataforma/tenants e banco de tenant isolado para os dados da igreja;
- testes de regra independentes de Next.js e de um banco compartilhado.

O contrato HTTP existente deve ser preservado durante a migração. Alterações de
comportamento, schema ou permissões só entram junto com testes e uma decisão registrada.

## Estado geral em 20/09/2026

### Concluído

- Infraestrutura de erros, respostas e contextos de tenant/plataforma criada.
- Membros, materiais, cantina, grupos, equipes, tarefas, feed e sincronização offline
  migrados parcial ou integralmente para camadas de domínio.
- Pastoral, infantil, estacionamento, Bíblia, Quiz, notificações e engajamento
  migrados para repository/policy/service/controller.
- Fluxos de cantina, estoque, fiado, pedidos, pagamentos e operação abrir/fechar
  estão centralizados em services e policies próprias.
- O isolamento global/tenant e o acesso do administrador global possuem rotas e
  clients separados.

### Em andamento

- Completar escopos de líder e permissões que ainda dependem de regras antigas.
- Fechar a cobertura de testes por camada e por resposta HTTP.
- Substituir extensões de schema executadas em runtime por migrations definitivas.
- Extrair Branding/configurações e rotas administrativas globais de tenants/planos.

### Validação atual

- TypeScript e lint passam.
- A suíte completa foi executada localmente com sucesso após permitir os
  subprocessos Prisma: 36 arquivos, 113 testes considerados, 105 aprovados e 8
  ignorados.
- O build de produção foi executado com sucesso após esta rodada.

## Estratégia de evolução

Cada domínio segue este ciclo, sem tentar refatorar toda a aplicação de uma vez:

1. mapear a rota atual, seu contrato e suas regras;
2. criar repository, policy, service e controller mantendo o contrato HTTP;
3. mover a rota para o controller e manter adapter temporário quando necessário;
4. adicionar testes unitários de policy/service e testes de repository/controller;
5. comparar respostas e permissões antes/depois;
6. remover código legado somente depois da validação do domínio;
7. registrar pendências e escolher o próximo domínio.

Ordem escolhida: primeiro infraestrutura e módulos com regras mais reutilizáveis;
depois módulos de negócio e, por último, os fluxos com maior estado/offline. Sync
não deve voltar a concentrar regra: ele apenas traduz operações offline para os
services transacionais dos domínios.

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

## Regra arquitetural do frontend

As telas não devem concentrar chamadas HTTP, acesso ao IndexedDB, conexão SSE ou
regras de transformação de dados. O fluxo deve seguir:

```text
page/component -> hook/provider -> service (HTTP/offline) -> API
                              -> store/cache local
```

- [x] Separar a API HTTP de notificações do cache/estado do notification center.
- [x] Manter a conexão SSE em service próprio, sem instanciá-la em componentes.
- [x] Separar o fluxo HTTP do estacionamento em `src/services/parking/`.
- [x] Separar os fluxos HTTP de grupos, feed do grupo e solicitações de ingresso em `src/services/groups/`.
- [x] Separar o fluxo HTTP do Feed em `src/services/feed/`.
- [x] Separar listagem, detalhe, acesso e formulário HTTP de membros em `src/services/members/`.
- [x] Separar a listagem e alteração de status dos tenants administrativos em `src/services/admin/`.
- [x] Separar dashboard administrativo e CRUD de planos em `src/services/admin/`.
- [x] Separar o fluxo HTTP do módulo Infantil em `src/services/kids/`.
- [x] Separar avisos e ações de aprovação do módulo Pastoral em `src/services/pastoral/`.
- [x] Separar integração de engajamento e pedidos do dashboard em `src/services/`.
- [x] Separar o fluxo HTTP de materiais em `src/services/materials/`.
- [x] Separar leitura e persistência de tentativas do Quiz em `src/services/quiz/`.
- [x] Reutilizar o service de tentativas do Quiz nos Games, preservando fallback local.
- [x] Reutilizar o service de Feed no compartilhamento de versículos da Bíblia.

Referência específica: [TODO de Jogos Bíblicos](./games-todo.md).
- [x] Reutilizar services de grupos e Feed no módulo de Projetos Sociais.
- [x] Separar leitura e atualização do branding nas configurações do usuário em `src/services/settings/`.
- [x] Consolidar API de produtos da Cantina em `src/services/canteen/products-api.ts`.
- [x] Consolidar criação de vendas da Cantina em `src/services/canteen/sales-api.ts`.
- [x] Consolidar operações de pedidos, preparo, fiado, membros e status da Cantina em `src/services/canteen/operations-api.ts`.
- [x] Centralizar transporte HTTP dos helpers de sincronização em `src/services/sync/sync-api.ts`.
- [x] Separar branding público, cadastro e criação de tenant em services de autenticação/admin.
- [x] Extrair os clients HTTP espalhados em páginas e componentes para `src/services/`.
- [ ] Extrair regras de sincronização offline dos componentes para hooks/services.
- [ ] Padronizar estados `loading`, `error`, `offline` e `retry` nos hooks de domínio.
- [ ] Cobrir services frontend com testes sem renderizar páginas.

### Validação da rodada de services frontend

- [x] TypeScript executado com sucesso.
- [x] ESLint executado com sucesso, sem erros bloqueantes.
- [x] Suíte de testes executada com sucesso.
- [x] Build de produção executado com sucesso.

## Ordem de migração por domínio

### Revisão inicial — 19/09/2026

- [x] Confirmado que ainda não existem camadas formais de controller/repository no código da aplicação.
- [x] Identificados 57 route handlers; os maiores candidatos à extração são Cantina, Sync, Feed, Grupos e Membros.
- [x] Confirmado que o isolamento de tenant já é resolvido por `tenantId/databaseKey` na autenticação e no `prisma-factory`.
- [x] Definido Membros como primeiro vertical slice, por concentrar cadastro, conta de acesso e permissões.
- [x] Migrar `sync` somente depois dos services dos domínios envolvidos estarem disponíveis.

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
- [x] Validar escopo por equipe quando aplicável, mantendo materiais sem `teamId` como globais.

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
- [x] Policies específicas da Cantina cobrem `view`, `sell`, `operate` e `manage_products` nos subdomínios correspondentes.
- [x] Services da Cantina cobrem produtos, operação, vendas, preparo, pedidos, estoque, fiado e pagamentos.
- [x] Estado operacional de cantina aberta/fechada está centralizado em `operation.service`.
- [x] Produtos, PDV, pedidos, preparo, vendas e ledger foram migrados para camadas próprias.

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

- [x] Pastoral: pendências, aprovação e rejeição de membros migradas para repository/policy/service/controller.
- [x] Infantil: cadastro, edição, exclusão e notificações migrados para repository/policy/service/controller.
- [x] Adicionar testes unitários do service/policy do Infantil.
- [x] Estacionamento: CRUD, status e notificações migrados para repository/policy/service/controller.
- [x] Adicionar testes unitários do service/policy do Estacionamento.
- [x] Bíblia: livros, capítulos e versículos migrados para repository/policy/service/controller.
- [x] Jogos/Quiz: perguntas e tentativas migrados para repository/policy/service/controller.
- [x] Adicionar testes unitários dos services/policies de Bíblia e Quiz.
- [x] Adicionar testes unitários do service/policy do Quiz.
- [x] Notificações: leitura e marcação como lida migradas para repository/policy/service/controller.
- [x] Adicionar testes unitários do service/policy de Notificações.
- [x] Engajamento: perfil, streak, desafios, pontuação e ranking migrados para repository/policy/service/controller.
- [x] Adicionar testes unitários dos services/policies de Notificações e Engajamento.
- [ ] Branding e configurações.
- [ ] Rotas administrativas globais de tenants e planos.

## Migração segura

- [x] Migrar um domínio por vez sem alterar o contrato HTTP nos domínios concluídos.
- [x] Manter adapters temporários para chamadas antigas durante a migração.
- [ ] Não misturar refatoração arquitetural com alteração de schema sem necessidade.
- [ ] Remover duplicação apenas depois dos testes do domínio passarem.
- [x] Remover Prisma/raw SQL das routes dos domínios concluídos.
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

## Próximos incrementos recomendados

1. Corrigir o teste da API Bíblia e tornar as suítes de integração executáveis no
   ambiente de testes sem depender de `spawnSync` bloqueado.
2. Padronizar `requireSession`, `requireTenant` e `requirePlatformAdmin`.
3. Criar a camada de validação compartilhada e uniformizar erros 401, 403, 404,
   409 e 422 nos controllers.
4. Completar `GroupsPolicy` e os escopos de líder em grupos, materiais e tarefas.
5. Migrar Branding/configurações e as rotas globais de tenants e planos.
6. Substituir DDL em runtime por migrations e concluir a auditoria de isolamento.
7. Executar os testes de aceite com três tenants e validar o build para deploy.

Não iniciar uma nova migração de domínio antes de resolver a validação do item
anterior, salvo correção urgente de segurança ou isolamento.
