# Tenant Separation TODO

## Decisoes Arquiteturais

- Usuarios da igreja ficam exclusivamente no banco do tenant.
- O banco global resolve a igreja e guarda apenas metadados da plataforma.
- `User.passwordHash` e a credencial canonica. `Member` nao deve ser armazenamento definitivo de senha.
- `slug` e identificador publico; `databaseKey` imutavel localiza o SQLite fisico.
- A aplicacao nunca cria banco nem executa DDL durante login ou requisicoes comuns.
- `migrate dev` cria migrations em bancos de referencia; `migrate deploy` aplica migrations; `db push` e somente para prototipos descartaveis.

## Arquitetura Alvo

```txt
global.db
  Church
  PlatformAdmin (separado de usuarios da igreja)

church_<databaseKey>.db
  User, Member, Product, Sale, CreditTransaction, Notification
  Task, Team, TeamJoinRequest, Material, Group, GroupMember
  FundraisingGoal, ChildProfile, ParkingSpot, FeedPost
  QuizQuestion, QuizAttempt, EngagementProfile
  Book, Chapter, Verse
```

```txt
prisma/
  global/schema.prisma
  global/migrations/
  tenant/schema.prisma
  tenant/migrations/
  scripts/migrate-tenants.ts
  databases/global.db
  databases/church_<databaseKey>.db
```

Clients gerados: `src/generated/prisma-global` e `src/generated/prisma-tenant`.

## Fase 0: Contencao Imediata

Objetivo: impedir novos bancos vazios, perda de dados por testes e schema alterado em runtime.

- [x] Testes usam diretorio temporario exclusivo por suite.
- [x] Nenhum teste acessa ou remove `prisma/databases/global.db`.
- [x] A factory aceita diretorio de dados injetavel em testes.
- [x] `getTenantClient` deixa de copiar `church_template.db` ou criar arquivo vazio.
- [x] Banco ausente retorna erro de dominio controlado, sem gerar `P2021`.
- [x] Slug e `databaseKey` possuem validacao unica contra `/`, `..`, `\\` e path traversal.
- [x] Caminho resolvido permanece dentro do diretorio autorizado.
- [x] O template SQLite de zero bytes deixa de ser usado.
- [ ] DDL em runtime fica apenas como compatibilidade temporaria ate a migration equivalente existir.

Aceite:

- [x] A suite nao altera tamanho, hash ou data dos bancos reais.
- [x] Tenant inexistente nao cria arquivo.
- [x] Arquivo vazio ou schema invalido retorna erro controlado.
- [x] Slug invalido e rejeitado antes de abrir o datasource.

## Fase 1: Inventario, Backup E Contrato

Objetivo: tratar os bancos atuais como estado heterogeneo antes de qualquer limpeza.

- [ ] Documentar a matriz completa `modelo -> schema`.
- [x] Corrigir divergencias de nomes: `QuizAttempt` e nao `GameAttempt`, incluindo `EngagementProfile`, `Book`, `Chapter` e `Verse`.
- [x] Inventariar tabelas, colunas, indices e contagens de `global.db` e de todos os `church_*.db`.
- [x] Identificar bancos sem `_prisma_migrations` e schemas atrasados.
- [x] Resolver arquivos orfaos (`church_ig2.db` e `church_ig3.db`) antes da baseline.
- [x] Registrar checksum e executar `PRAGMA integrity_check` em cada banco.
- [x] Criar backup consistente de SQLite, incluindo WAL/SHM quando aplicavel.
- [x] Testar restore antes da primeira alteracao destrutiva.
- [x] Adicionar `databaseKey` imutavel a `Church`.
- [x] Definir estados `PROVISIONING`, `ACTIVE`, `FAILED` e `ARCHIVED`.
- [x] Registrar erro, inicio da tentativa e data de conclusao do provisionamento.
- [ ] Definir politica de alteracao de slug sem renomear o banco.
- [x] Criar fixtures temporarias com `igreja-teste`, `ig2` e `ig3`.

Aceite:

- [x] Existe relatorio por banco e contrato modelo -> banco.
- [x] Todo banco possui backup restauravel.
- [x] Tres igrejas podem ser recriadas sem usar bancos reais.

## Fase 2: Schemas, Clients E Baseline

Objetivo: separar os contratos Prisma sem reaplicar ou apagar dados existentes.

