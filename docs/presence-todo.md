# TODO — Presença online por tenant

Objetivo: permitir que usuários autorizados visualizem membros online na tela
de membros, sem misturar dados de presença com cadastro, notificações ou dados
de outro tenant.

## Decisões obrigatórias

- [ ] Considerar online somente quem possui heartbeat válido dentro do TTL
      definido (sugestão inicial: 90 segundos).
- [ ] Usar o SSE existente somente como transporte dos eventos de presença.
- [ ] Não abrir um segundo `EventSource` no frontend.
- [ ] Isolar todas as chaves por `tenantId` e `userId`.
- [ ] Não usar Push para calcular presença.
- [ ] Não gravar cada heartbeat no SQLite.
- [ ] Não permitir que o admin global veja presença de tenants sem uma regra
      explícita futura.
- [x] Reutilizar a conexão física `/api/events`; não abrir um segundo
      `EventSource` para presença.
- [x] Tratar presença como canal lógico tipado, separado dos eventos de
      notificações persistidas.
- [x] Aplicar `members:online:view` no backend antes da assinatura e da entrega
      de qualquer snapshot ou delta de presença.

## Fase 0 — contrato e segurança

- [ ] Definir o payload público de presença: `userId`, status e `lastSeenAt`.
- [ ] Definir TTL, intervalo de heartbeat e comportamento após reconexão.
- [ ] Definir a permissão explícita `members:online:view` para consultar presença.
- [ ] Permitir acesso ao admin do próprio tenant e a perfis que recebam essa
      permissão explicitamente.
- [ ] Não liberar o stream por estar apenas autenticado no tenant.
- [ ] Documentar que presença é indicativa e não equivale a atividade contínua.

## Fase 1 — infraestrutura isolada

- [x] Criar `src/infra/presence/presence-broker.ts`.
- [x] Manter mapa de presença separado do `SseBroker` de notificações.
- [x] Criar listeners por tenant para eventos `presence.updated`.
- [x] Implementar expiração e limpeza de registros vencidos.
- [x] Garantir que publicação nunca atravesse o limite do tenant.
- [x] Documentar a limitação do broker em memória para instância única.

## Fase 2 — backend em camadas

Implementar estritamente `route → controller → service → repository`:

- [x] Criar `presence.repository.ts` para leitura/atualização do estado.
- [x] Criar `presence.service.ts` para heartbeat, TTL e publicação.
- [x] Criar `presence.controller.ts` para autenticação e respostas HTTP.
- [x] Criar `presence.policy.ts` para exigir `members:online:view` e o tenant
      ativo do usuário.
- [x] Criar `POST /api/presence/heartbeat` para o usuário autenticado.
- [x] Criar `GET /api/presence` para administradores ou usuários com
      `members:online:view`.
- [x] Proteger a rota SSE de presença com a mesma policy da listagem.
- [ ] Rejeitar usuário inativo, removido ou sem tenant ativo.
- [ ] Manter o endpoint de notificações sem responsabilidade de presença.

## Fase 3 — integração SSE

- [x] Adicionar eventos de presença ao stream autenticado já existente, sem criar
      um endpoint SSE físico adicional.
- [x] Reutilizar o `NotificationsProvider` e sua única conexão SSE.
- [x] Definir os eventos `presence.snapshot`, `presence.updated` e
      `presence.removed`.
- [x] Enviar o snapshot inicial por `GET /api/presence`, evitando repetir a lista
      completa a cada alteração.
- [ ] Registrar heartbeat ao conectar/retomar o stream, sem confiar somente na
      existência da conexão.
- [ ] Remover/expirar presença quando o stream for abortado ou o TTL vencer.
- [x] Entregar eventos somente a administradores ou usuários com
      `members:online:view` dentro do mesmo tenant.
- [ ] Interromper imediatamente a entrega de presença quando a permissão for
      revogada durante uma conexão já aberta.
- [x] Manter o stream global do admin de plataforma separado.

## Fase 4 — frontend de membros

- [x] Criar API client de presença para listagem e heartbeat.
- [ ] Criar hook/store de presença separado da lista de membros.
- [x] Enviar heartbeat a cada 30–45 segundos e ao retornar ao primeiro plano.
- [x] Atualizar status com eventos SSE sem recarregar a lista inteira.
- [x] Exibir indicador online/offline na tela de Membros.
- [x] Aplicar o mesmo indicador no mobile (`SharedFlatList`) e no Web.
- [ ] Limpar o estado ao trocar de tenant ou fazer logout.

## Fase 5 — testes

- [ ] Testar isolamento entre dois tenants.
- [ ] Testar política de admin, usuário autorizado, membro sem permissão e
      admin global.
- [ ] Testar heartbeat, renovação, expiração e duplicidade.
- [ ] Testar usuário desativado/removido.
- [ ] Testar reconexão SSE sem conexões duplicadas.
- [ ] Testar aba suspensa, retorno do PWA e perda de rede.
- [ ] Testar atualização do indicador sem refresh da tela de membros.
- [ ] Testar rotas `401`, `403` e respostas válidas.

## Fase 6 — operação e escala

- [ ] Adicionar logs estruturados de heartbeat, expiração e eventos publicados.
- [ ] Adicionar métricas de usuários online por tenant sem expor dados pessoais.
- [ ] Criar feature flag para ativação gradual por tenant.
- [ ] Validar em produção com uma instância.
- [ ] Antes de múltiplas instâncias, migrar o broker para Redis/pub-sub ou
      armazenamento compartilhado equivalente.

## Decisão de transporte

O SSE físico continua compartilhado porque o aplicativo já mantém uma conexão
por janela para notificações, permissões e eventos do tenant. A presença será um
canal lógico adicional, com payloads pequenos e autorização independente. Uma
segunda conexão só deverá ser considerada se a frequência de eventos, o número
de usuários ou o isolamento de backpressure justificar o custo operacional.

## Critério de aceite

Um admin ou usuário com `members:online:view` vê, sem atualizar a página, um
membro do mesmo tenant entrar e sair da lista de online. Um usuário autenticado
sem essa permissão não consegue consultar a rota nem abrir o stream. Após o TTL,
o membro fica offline mesmo que o navegador tenha sido suspenso. Nenhum evento
ou usuário de outro tenant é entregue ao cliente.
