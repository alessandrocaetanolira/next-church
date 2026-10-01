# TODO — Estabilização de produção, tenants, sessões e branding

Plano obrigatório para os incidentes registrados em 30/09 e 01/10/2026.

Regra: executar as fases na ordem e não marcar uma fase como concluída sem os
critérios de aceite. Os bancos global e de tenants podem ser reconstruídos do
zero se necessário. O `bible.db` deve ser preservado, copiado e validado antes de
qualquer operação; nenhuma rotina deste plano pode migrá-lo, resetá-lo, removê-lo
ou sobrescrevê-lo.

Toda regra nova deve seguir `route → controller → service → repository`.

## Achados confirmados

- [x] Tenant criado pelo painel respondeu `200` e chegou a `ACTIVE`.
- [x] Tenant desativado manteve sessões JWT existentes funcionando.
- [x] Houve `no such column: runId` em produção.
- [x] Houve `P2023 — Conversion failed: input contains invalid characters` em `Member`.
- [x] O TopBar usa `/branding/a-mesa-church/header.png` quando não há logo do tenant.
- [x] Uploads de branding dependem do filesystem local do processo.
- [x] Exclusão de `Member` não revoga automaticamente o `User`.
- [x] Login não valida integralmente `User.deletedAt` e o membro vinculado.
- [x] `jsonError()` não registra contexto suficiente para investigar 500.

## Regras de segurança

- [ ] Nunca executar operação destrutiva em `bible.db`.
- [ ] Antes de qualquer limpeza, copiar `bible.db` para local seguro e verificar SHA-256.
- [ ] Nunca usar `db push` ou `migrate reset` em produção.
- [ ] Toda limpeza de global/tenant deve ser intencional, documentada e executada somente após validar o backup da Bíblia.
- [ ] Não registrar senha, hash, token ou dados sensíveis.
- [ ] SSE/Push não podem ser usados como mecanismo único de autorização.

## Fase 0 — preservar a Bíblia e congelar o release (P0)

- [ ] Parar deploys enquanto o diagnóstico estiver em andamento.
- [x] Copiar `bible.db` para backup externo ao volume de aplicação.
- [x] Executar `PRAGMA integrity_check` na cópia e no original.
- [x] Registrar SHA-256, tamanho, caminho e data da cópia.
- [x] Confirmar que o backup contém as três versões da Bíblia.
- [ ] Registrar commit, Node, Prisma, `CHURCH_DATABASE_DIR`, `process.cwd()` e comando de start.
- [ ] Confirmar quantidade de processos e volumes de produção.
- [ ] Confirmar que `prisma/tenant/migrations` está presente no artefato de deploy.
- [ ] Confirmar que `files/` está em volume persistente.

Aceite: existe uma cópia verificável da Bíblia e nenhum comando de limpeza foi
executado ainda.

### Registro da execução — 01/10/2026

- Backup: `/tmp/church-bible-backup-20261001/bible.db`.
- SHA-256 original e cópia: `729e651e398590c3e52b31f6523c19f0687572af6c65010de501bdd62e4448ee`.
- Integridade: `PRAGMA integrity_check` retornou `ok` no original e na cópia.
- Conteúdo validado: 3 versões (`AA`, `ACF`, `NVI`), 66 livros e 93.315 versos.
- Bancos encontrados no diretório atual: `global.db`, `church_igreja.db`,
  `church_igreja-teste.db` e cópias históricas de tenant.
- Nenhum banco foi removido, resetado ou migrado durante esta execução.

## Inventário inicial — 01/10/2026

- `global.db`: schema atualizado conforme `prisma/global/migrations`.
- `church_igreja.db`: schema atualizado conforme `prisma/tenant/migrations`.
- `church_igreja-teste.db`: falta aplicar `20260930150000_game_score_idempotency`.
- `bible.db`: schema atualizado conforme `prisma/bible/migrations`; não faz parte
  do ciclo de limpeza ou correção dos tenants.
- Existem cópias históricas de `church_igreja-teste.db` em diretórios de backup;
  elas não serão usadas como banco ativo sem uma decisão explícita.
- Próxima decisão pendente: reparar incrementalmente o tenant de teste ou
  reconstruir global/tenants a partir do script inicial, mantendo a Bíblia intacta.

## Fase 1 — escolher reconstrução ou reparo (P0)