- [x] Criar `prisma/global/schema.prisma` somente com modelos globais.
- [x] Criar `prisma/tenant/schema.prisma` somente com modelos de tenant.
- [x] Adicionar `passwordHash` a `User` no tenant.
- [x] Configurar outputs dos dois clients.
- [x] Criar migrations iniciais separadas.
- [x] Criar procedimento de baseline para bancos atuais sem `_prisma_migrations`.
- [x] Validar baseline em copias restauradas antes dos bancos atuais.
- [x] Criar `prisma:generate`.
- [x] Criar scripts separados de `db:global:migrate:dev` e `db:tenant:migrate:dev`.
- [x] Criar `db:global:migrate:deploy` e `db:tenant:migrate:deploy`.
- [ ] Proibir `db push` como atualizacao de banco real.

Aceite:

- [x] O client global nao expoe modelos de tenant.
- [x] O client tenant nao expoe `Church`.
- [x] Banco global novo contem somente tabelas globais.
- [x] Tenant novo contem somente tabelas de tenant.
- [ ] Baseline preserva dados e cria historico valido.

## Fase 3: Orquestrador De Migrations

Objetivo: migrar todos os tenants com backup, lock, diagnostico e retomada.

- [x] Criar `prisma/scripts/migrate-tenants.ts` baseado no cadastro global.
- [x] Resolver sempre por `databaseKey`, nunca por caminho arbitrario.
- [ ] Incluir `ACTIVE`, `PROVISIONING` e inativos nao arquivados por padrao.
- [ ] Excluir `ARCHIVED` por padrao, com opcao explicita.
- [x] Implementar `--dry-run`, filtro de tenant e lotes/canario.
- [x] Implementar lock contra execucoes simultaneas.
- [x] Fazer preflight de arquivo e integridade.
- [x] Fazer backup antes de cada migration.
- [x] Executar `prisma migrate deploy` no schema tenant.
- [x] Registrar sucesso, falha e duracao por tenant.
- [x] Continuar apos falha isolada e terminar com exit code diferente de zero.
- [x] Permitir retry direcionado por tenant pendente ou com falha.

Aceite:

- [x] `--dry-run` nao altera bancos.
- [x] Tres tenants sao reportados individualmente.
- [x] Falha em um tenant nao oculta os demais.
- [x] Segunda execucao e idempotente.
- [x] Tenant inativo reativavel nao fica com schema antigo.

## Fase 4: Provisionamento Resiliente

Objetivo: nunca publicar igreja ativa antes de o banco estar pronto.

- [x] Criar registro global como `PROVISIONING` e inativo.
- [x] Reservar e persistir `databaseKey`.
- [x] Criar SQLite temporario dentro do diretorio autorizado.
- [x] Aplicar `migrate deploy` tenant.
- [x] Criar admin com `User.passwordHash`.
- [x] Executar seed idempotente.
- [x] Validar tabelas, admin e integridade.
- [x] Renomear atomicamente para o arquivo definitivo.
- [x] Marcar `ACTIVE` somente apos validacao completa.
- [x] Em falha, marcar `FAILED`, registrar o erro e limpar temporarios.
- [x] Permitir retry sem duplicar igreja, admin ou seed.
- [x] Atualizar `TenantService`, `provision.ts`, seeds e scripts.
- [x] Fechar client antes de arquivar/mover SQLite.
- [x] Manter `ARCHIVED` para auditoria, sem hard delete imediato.

Aceite:

- [ ] Falha intermediaria nunca deixa igreja ativa.
- [ ] Retry e idempotente.
- [ ] Todo tenant ativo possui arquivo, schema atual e admin.
- [x] Arquivamento fecha o client antes de mover o arquivo.

## Fase 5: Factory E Ciclo De Conexoes

- [x] Usar clients tipados e caches separados para global e tenants.
- [x] Resolver tenant autenticado por `Church` validada e `databaseKey`; manter `tenantSlug` separado para URLs publicas.
- [ ] Configurar diretorio de dados por variavel de ambiente absoluta.
- [ ] Adicionar `disconnectTenant(databaseKey)` e limpeza de cache.
- [ ] Definir limite, expiracao ou LRU para clients de tenant.
- [ ] Mapear banco ausente, schema atrasado e SQLite corrompido para erros de dominio.
- [ ] Verificar versao do schema antes de liberar operacoes.

Aceite:

- [ ] Tenants diferentes nunca compartilham datasource.
- [ ] Cache nao cresce indefinidamente.
- [ ] Excecoes Prisma brutas nao chegam ao usuario.

