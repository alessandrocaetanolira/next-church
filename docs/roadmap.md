# Roadmap

## Prioridade 1: Estabilizacao

- [ ] Investigar e corrigir `npm run build`.
- [ ] Corrigir testes de sync com mocks para `$queryRawUnsafe`, `$executeRawUnsafe` e transacoes Prisma.
- [ ] Unificar configuracao PostCSS, mantendo apenas uma fonte efetiva.
- [ ] Alinhar versoes de `next`, `react` e `eslint-config-next`.
- [ ] Revisar o `AGENTS.md`, pois `node_modules/next/dist/docs/` nao existe nesta instalacao.

## Prioridade 2: UI Reutilizavel

- [ ] Criar `src/components/common`.
- [ ] Implementar `PageShell`, `PageHeader`, `EmptyState`, `LoadingState`, `ErrorState`.
- [ ] Implementar `SearchField`, `FilterChips`, `ActionMenu`, `ConfirmDeleteDialog`.
- [ ] Implementar `AppImage` para substituir `<img>` em telas de aplicacao.
- [ ] Padronizar uso de `Button`, `Input`, `Select`, `Textarea`, `Card`, `Badge` e `Table`.

## Prioridade 3: Refatoracao Incremental

Ordem recomendada:

1. `members`: CRUD e detalhe, baixo risco e alto reaproveitamento.
2. `materials`: CRUD simples e bom candidato para componentes comuns.
3. `groups`: grande e central, deve reaproveitar os padroes criados.
4. `kids` e `parking`: fluxos parecidos de cadastro, mensagem e feed.
5. `canteen`: produto, PDV, preparo e historico.
6. `feed` e `minha-conta`: deixar por ultimo por terem mais estado e offline.

## Prioridade 4: Escopo E Permissoes

- [ ] Endurecer autorizacao backend por grupo em escalas.
- [ ] Endurecer autorizacao backend por grupo em materiais.
- [ ] Revisar rotas API que dependem apenas de sessao, sem permissao granular.
- [ ] Manter `Group` como entidade canonica para `team`, `social_project`, `kids` e `parking`.

## Prioridade 5: Offline E Notificacoes

- [ ] Validar pull/push em sequencias longas offline.
- [ ] Revisar conflitos de estoque e fiado.
- [ ] Ampliar eventos persistidos na central de notificacoes.
- [ ] Definir se Web Push entra no MVP ou fica para fase posterior.

## Prioridade 6: Validacao Final

- [ ] Reduzir warnings relevantes de lint.
- [ ] Ampliar testes de rotas criticas.
- [ ] Adicionar testes de regras de permissao.
- [ ] Fazer revisao visual contra `../old/church-hub` apenas onde a paridade ainda importa.
