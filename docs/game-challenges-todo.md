# TODO — Desafios online de Memória e Quiz

Este módulo deve ser implementado como um domínio independente. A primeira versão não deve alterar o funcionamento dos jogos solo, do Feed, do SSE geral de notificações ou do banco `bible.db`.

## Objetivo

Permitir que um membro desafie outro membro em uma partida de Memória ou Quiz, com convite, aceite/recusa, jogadas validadas no servidor, placar em tempo real, resultado persistido e opção de compartilhar o resultado no Feed.

## Regras de isolamento

- [ ] Criar uma camada própria em `src/server/game-challenges`.
- [ ] Criar serviços de cliente em `src/services/game-challenges`.
- [ ] Não reutilizar estado local dos jogos solo como estado da partida online.
- [ ] Não alterar contratos existentes de `/api/events` para suportar jogadas.
- [ ] Não alterar tabelas de Feed, Quiz solo ou Bíblia.
- [ ] Usar somente o banco do tenant para desafios.
- [ ] Manter os jogos solo funcionando mesmo sem rede.
- [ ] Ativar o modo online somente mediante `challengeId` válido.

## Fase 1 — Contrato e modelo de dados

- [ ] Definir os tipos `memory` e `quiz`.
- [ ] Definir os estados `pending`, `active`, `completed`, `declined`, `expired` e `cancelled`.
- [ ] Criar migration no schema do tenant para `GameChallenge`.
- [ ] Criar tabela de participantes ou garantir duas participações por desafio.
- [ ] Criar tabela de jogadas com sequência única por partida.
- [ ] Persistir versão do estado para controle de concorrência.
- [ ] Persistir placar, turno, prazo, vencedor e datas importantes.
- [ ] Criar índices por tenant, participante, status e atualização.
- [ ] Garantir que nenhuma migration toque `bible.db`.

Modelo mínimo sugerido:

- `GameChallenge`: jogo, criador, convidado, status, versão, turno, placar, estado público, criado/atualizado/concluído.
- `GameChallengeMove`: desafio, sequência, jogador, ação, resultado, pontos, versão e data.

## Fase 2 — Segurança e regras no servidor

- [ ] Validar que os dois membros pertencem ao mesmo tenant.
- [ ] Validar que o convidado está ativo e pode participar.
- [ ] Impedir convite para si mesmo e partidas duplicadas pendentes.
- [ ] Não confiar em turno, pontuação, cartas ou respostas enviados pelo cliente.
- [ ] Validar que somente os dois participantes podem consultar ou jogar.
- [ ] Usar `version` e `sequence` para rejeitar jogadas antigas ou duplicadas.
- [ ] Retornar conflito `409` quando houver atualização concorrente.
- [ ] Definir expiração para convites e partidas abandonadas.

## Fase 3 — APIs independentes

- [ ] `POST /api/game-challenges` — criar e enviar convite.
- [ ] `GET /api/game-challenges` — listar convites, partidas ativas e histórico.
- [ ] `GET /api/game-challenges/:id` — obter snapshot autorizado.
- [ ] `POST /api/game-challenges/:id/accept` — aceitar convite.
- [ ] `POST /api/game-challenges/:id/decline` — recusar convite.
- [ ] `POST /api/game-challenges/:id/cancel` — cancelar convite ou partida permitida.
- [ ] `POST /api/game-challenges/:id/moves` — aplicar uma jogada idempotente.
- [ ] `POST /api/game-challenges/:id/share` — compartilhar resultado final no Feed.
- [ ] Manter controllers, policies, repositories e schemas separados do Feed.

## Fase 4 — Memória online

- [ ] Gerar e armazenar no servidor a configuração embaralhada da partida.
- [ ] Enviar ao cliente somente a parte pública do tabuleiro.
- [ ] Permitir uma tentativa de cada jogador por turno.
- [ ] Ao acertar, manter o turno do jogador.
- [ ] Ao errar, trocar o turno.
- [ ] Somar pontos exclusivamente no servidor.
- [ ] Impedir selecionar carta já encontrada ou duas vezes a mesma carta.
- [ ] Transmitir a jogada revelada e o resultado pelo canal de jogos.
- [ ] Encerrar quando todos os pares forem encontrados.

