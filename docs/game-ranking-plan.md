# Game Ranking Plan

## Objetivo

Adicionar ranking persistido para `/jogos-novos` sem misturar jogos novos com `QuizAttempt`.

## Estado atual

A primeira etapa foi implementada com a entidade `GameScore` no schema do tenant.
O endpoint autenticado `POST /api/engagement/scores` valida o jogador, o jogo e a
pontuação antes de persistir o resultado. O perfil de engajamento já agrega essas
pontuações ao ranking geral da igreja junto com devocionais e quiz.

Ainda não há ranking por jogo exposto em uma API própria, deduplicação por execução
do cliente ou integração completa de todos os jogos solo.

## Decisao

Criar uma entidade propria, como `GameAttempt` ou `GameRun`.

Motivos:

- jogos novos nao compartilham sempre semantica de quiz;
- `QuizAttempt` tem campos especificos como `totalQuestions` e `correctAnswers`;
- ranking agregado fica mais correto com uma tabela generica.

## Modelo Sugerido

Campos:

- `id`
- `clientRunId`
- `gameSlug`
- `gameName`
- `category`
- `userId`
- `userName`
- `score`
- `rankScore`
- `durationMs`
- `result`
- `metadataJson`
- `completedAt`
- `createdAt`
- `updatedAt`
- `deletedAt`

`clientRunId` deve ajudar a evitar duplicidade por clique duplo ou retry.

## APIs

- Implementado: `POST /api/engagement/scores` registra pontuação autenticada no tenant.
- Pendente: `GET /api/games/attempts` para histórico do usuário ou do tenant.
- Pendente: `GET /api/games/ranking` para ranking por jogo e ranking geral.

## Ranking

- Ranking por jogo: melhor pontuacao por `gameSlug`.
- Ranking geral: soma da melhor tentativa de cada usuario por jogo.
- Integracao com engajamento: `/api/engagement/profile` deve somar pontos de devocional, quiz e jogos novos.

## Implementacao Incremental

1. ~~Criar tabela no Prisma e fallback em `tenant-schema`.~~
2. ~~Criar API inicial de registro.~~
3. Criar helper cliente compartilhado com `clientRunId` e idempotência.
4. Integrar três jogos piloto.
5. Expor ranking por jogo e histórico no hub.
6. Expandir para os demais jogos.

## Checklist

- [x] Schema `GameScore` criado no tenant.
- [x] Migration tenant criada e aplicada pelo orquestrador.
- [x] POST inicial implementado em `/api/engagement/scores`.
- [ ] GET de ranking implementado.
- [ ] Deduplicacao por `clientRunId`.
- [x] Integracao com engagement profile.
- [ ] Jogos piloto integrados.
- [x] UI inicial do ranking geral adicionada ao dashboard do membro.