### Opção A — reconstrução limpa recomendada para este ambiente

- [x] Manter o backup validado de `bible.db` intocado.
- [x] Parar a aplicação durante a reconstrução local.
- [x] Remover/recriar somente `global.db` e bancos de tenants.
- [x] Manter arquivos de branding somente se estiverem em volume persistente e forem necessários.
- [x] Executar o script inicial essencial.
- [x] Gerar todos os Prisma Clients.
- [x] Aplicar migrations global e tenant.
- [x] Provisionar tenants necessários.
- [x] Seed do admin global e planos.
- [x] Confirmar que o novo ambiente não aponta para arquivos antigos.

### Registro da reconstrução — 01/10/2026

- Backup prévio dos bancos em `/tmp/church-databases-before-reset-20261001`.
- Removidos somente `global.db`, `church_igreja.db` e `church_igreja-teste.db`.
- `bible.db` não foi removido, substituído ou resetado; hash permaneceu
  `729e651e398590c3e52b31f6523c19f0687572af6c65010de501bdd62e4448ee`.
- Executado `npm run db:setup:initial` com sucesso.
- Resultado: `global.db` e `church_igreja-teste.db` novos; `igreja-teste` ficou
  `ACTIVE`; o tenant antigo `igreja` não foi recriado.
- Admin global criado como `admin@church.local`; admin do tenant permanece
  `admin@igreja-teste.com`.
- `global.db` e `church_igreja-teste.db` reportaram `Database schema is up to date`.

### Validação funcional inicial — 01/10/2026

- Testes direcionados de autenticação, segurança, gestão e permissões: **5 arquivos,
  18 testes aprovados**.
- Tenant `igreja-teste`: `ACTIVE` e `active = 1`.
- Admin global: `admin@church.local`.
- Admin do tenant: `admin@igreja-teste.com`, perfil `ADMIN`, com permissões
  `CANTEEN,TASKS,TEAMS,MATERIALS,PASTOR_AREA`.
- Branding inicial presente no banco global, com cores `#ffc608` e `#444243`.
- Próxima validação obrigatória: iniciar sessão, desativar o tenant, confirmar que
  a sessão existente perde acesso e reativar o tenant; repetir o fluxo para usuário
  excluído/desativado. Essa etapa ainda não foi marcada como concluída.

### Correções encontradas na validação — 01/10/2026

- Corrigido o `INSERT` do `FeedRepository`: havia 23 colunas e somente 22
  parâmetros, impedindo publicações no Feed.
- Atualizada a expectativa do teste de convite de desafio para o payload atual,
  incluindo o tipo de jogo no link e os dados completos da notificação.
- Suíte completa após as correções: **44 arquivos, 152 testes aprovados**.
- Build de produção executado após as correções: **aprovado**.
- Lint/typecheck executados no ciclo atual: **aprovados**, conforme validação local.

### Implementação de revogação de sessão — 01/10/2026

- Adicionada a migration global `20261001110000_add_church_auth_version`.
- `Church.authVersion` agora é incrementada ao desativar ou arquivar um tenant.
- O JWT carrega a versão do tenant e é revalidado contra o banco global.
- Sessões com tenant inativo, status diferente de `ACTIVE` ou versão divergente
  recebem `authValid = false`; o proxy redireciona páginas e retorna `401` para APIs.
- O login agora rejeita usuário sem membro vinculado ativo/aprovado quando houver
  vínculo, além de verificar `deletedAt` do usuário.
- Typecheck: aprovado. Testes de auth/security/access-control: **3 arquivos,
  9 testes aprovados**.
- O aceite operacional de sessão já aberta após desativação ainda está pendente e
  deve ser validado antes de marcar a Fase 5 como concluída.
- Build de produção após a alteração de autenticação: **aprovado**.
- Teste operacional concluído: sessão aberta foi invalidada ao desativar `igreja-teste`,
  forçando logout; o tenant foi reativado depois e o login normalizado.
- Fase 5 — revogação de sessão: **aceite concluído**.

### Presets de perfil e permissões efetivas — 01/10/2026

- `MEMBER` recebe Bíblia, Feed, jogos, grupos, notificações e compra na cantina.
- `LEADER` herda `MEMBER` e recebe gestão de grupos, tarefas e materiais no escopo
  das equipes atribuídas; não opera a cantina sem permissão explícita.