## Fase 6: Credenciais E Autenticacao

- [ ] Definir cadastro pendente com `User` inativo ou entidade de convite.
- [ ] Copiar hashes de `GlobalUser` para `User.passwordHash` de forma idempotente.
- [ ] Usar `Member.passwordHash` apenas como fonte transitoria auditada.
- [ ] Detectar hashes ausentes e conflitos antes da troca.
- [x] Alterar `src/auth.ts` para consultar `Church` no global e `User` no tenant.
- [x] Bloquear igreja nao ativa e usuario inativo ou sem `passwordHash`.
- [x] Atualizar aprovacao pastoral e liberacao de acesso para nao criar `GlobalUser`.
- [ ] Normalizar email e slug.
- [ ] Definir invalidacao de sessao por mudanca de `version`, role, permissoes ou status.

Aceite:

- [ ] Usuarios atuais continuam autenticando.
- [x] Mesmo email possui senha, role e permissoes independentes em tres tenants.
- [ ] Tenant inexistente nao cria banco.
- [ ] Alteracoes de acesso invalidam sessao conforme a politica definida.

## Fase 7: Rotas E DDL Em Runtime

- [ ] Revisar todas as chamadas de `getGlobalClient` e `getTenantClient`.
- [ ] Remover `new PrismaClient` fora de factories e scripts controlados.
- [ ] Revisar membros, pastoral, cantina, equipes, grupos, materiais, kids, estacionamento, feed, quiz, Biblia, sync e branding.
- [x] Substituir `ensureTenantSchemaExtensions` e `ensureGlobalSchemaExtensions` por migrations.
- [ ] Remover `$executeRawUnsafe` usado para evolucao estrutural.
- [ ] Exigir sessao e tenant resolvido nas rotas operacionais.
- [ ] Documentar e testar rotas mistas global + tenant.

Aceite:

- [x] Nenhuma requisicao comum executa `CREATE TABLE` ou `ALTER TABLE`.
- [ ] Membro, produto e material criados em um tenant nao aparecem nos outros.

## Fase 8: Testes Com Tres Igrejas

- [ ] Criar helper que provisiona global e tres tenants em diretorio temporario.
- [ ] Reescrever factory/auth tests para exercitar o fluxo real.
- [ ] Testar mesmo email com tres senhas, roles e permissoes diferentes.
- [ ] Testar tenant inativo, ausente, vazio, atrasado e arquivado.
- [ ] Testar slug invalido e path traversal.
- [ ] Testar isolamento de leitura e escrita.
- [ ] Testar migration em lote com sucesso, falha parcial e retry.
- [ ] Testar provisionamento, falha intermediaria, retry e arquivamento.
- [ ] Verificar que bancos reais permanecem inalterados.

Comandos de aceite:

```bash
npm run prisma:generate
npm run db:global:migrate:deploy
npm run db:tenant:migrate:all -- --dry-run
npm run db:tenant:migrate:all
npx tsc --noEmit
npm run lint
npm run build
npm test
```

## Fase 9: Limpeza E Operacao

- [ ] Confirmar que nenhum fluxo usa `GlobalUser`.
- [ ] Remover `GlobalUser` apos migracao e validacao das credenciais.
- [ ] Remover `Member.passwordHash` quando nao houver pendencias.
- [ ] Remover schema Prisma misto e template vazio.
- [ ] Remover tabelas globais de tenants e tabelas de tenant do global somente apos backup validado.
- [ ] Criar reconciliacao entre registros globais e arquivos fisicos.
- [ ] Detectar arquivo orfao, tenant sem arquivo e schema divergente.
- [ ] Atualizar `docs/operations.md` com migrations, backup, restore, retry e arquivamento.
- [ ] Monitorar falhas de migration, schema atrasado e banco ausente.

## Criterio De Conclusao

- [ ] Testes nao acessam bancos reais.
- [ ] Nenhuma requisicao cria banco ou executa DDL.
- [ ] Global e tenant possuem schemas e clients distintos.
- [ ] Todos os bancos possuem baseline e historico de migrations valido.
- [ ] Usuarios autenticam exclusivamente no tenant.
- [ ] Provisionamento e migration em lote sao idempotentes e retomaveis.
- [x] Tres igrejas comprovam isolamento de dados e credenciais.
- [ ] Limpeza possui backup restauravel e validacao registrada.
