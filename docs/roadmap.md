# Roadmap

## Prioridade 1: Estabilizacao

- [x] Confirmar `npm run build`.
- [ ] Corrigir testes de sync com mocks para `$queryRawUnsafe`, `$executeRawUnsafe` e transacoes Prisma.
- [ ] Unificar configuracao PostCSS, mantendo apenas uma fonte efetiva.
- [ ] Alinhar versoes de `next`, `react` e `eslint-config-next`.
- [ ] Revisar o `AGENTS.md`, pois `node_modules/next/dist/docs/` nao existe nesta instalacao.

## Prioridade 2: Separacao Correta De Tenants

Objetivo: manter o banco global apenas para resolver a igreja/plataforma e autenticar usuarios normais dentro do banco do tenant.

O plano detalhado e a fonte canonica desta prioridade estao em `docs/tenant-separation-todo.md`. A ordem obrigatoria e:

1. Conter riscos em testes, factory e criacao de bancos vazios.
2. Inventariar, fazer backup e definir o contrato de armazenamento.
3. Separar schemas/clients e criar baseline dos bancos existentes.
4. Implementar o orquestrador de `migrate deploy` para todos os tenants.
5. Tornar provisionamento, factory e ciclo de conexoes resilientes.
6. Migrar credenciais e mover autenticacao para `User.passwordHash` no tenant.
7. Revisar rotas e remover DDL executado durante requisicoes.
8. Validar isolamento e falhas com tres igrejas temporarias.
9. Remover estruturas antigas somente apos backup validado.

Regra operacional:

- `migrate dev` cria migrations somente em bancos locais de referencia.
- `migrate deploy` aplica migrations no global e nos tenants.
- `db push` nao atualiza bancos reais.

## Prioridade 3: UI Reutilizavel

- [x] Criar `src/components/common`.
- [x] Implementar `PageShell`, `PageHeader`, `EmptyState`, `LoadingState`.
- [ ] Implementar `ErrorState`.
- [x] Implementar `SearchField` e `ConfirmDeleteDialog`.
- [ ] Implementar `FilterChips` e `ActionMenu`.
- [ ] Implementar `AppImage` para substituir `<img>` em telas de aplicacao.
- [ ] Padronizar uso de `Button`, `Input`, `Select`, `Textarea`, `Card`, `Badge` e `Table`.

## Prioridade 4: Refatoracao Incremental

Ordem recomendada:

1. `members`: CRUD e detalhe, baixo risco e alto reaproveitamento.
2. `materials`: CRUD simples e bom candidato para componentes comuns.
3. `groups`: grande e central, deve reaproveitar os padroes criados.
4. `kids` e `parking`: fluxos parecidos de cadastro, mensagem e feed.
5. `canteen`: produto, PDV, preparo e historico.
6. `feed` e `minha-conta`: deixar por ultimo por terem mais estado e offline.

## Prioridade 5: Escopo E Permissoes

- [ ] Endurecer autorizacao backend por grupo em escalas.
- [ ] Endurecer autorizacao backend por grupo em materiais.
- [ ] Revisar rotas API que dependem apenas de sessao, sem permissao granular.
- [ ] Manter `Group` como entidade canonica para `team`, `social_project`, `kids` e `parking`.

## Prioridade 6: Offline E Notificacoes

- [ ] Validar pull/push em sequencias longas offline.
- [ ] Revisar conflitos de estoque e fiado.
- [ ] Ampliar eventos persistidos na central de notificacoes.
- [ ] Definir se Web Push entra no MVP ou fica para fase posterior.

## Prioridade 7: Validacao Final

- [ ] Reduzir warnings relevantes de lint.
- [ ] Ampliar testes de rotas criticas.
- [ ] Adicionar testes de regras de permissao.
- [ ] Fazer revisao visual contra `../old/church-hub` apenas onde a paridade ainda importa.