- `CANTEEN` herda `MEMBER` e recebe todas as ações da cantina.
- `PASTOR` herda `MEMBER` e recebe membros, aprovação, grupos, tarefas, materiais e
  área pastoral; permissões adicionais podem ser atribuídas individualmente.
- `ADMIN` mantém acesso total ao tenant.
- A composição efetiva é `preset do perfil + permissões persistidas no usuário`,
  respeitando o plano e o escopo de equipes.
- O perfil `CANTEEN` foi incluído na tela de gestão de acesso.
- Testes da matriz após a implementação: **17 aprovados**.

### SSE, Push fallback e sessão de acesso — 01/10/2026

- `permissions.updated` agora retorna a quantidade de listeners SSE alcançados.
- Quando não há listener, o fluxo envia Push genérico “Atualizamos o app”, sem
  incluir permissões no payload; ao abrir o app, a sessão é revalidada no servidor.
- O fallback remove subscriptions Push expiradas e registra logs de entrega.
- O `User.version` é incrementado em alterações de acesso e o JWT revalida perfil,
  permissões, `active` e `deletedAt` quando a versão muda.
- O teste local `prisma/scripts/test-permissions-sse.ts` permite alternar o perfil
  com `TEST_ROLE=MEMBER|ADMIN` e publicar pelo processo Next em `localhost:3000`.
- Teste operacional concluído: app aberto recebeu SSE; app fechado recebeu Push.

### PWA e navegação mobile — 01/10/2026

- Badge numérico do ícone PWA incrementa no Service Worker ao receber Push e é
  sincronizado com notificações não lidas ao abrir o app.
- A modal inicial permite registrar novamente a subscription quando a permissão já
  foi concedida, mas o backend ainda não possui a inscrição.
- Menu de usuário mobile usa Drawer bottom padrão e exige confirmação para logout.
- Avatar do TopBar mobile recebeu margem de segurança à direita.

### Opção B — reparo incremental

- [ ] Fazer inventário dos tenants e `_prisma_migrations`.
- [ ] Fazer backup de cada banco.
- [ ] Aplicar somente migrations pendentes por tenant.
- [ ] Reparar dados inválidos em transação.
- [ ] Revalidar integridade e colunas críticas.

Regra de decisão: se os dados de produção não forem necessários, usar a Opção A;
se forem necessários, usar a Opção B. Em ambas, `bible.db` permanece separado.

## Fase 2 — provisionamento confiável (P0)

- [ ] Fazer `TenantService.createTenant()` usar o mesmo diretório configurado pelo processo web.
- [ ] Alterar a criação no painel para responder `202 Accepted` após persistir o tenant
      com estado `PROVISIONING`, sem bloquear a requisição HTTP durante migrations.
- [ ] Persistir um job de provisionamento no banco global com `runId`, tenant, etapa,
      tentativas, timestamps, erro sanitizado e resultado final.
- [ ] Executar o job em background com transições explícitas `PROVISIONING` → `ACTIVE`
      ou `FAILED`, mantendo retry idempotente para a mesma execução.
- [ ] Garantir que migrations estejam disponíveis no runtime do provisionamento.
- [ ] Registrar stdout/stderr do `prisma migrate deploy` sem expor segredos.
- [ ] Validar todas as migrations esperadas antes de marcar `ACTIVE`.
- [ ] Validar colunas críticas: `runId`, `coverUrl`, `mentions`, `consumerType`, desafios e Push.
- [ ] Manter tenant em `PROVISIONING` ou `FAILED` quando qualquer validação falhar.
- [ ] Testar criação, retry, falha intermediária e publicação atômica.
- [ ] Fazer o script inicial executar global, Bíblia e tenants em ordem explícita.
- [ ] Garantir que o script de tenant nunca selecione `bible.db`.
- [x] Publicar progresso e conclusão em canal SSE exclusivo do admin global,
      separado dos canais SSE de cada tenant.
- [x] Enviar Push e criar notificação persistida para o admin global quando o painel
  estiver fechado ou sem listener SSE.
- [ ] Garantir isolamento: eventos de provisionamento global nunca podem ser entregues
      a usuários de tenants, e eventos de tenant nunca podem chegar ao admin global.
