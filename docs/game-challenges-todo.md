# TODO — Desafios online de Memória e Quiz

Este módulo deve ser implementado como um domínio independente. A primeira versão não deve alterar o funcionamento dos jogos solo, do Feed, do SSE geral de notificações ou do banco `bible.db`.

## Objetivo

Permitir que um membro desafie outro membro em uma partida de Memória ou Quiz, com convite, aceite/recusa, jogadas validadas no servidor, placar em tempo real, resultado persistido e opção de compartilhar o resultado no Feed.

## Regras de isolamento

- [x] Criar uma camada própria em `src/server/game-challenges`.
- [x] Criar serviços de cliente em `src/services/game-challenges`.
- [ ] Não reutilizar estado local dos jogos solo como estado da partida online.
- [ ] Não alterar contratos existentes de `/api/events` para suportar jogadas.
- [ ] Não alterar tabelas de Feed, Quiz solo ou Bíblia.
- [x] Usar somente o banco do tenant para desafios.
- [ ] Manter os jogos solo funcionando mesmo sem rede.
- [ ] Ativar o modo online somente mediante `challengeId` válido.

## Fase 1 — Contrato e modelo de dados

- [x] Definir o tipo inicial `quiz`; `memory` entra com a sala online.
- [x] Persistir o estado inicial `pending`; os estados de sala entram nas próximas fases.
- [x] Criar migration no schema do tenant para `GameChallenge`.
- [x] Garantir autorização pelos dois participantes persistidos no desafio.
- [x] Criar tabela de jogadas com sequência única por partida.
- [x] Persistir versão do estado para controle de concorrência.
- [x] Persistir placar, turno, prazo, vencedor e datas importantes.
- [ ] Criar índices por tenant, participante, status e atualização.
- [ ] Garantir que nenhuma migration toque `bible.db`.

Modelo mínimo sugerido:

- `GameChallenge`: jogo, criador, convidado, status, versão, turno, placar, estado público, criado/atualizado/concluído.
- `GameChallengeMove`: desafio, sequência, jogador, ação, resultado, pontos, versão e data.

## Fase 2 — Segurança e regras no servidor

- [x] Validar que os dois membros pertencem ao mesmo tenant.
- [x] Validar que o convidado está ativo e pode participar.
- [x] Impedir convite para si mesmo e partidas duplicadas pendentes.
- [x] Não confiar em turno, pontuação, cartas ou respostas enviados pelo cliente.
- [x] Validar que somente os dois participantes podem consultar ou jogar.
- [x] Usar `version` e `sequence` para rejeitar jogadas antigas ou duplicadas.
- [x] Retornar conflito `409` quando houver atualização concorrente.
- [x] Validar expiração para convites antes do aceite.

## Fase 3 — APIs independentes

- [ ] `POST /api/game-challenges` — criar e enviar convite.
- [x] `GET /api/game-challenges` — listar convites, partidas ativas e histórico.
- [x] `GET /api/game-challenges/:id` — obter snapshot autorizado.
- [x] `POST /api/game-challenges/:id` com `action=accept|decline|cancel`.
- [x] `POST /api/game-challenges/:id` — aplicar uma jogada idempotente.
- [x] Compartilhar resultado final via `POST /api/game-challenges/:id` com `action=share`.
- [ ] Manter controllers, policies, repositories e schemas separados do Feed.

## Fase 4 — Memória online

- [x] Gerar e armazenar no servidor a configuração embaralhada da partida.
- [x] Enviar ao cliente somente a parte pública do tabuleiro.
- [x] Permitir uma tentativa de cada jogador por turno.
- [x] Ao acertar, manter o turno do jogador.
- [x] Ao errar, trocar o turno.
- [x] Somar pontos exclusivamente no servidor.
- [x] Impedir selecionar carta já encontrada ou duas vezes a mesma carta.
- [x] Transmitir a jogada revelada e o resultado pelo canal de jogos.
- [x] Encerrar quando todos os pares forem encontrados.

## Fase 5 — Quiz online

- [x] Definir banco/conjunto de perguntas da partida no servidor.
- [x] Ocultar respostas corretas do payload inicial.
- [x] Usar turnos alternados na primeira versão.
- [x] Validar resposta no servidor e calcular pontos no servidor.
- [x] Impedir resposta repetida por versão/turno.
- [x] Transmitir questão atual, resposta registrada, pontos e rodada sem expor o gabarito antes da hora.
- [ ] Persistir resultado sem alterar o registro de tentativa individual existente.

## Fase 6 — SSE separado (`ssegames`)

- [x] Criar um broker ou namespace próprio para eventos de jogos.
- [x] Expor `/api/ssegames?challenge=:id`.
- [x] Autenticar a conexão pelo tenant e usuário da sessão.
- [x] Entregar eventos somente para participantes do desafio.
- [ ] Definir eventos: `challenge.invited`, `challenge.accepted`, `challenge.declined`, `move.applied`, `score.updated`, `challenge.completed` e `challenge.expired`.
- [ ] Incluir `challengeId`, `gameType`, `sequence`, `version`, `currentTurn`, `scores` e estado público.
- [x] Persistir a jogada antes de publicar o evento SSE.
- [x] Enviar snapshot inicial para o cliente ao conectar/reconectar.
- [ ] Não abrir uma segunda conexão para o SSE geral de notificações quando o provider existente puder distribuir eventos de jogos.
- [ ] Avaliar Redis/pub-sub antes de produção com múltiplas instâncias; o broker em memória só é seguro em instância única.

## Fase 7 — Convites e notificações

- [x] Criar notificação persistente para o membro desafiado.
- [x] Enviar convite por SSE geral e Web Push, sem enviar cada jogada por Push.
- [x] Incluir link direto para o Quiz.
- [ ] Notificar o desafiante quando o convite for aceito ou recusado.
- [ ] Notificar os participantes ao concluir a partida.
- [ ] Evitar notificações duplicadas usando chave de origem e desafio.

## Fase 8 — Compartilhamento no Feed

- [x] Permitir compartilhamento somente após a partida concluída.
- [x] Criar publicação através de um serviço próprio de integração.
- [x] Não permitir que o cliente informe vencedor ou pontuação no conteúdo confiável.
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