## Fase 5 — Quiz online

- [ ] Definir banco/conjunto de perguntas da partida no servidor.
- [ ] Ocultar respostas corretas do payload inicial.
- [ ] Definir e documentar o modo da primeira versão: turnos alternados ou respostas simultâneas por rodada.
- [ ] Validar resposta no servidor e calcular pontos no servidor.
- [ ] Impedir resposta repetida para a mesma questão.
- [ ] Transmitir questão atual, resposta registrada, pontos e rodada sem expor o gabarito antes da hora.
- [ ] Persistir resultado sem alterar o registro de tentativa individual existente.

## Fase 6 — SSE separado (`ssegames`)

- [ ] Criar um broker ou namespace próprio para eventos de jogos.
- [ ] Expor um endpoint dedicado, por exemplo `/api/ssegames`.
- [ ] Autenticar a conexão pelo tenant e usuário da sessão.
- [ ] Entregar eventos somente para participantes do desafio.
- [ ] Definir eventos: `challenge.invited`, `challenge.accepted`, `challenge.declined`, `move.applied`, `score.updated`, `challenge.completed` e `challenge.expired`.
- [ ] Incluir `challengeId`, `gameType`, `sequence`, `version`, `currentTurn`, `scores` e estado público.
- [ ] Persistir a jogada antes de publicar o evento SSE.
- [ ] Fazer o cliente recuperar snapshot por API ao reconectar.
- [ ] Não abrir uma segunda conexão para o SSE geral de notificações quando o provider existente puder distribuir eventos de jogos.
- [ ] Avaliar Redis/pub-sub antes de produção com múltiplas instâncias; o broker em memória só é seguro em instância única.

## Fase 7 — Convites e notificações

- [ ] Criar notificação persistente para o membro desafiado.
- [ ] Enviar convite por SSE geral e Web Push, sem enviar cada jogada por Push.
- [ ] Incluir link direto para a partida.
- [ ] Notificar o desafiante quando o convite for aceito ou recusado.
- [ ] Notificar os participantes ao concluir a partida.
- [ ] Evitar notificações duplicadas usando chave de origem e desafio.

## Fase 8 — Compartilhamento no Feed

- [ ] Permitir compartilhamento somente após a partida concluída.
- [ ] Criar publicação através de um serviço próprio de integração.
- [ ] Não permitir que o cliente informe vencedor ou pontuação no conteúdo confiável.
- [ ] Compartilhar jogo, participantes, placar e data a partir do resultado persistido.
- [ ] Permitir desligar o compartilhamento sem afetar a partida.
- [ ] Cobrir autorização e duplicidade do compartilhamento.

## Fase 9 — UI e compatibilidade

- [ ] Criar componentes próprios para convite, sala, placar e resultado.
- [ ] Adaptar Memória e Quiz sem duplicar o código dos modos solo.
- [ ] Exibir estados de conexão, reconexão e conflito de jogada.
- [ ] Permitir abandonar a tela e retornar sem perder a partida.
- [ ] Adicionar entrada para aceitar convite por notificação.
- [ ] Manter a UI do Feed independente do módulo.

## Fase 10 — Testes e rollout

- [ ] Testar policies de tenant e participantes.
- [ ] Testar convite, aceite, recusa, expiração e cancelamento.
- [ ] Testar turno da Memória: acerto mantém turno e erro alterna.
- [ ] Testar pontuação e idempotência de jogadas.
- [ ] Testar respostas e pontuação do Quiz sem vazamento do gabarito.
- [ ] Testar reconexão SSE e recuperação por snapshot.
- [ ] Testar isolamento do SSE geral, Feed e Bíblia.
- [ ] Testar compartilhamento final sem duplicidade.
- [ ] Executar `tsc`, lint, testes unitários e build antes de habilitar a funcionalidade.
- [ ] Liberar inicialmente atrás de feature flag por tenant.

## Ordem de implementação

1. Contratos, migration e policies.
2. Repository/service/controller das partidas.
3. Memória online com testes de turno e pontuação.
4. Canal `ssegames` e reconexão.
5. Convites, notificações e Web Push.
6. Quiz online.
7. Compartilhamento do resultado no Feed.
8. UI final, feature flag e rollout gradual.