- [x] Adicionar retry manual no painel sem criar jobs duplicados ou tenants duplicados.

Aceite: tenant novo ativo possui schema completo, usuário admin, seed estrutural e
relatório de migrations compatível com o release; o painel recebe a conclusão via
SSE global ou Push fallback, e jobs falhos podem ser retentados com segurança.

### Contrato de canais de eventos do provisionamento

- Canal global: `global-admin:{platformAdminId}`; somente sessões com
  `isPlatformAdmin=true` podem assinar.
- Canal tenant: `{tenantId}:{userEmail}`; nunca aceita eventos destinados ao canal global.
- Payload mínimo: `runId`, `tenantId`, `status`, `step`, `message`, `finishedAt`.
- O payload não deve conter senha, hash, segredo de migration ou caminho absoluto do banco.

Implementação concluída nesta etapa: `ProvisioningJob` persistido, endpoint de criação
respondendo `202`, execução em background, stream `/api/events` separado para
`isPlatformAdmin`, subscriptions Push globais e retry manual com senha reapresentada.
Testes direcionados de notificações e provisionamento: **9 testes aprovados**.
Permanece pendente o teste end-to-end em processo de produção limpo, incluindo
restart durante um job e confirmação de Push no dispositivo do admin global.

### Perguntas estruturais para desafios online

O provisionamento executa um seed idempotente de perguntas de Quiz no banco do
tenant. Isso é necessário porque desafios online são processados no servidor e
não podem depender das perguntas locais armazenadas no Dexie do navegador. Para
tenants existentes, executar `npm run db:seed:tenant-quiz -- <slug>`.

## Fase 3 — corrigir dados inválidos de membros (P0)

- [ ] Identificar as colunas `DateTime` inválidas em `Member`.
- [ ] Criar script `--dry-run` que liste IDs e valores problemáticos.
- [ ] Converter datas válidas para ISO.
- [ ] Converter valores irrecuperáveis para `NULL`, mantendo relatório.
- [ ] Criar backup antes do reparo.
- [ ] Executar reparo por tenant em transação.
- [ ] Validar `member.findMany()` e `member.findFirst()` após o reparo.
- [ ] Rejeitar datas inválidas nos formulários e services.
- [ ] Adicionar testes de datas ISO, inválidas, vazias e nulas.

Aceite: nenhuma consulta de membros retorna `P2023`.

## Fase 4 — revogar usuários excluídos (P0)

- [ ] Separar as ações administrativas “arquivar membro” e “revogar acesso”.
- [ ] Na revogação, atualizar `Member.deletedAt`, `Member.active`, `User.active`, `User.deletedAt` e `User.version` em transação.
- [ ] Validar `User.deletedAt` durante login.
- [ ] Validar membro vinculado, `deletedAt`, `active` e `approved` conforme a política oficial.
- [ ] Comparar a versão do JWT com a versão atual do `User`.
- [ ] Rejeitar JWT emitido antes da revogação.
- [ ] Registrar auditoria com ator, alvo, tenant, motivo e data.
- [ ] Criar reativação explícita e auditada.

Aceite: usuário excluído não cria sessão e sessão antiga falha na próxima requisição.

## Fase 5 — revogar sessões de tenant desativado (P0)

- [ ] Adicionar `Church.authVersion` no schema global.
- [ ] Gravar a versão no JWT durante login.
- [ ] Criar validador central para `active`, `status`, `deletedAt` e `authVersion`.
- [ ] Aplicar o validador em páginas, APIs, SSE, jogos e sync.
- [ ] Incrementar `authVersion` ao desativar, arquivar ou reativar tenant.
- [ ] Fazer `updateTenant()` manter `status` e `active` coerentes.
- [ ] Limpar sessão online ao receber 401 por revogação.
- [ ] Preservar fila offline até decisão explícita de retry ou descarte.

Aceite: após desativar `igreja`, uma sessão antiga não acessa nenhuma API protegida.

## Fase 6 — branding seguro por tenant (P1)

