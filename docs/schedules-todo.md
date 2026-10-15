# TODO — Escalas

Atualizado em **15/10/2026** a partir da análise do código. Este documento detalha a
seção de Escalas do [TODO principal](./TODO.md), sem substituir sua ordem global.
Registrar um item aqui não significa que ele já foi implementado.

## Diagnóstico e limites atuais

- [x] Mapear o fluxo existente: página → hooks → Dexie/outbox → sincronização →
      backend de tarefas, além das rotas de equipes.
- [x] Executar os testes existentes de tarefas, sincronização e contexto:
      `src/test/tasks-layer.test.ts`, `src/test/sync.test.ts` e
      `src/test/sync-context.test.ts`: **17 testes passaram**. Esse resultado não
      comprova os cenários de segurança e consistência ainda ausentes abaixo.

Hoje o módulo cadastra tarefas com título, descrição, equipe, data, tipo, status e
um valor de recorrência. A listagem oferece exclusão; não há fluxo completo de
edição, detalhes, distribuição de participantes e confirmação de presença. A
recorrência é armazenada, mas não gera ocorrências. Não há notificações de Escalas
integradas à infraestrutura compartilhada.

O backend já possui policy e escopo por equipe, mas a proteção não é uniforme nos
caminhos de sincronização. No frontend, tarefas são filtradas pelo tenant, não
pelo escopo do usuário. As etapas 1 e 2 devem preceder novas funcionalidades.

## Etapa 1 — P0: autorização e arquitetura

- [ ] Aplicar permissão do módulo, ações e escopo de equipe também ao
      `/api/sync/pull`; atualmente a consulta de tarefas não replica as restrições
      da API específica de Escalas.
- [ ] Revisar `/api/sync` legado: não permitir que uma autorização de tarefas dê
      acesso a leitura/escrita de outros domínios. Remover o caminho se não houver
      consumidores ou fazê-lo reutilizar as mesmas policies dos endpoints atuais.
- [ ] Remover o bypass `legacyCompatible` de autorização em tarefas; operações sem
      contexto válido de usuário/permissões devem ser rejeitadas, não aceitas por
      compatibilidade. Cobrir o comportamento com testes.
- [ ] Em update/delete, carregar o registro persistido e autorizar sua equipe antes
      da mutação. Não confiar no `teamId` enviado pelo cliente para decidir se o
      usuário pode alterar um ID existente.
- [ ] Em transferência de equipe, autorizar a equipe atual e a de destino.
- [ ] Separar create/update: impedir que um create com ID existente sobrescreva uma
      tarefa via upsert e que um update crie um registro ausente inadvertidamente.
- [ ] Validar equipe existente/ativa e pertencimento permitido; definir validações
      de participantes quando o modelo de atribuição for aprovado.
- [ ] Aplicar Route → Controller → Service → Repository às rotas de tarefas,
      equipes e sync, sem construção/chamada direta de repository na route.
- [ ] Inventariar consumidores de `/schedules/tasks` e `/api/schedules/tasks` antes
      de consolidar as rotas duplicadas; preservar os consumidores válidos.
- [ ] Corrigir a consulta de equipes para não oferecer opções que o backend
      recusará por escopo; centralizar seu acesso HTTP em service de frontend.
- [ ] Padronizar respostas 401/403 e erros de validação, sem ocultar falha de
      autorização como erro genérico de servidor.

Aceite: consultar/alterar por ID ou enviar dados adulterados pelo sync não permite
acesso a tarefa fora do escopo. MEMBER/CANTEEN sem concessão não acessam Escalas;
LEADER respeita suas equipes; ADMIN/PASTOR seguem a matriz e o plano aplicáveis.
Concessões explícitas devem ser testadas, sem ampliar permissões padrão de perfil.

## Etapa 2 — P1: sincronização e integridade offline

- [ ] Gravar tarefa e operação de outbox na mesma transação Dexie.
- [ ] Registrar tenant e usuário de origem na criação da operação; impedir que a
      migração de fila antiga atribua automaticamente ao usuário/tenant atual uma
      operação de contexto desconhecido ou de outra sessão.
- [ ] Validar o contexto da operação no envio e no backend; nunca confiar somente
      no filtro visual da fila.
- [ ] Alinhar `LocalTask` ao contrato do backend, incluindo `deletedAt`, timestamps
      e o formato de atribuição aprovado, sem confundir estado local com status de
      negócio.
- [ ] Tratar tombstones: uma tarefa excluída não pode reaparecer no próximo pull;
      ajustar a leitura local e a reconciliação das exclusões.
- [ ] Proteger edições locais pendentes: um pull não pode sobrescrevê-las
      silenciosamente quando o push falha ou retorna conflito.
- [ ] Atualizar o estado local após confirmação do servidor e exibir pendência,
      erro, conflito e retry de forma distinta de “salvo no servidor”.
- [ ] Invalidar/remover dados locais fora do novo escopo ao trocar usuário, tenant,
      perfil, permissões ou equipes; não manter a mesma visão apenas porque o
      `tenantId` não mudou.
- [ ] Disparar sincronização após mutação online, com deduplicação e sem criar
      listeners/loops duplicados; preservar retry ao reconectar.
