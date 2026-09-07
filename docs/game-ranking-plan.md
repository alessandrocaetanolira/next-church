# Game Ranking Plan

## Objetivo

Adicionar ranking persistido para `/jogos-novos` sem misturar jogos novos com `QuizAttempt`.

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

- `POST /api/games/attempts`: registra tentativa concluida.
- `GET /api/games/attempts`: lista tentativas do usuario ou do tenant.
- `GET /api/games/ranking`: ranking por jogo e ranking geral.

## Ranking

- Ranking por jogo: melhor pontuacao por `gameSlug`.
- Ranking geral: soma da melhor tentativa de cada usuario por jogo.
- Integracao com engajamento: `/api/engagement/profile` deve somar pontos de devocional, quiz e jogos novos.

## Implementacao Incremental

1. Criar tabela no Prisma e fallback em `tenant-schema`.
2. Criar APIs.
3. Criar helper cliente compartilhado para submissao.
4. Integrar tres jogos piloto.
5. Expor ranking no hub.
6. Expandir para os demais jogos.

## Checklist

- [ ] Schema criado.
- [ ] Fallback tenant criado.
- [ ] POST implementado.
- [ ] GET de ranking implementado.
- [ ] Deduplicacao por `clientRunId`.
- [ ] Integracao com engagement profile.
- [ ] Jogos piloto integrados.
- [ ] UI de ranking adicionada.