- [ ] Remover o fallback fixo `/branding/a-mesa-church/header.png`.
- [ ] Criar uma constante única para o branding padrão do Church App.
- [ ] Definir comportamento de tenant sem logo: padrão oficial ou nome/iniciais.
- [ ] Aplicar o mesmo fallback em TopBar, Sidebar, Loading, login e PWA.
- [ ] Limpar o estado de logo imediatamente ao trocar de tenant.
- [ ] Isolar localStorage por identificador estável do tenant.
- [ ] Não exibir logo antigo enquanto o branding está carregando.
- [ ] Validar existência do arquivo antes de exibir URL persistida.
- [ ] Garantir volume persistente para `files/` ou migrar para armazenamento externo.
- [ ] Testar restart, rebuild, troca de tenant e logo ausente.
- [ ] Validar cache do navegador e Service Worker após troca de branding.

Aceite: tenant sem upload nunca mostra imagem de outro tenant; logo enviado
permanece após restart e deploy conforme a política de armazenamento.

## Fase 7 — permissões, Feed e Cantina (P1)

- [ ] Gerar editor administrativo a partir de `PERMISSION_CATALOG`.
- [ ] Decidir se `CANTEEN` será perfil real ou somente permissões.
- [ ] Unificar `groups:*` e `teams:*`.
- [ ] Fazer navegação e policies usarem a mesma matriz.
- [ ] Definir `visibility = public` no servidor quando ausente.
- [ ] Alinhar `feed:create`, `feed:publish` e `feed:moderate`.
- [ ] Carregar grupos e membros do Feed independentemente.
- [ ] Exibir 403 real no frontend.
- [ ] Separar permissões de consultar, comprar, operar, produtos e financeiro na Cantina.
- [ ] Adicionar testes para cada perfil, módulo, ação, plano e escopo.

Aceite: link, tela e API produzem a mesma decisão para o mesmo usuário.

## Fase 8 — observabilidade (P1/P2)

- [ ] Adicionar ID de correlação por requisição.
- [ ] Registrar rota, método, tenant, usuário normalizado e decisão de autorização.
- [ ] Registrar código Prisma e `meta` sem dados sensíveis.
- [ ] Diferenciar 401, 403, 404, 409, 422 e 500 nos logs.
- [ ] Registrar versão de schema e migrations no deploy.
- [ ] Alertar tenant ativo com schema atrasado.
- [ ] Auditar revogações, permissões, tenants e provisionamento.
- [ ] Avaliar Redis/pub-sub antes de múltiplas instâncias SSE.

## Fase 9 — gates obrigatórios antes de liberar produção

- [ ] Backup e SHA-256 da Bíblia conferidos.
- [ ] Prisma Clients gerados.
- [ ] Global migrations aplicadas.
- [ ] Tenant migrations aplicadas sem falhas.
- [ ] Nenhuma migration executada na Bíblia pela rotina de tenants.
- [ ] Typecheck concluído.
- [ ] Lint concluído.
- [ ] Testes unitários e integração concluídos.
- [ ] Build concluído.
- [ ] Service Worker gerado.
- [ ] Login global e tenant validados.
- [ ] Tenant desativado com sessão antiga validado.
- [ ] Membros, Feed, Cantina, Push e SSE validados.
- [ ] Branding com e sem upload validado.
- [ ] Backup/relatório armazenados fora do volume efêmero.

## Fase 10 — aceite final

- [ ] Criar tenant pelo painel.
- [ ] Confirmar `PROVISIONING` durante a criação.
- [ ] Confirmar `ACTIVE` somente após schema completo.
- [ ] Confirmar logo padrão correto sem upload.
- [ ] Confirmar login e operação normal.
- [ ] Desativar tenant e confirmar bloqueio imediato.
- [ ] Excluir membro e confirmar revogação.
- [ ] Reiniciar processo e confirmar persistência de branding.
- [ ] Repetir smoke tests após novo build/deploy.

## Critério final

- [ ] Nenhum tenant ativo está atrás do schema do release.
- [ ] Tenant desativado não aceita sessões antigas.
- [ ] Membro excluído não autentica.
- [ ] Nenhum `P2023` ocorre em `Member`.
- [ ] Nenhum tenant exibe branding de outro tenant.
- [ ] Uploads sobrevivem ao ciclo de deploy definido.
- [ ] Permissões, navegação e APIs estão alinhadas.
- [ ] Erros de produção possuem correlação e causa identificável.
- [ ] `bible.db` permanece intacto e validado.

Toda alteração deve indicar neste documento a fase e o item atendido, além da
evidência correspondente (teste, relatório, migration ou aceite manual).