- [ ] Revisar a fila legada de equipes: não enfileirar operações que o endpoint de
      push não suporta nem manter retries permanentes para elas.
- [ ] Reconciliar equipes removidas/arquivadas; `bulkPut` isolado não elimina do
      cache registros que deixaram de vir na resposta.
- [ ] Propagar erros de gravação até o formulário; não navegar para a lista nem
      mostrar sucesso quando a persistência local falhar.
- [ ] Validar entrada offline com rota já visitada e não visitada; preservar o shell
      e fallback quando o módulo não estiver disponível, sem prometer que uma
      página server-side estará acessível só porque existem dados no Dexie.

Aceite: criar/alterar/excluir offline, reiniciar, reconectar e sincronizar não perde
alterações silenciosamente, não ressuscita exclusões e não transfere operações ou
dados entre usuários/tenants.

## Etapa 3 — P1: CRUD e experiência mobile

- [ ] Criar serviço HTTP de Escalas, mantendo transporte fora dos componentes e
      hooks de UI; compartilhar regras entre Web/Mobile.
- [ ] Separar FormCreate, FormEdit e FormUI com RHF/Zod; validar data, equipe,
      título, tipo, status e recorrência também no backend.
- [ ] Oferecer edição/detalhes e transições de status conforme permissão, sem
      depender de componentes de dashboard que não estão conectados ao módulo.
- [ ] Usar o padrão de subrota para create/edit/detail: voltar contextual e sem
      NavBottom; eliminar cabeçalhos/botões de voltar duplicados.
- [ ] Adotar `SharedFlatList` e paginação/infinite scroll quando necessário no
      mobile; manter tabela web compartilhando lógica, não duplicando regras.
- [ ] Incluir filtros por equipe, período e status, estados loading/empty/error,
      retry e indicação de alterações ainda locais.
- [ ] Pedir confirmação de exclusão e fornecer rótulos acessíveis nas ações.
- [ ] Revisar overflow de títulos, espaçamento, safe-area e badges de equipe com
      contraste light/dark; reaproveitar primitives compartilhadas.
- [ ] Tratar datas locais/fuso explicitamente, inclusive nos filtros por dia.

## Etapa 4 — evolução funcional posterior, com definição antes de implementar

Não confundir estes itens com correções já autorizadas ou funcionalidades prontas.

- [ ] Definir atribuição individual e múltiplos participantes por escala/equipe,
      com vínculo validado ao membro e permissões de gestão/resposta.
- [ ] Definir aceite, recusa, indisponibilidade, substituição e histórico de
      alterações, incluindo quem pode solicitar e aprovar cada ação.
- [ ] Definir recorrência real: série/ocorrência, fuso, edição de uma ou de todas,
      cancelamento e prevenção de geração duplicada.
- [ ] Definir alertas de conflito de horário e os casos que bloqueiam o cadastro.
- [ ] Integrar avisos de atribuição, alteração, cancelamento e lembretes à infra
      existente de notificações persistidas/SSE/Push, respeitando destinatários e
      tenant, sem criar um transporte paralelo.
- [ ] Avaliar calendário e exportação depois de estabilizar dados e fluxos básicos.
- [ ] Quando houver alteração de schema, criar migrations Prisma e verificar sua
      aplicação no script inicial e no provisionamento. Nunca alterar/resetar
      `bible.db` para corrigir Escalas.

## Testes obrigatórios antes do aceite

- [ ] Leitura e cada mutação via API específica, sync push, pull e endpoint legado.
- [ ] Tentativa de alterar/excluir tarefa de outra equipe usando ID válido e
      `teamId` adulterado; create com ID já existente e update com ID ausente.
- [ ] MEMBER, CANTEEN, LEADER, PASTOR e ADMIN, concessões explícitas, módulos fora do
      plano e transições de perfil/equipe enquanto o app permanece aberto.
- [ ] Dois tenants e dois usuários no mesmo navegador; filas antigas sem contexto.
- [ ] Falha entre gravação local e fila, conflito, retry, exclusão recebida no pull
      e edição pendente enquanto o servidor envia uma versão diferente.
- [ ] Teclado, drawer, scroll, retorno após suspensão e navegação offline em
      Android/iPhone, usando artefato de produção.
- [ ] Typecheck, lint e testes automatizados; build e aceite manual no ambiente em
      que o usuário executará a aplicação. Build aprovado sozinho não fecha a etapa.

## Arquivos principais para execução

- Páginas e UI: `src/app/schedules/` e `src/features/schedules/`.
- Backend: `src/server/tasks/` e `src/lib/server/team-scope.ts`.
- Rotas: `src/app/api/schedules/`, `src/app/schedules/tasks/route.ts` e
  `src/app/api/sync/`.
- Sincronização: `src/features/sync/services/sync-service.ts` e
  `src/features/sync/services/sync-context.ts`.
- Modelos: `src/lib/db.ts` e `prisma/tenant/schema.prisma`.

Próxima ação do módulo: **Etapa 1, começando pela autorização no sync pull e pela
validação da equipe persistida no update/delete**, com testes de regressão antes
de ampliar a UI ou adicionar participantes/recorrência.
