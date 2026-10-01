# Análise de autenticação, tenants e permissões

Data da análise: 30/09/2026

Commit analisado: `fcba8e3` (`main`)

Escopo: autenticação, sessões, exclusão de membros, bloqueio de tenants, perfis, permissões, navegação e migrations dos bancos por tenant.

> Esta análise foi feita de forma estática e com consultas locais somente de leitura. Nenhum código, schema ou banco foi alterado. O banco compartilhado da Bíblia não foi acessado nem modificado.

## Resumo executivo

Foram confirmadas duas falhas de revogação de acesso com impacto de segurança:

1. **Excluir um membro não exclui nem desativa o usuário de autenticação.** A exclusão atual marca apenas `Member.deletedAt`. O registro `User` vinculado permanece ativo, com senha válida, e continua autenticando.
2. **Desabilitar um tenant bloqueia novos logins, mas não invalida sessões já emitidas.** O status do tenant é consultado somente durante o login por credenciais. Depois disso, o JWT continua sendo aceito sem nova consulta ao banco global.
3. **O login não verifica `User.deletedAt` nem o estado do membro vinculado.** Mesmo um usuário logicamente excluído pode autenticar se `active = true`, e um membro excluído, inativo ou não aprovado continua acessando se o `User` permanecer ativo.

O modelo de permissões também está fragmentado entre plano, perfil, permissão granular, vínculo do membro e escopo de grupo/equipe. A tela administrativa não apresenta todo o catálogo que as APIs reconhecem. Isso gera situações em que um link aparece, mas a operação retorna 403, ou em que uma permissão é concedida e não produz o efeito esperado.

### Prioridade dos achados

| Prioridade | Achado | Impacto |
|---|---|---|
| P0 | Exclusão de `Member` não revoga o `User` | Usuário excluído continua fazendo login |
| P0 | Tenant inativo não invalida JWT existente | Usuários continuam acessando tenant desabilitado |
| P0 | Login não verifica `User.deletedAt` nem estado do membro | Contas logicamente removidas podem autenticar |
| P0 | Bancos de tenant podem ficar atrás do Prisma Client | Rotas como membros e feed retornam erro 500 |
| P1 | Alteração de acesso depende de SSE e atualização do cliente | Permissões antigas permanecem na sessão |
| P1 | Editor de permissões é incompleto | Administrador não consegue conceder várias permissões válidas |
| P1 | Navegação e políticas usam regras diferentes | Links visíveis sem acesso ou links ocultos com permissão concedida |
| P1 | Algumas políticas exigem perfil e permissão simultaneamente | Permissão isolada não libera a ação e a UI não explica o motivo |
| P2 | SSE é somente em memória | Eventos podem se perder com múltiplas instâncias/processos |

## 1. Por que o usuário excluído ainda faz login

### Fluxo atual confirmado

O endpoint de exclusão passa por:

`DELETE /api/members/[id]` → `deleteMember()` → `MembersService.remove()` → `MembersRepository.softDelete()`.

O último passo executa apenas uma atualização no membro:

```ts
this.prisma.member.update({
  where: { id },
  data: { deletedAt: new Date(), updatedAt: new Date() },
});
```

Não há, nesse fluxo:

- alteração em `User.active`;
- preenchimento de `User.deletedAt`;
- remoção ou bloqueio de `passwordHash`;
- incremento de `User.version`;
- revogação da sessão JWT existente;
- evento que obrigue o usuário excluído a sair.

Na autenticação, o usuário é buscado por e-mail e somente estas condições são avaliadas:

```ts
if (!user || !user.active || !user.passwordHash) return null;
```

`user.deletedAt` não é verificado. O membro vinculado é carregado apenas para obter `teamIds`; seu `deletedAt`, `active` e `approved` também não são validados.

### Conclusão

A exclusão atual significa apenas “ocultar o cadastro de membro”, não “revogar acesso”. Como o sistema apresenta a ação como exclusão do usuário/membro, o comportamento é perigoso e diferente da expectativa administrativa.

### Correção recomendada

A operação precisa ter uma regra de negócio explícita e atômica:

1. Em uma transação, marcar o membro como excluído/inativo.
2. Localizar o `User` por `linkedMemberId` e, como fallback controlado, por e-mail.
3. Definir `User.active = false`, `User.deletedAt = agora` e incrementar `User.version`.
4. Fazer todas as APIs rejeitarem imediatamente JWTs cuja versão não corresponda ao banco ou cujo usuário esteja inativo/excluído.
5. Registrar auditoria de quem revogou o acesso e quando.

Se existir necessidade de apenas arquivar o cadastro sem bloquear o acesso, devem existir duas ações distintas e claramente nomeadas: **arquivar membro** e **revogar acesso**. A ação “excluir” não deve deixar uma credencial ativa por padrão.

## 2. Por que usuários de tenant desabilitado continuam ativos

### O que já funciona

No login por credenciais, `src/auth.ts` consulta o banco global e bloqueia a autenticação quando:

- a igreja não existe;
- `Church.active` é falso;
- `Church.status` existe e é diferente de `ACTIVE`.

Portanto, uma **nova tentativa de login** deveria ser recusada depois da desativação.

### Onde está a falha

O projeto usa sessão `jwt`. Depois que o token é emitido:

- o callback de sessão apenas copia os dados do JWT;
- o `proxy.ts` confia em `auth()` e no conteúdo do token;
- não há nova consulta a `Church.active`/`Church.status` em cada sessão ou requisição protegida;
- `TenantService.updateTenant(..., { active: false })` não invalida tokens;
- não existe uma versão de acesso do tenant gravada e comparada com o JWT.

Assim, a desativação bloqueia novas autenticações, mas uma sessão já aberta pode continuar válida até expirar ou até o logout. Se o banco do tenant continuar disponível, as APIs continuam conseguindo operar nele.

No arquivamento completo, o arquivo SQLite é movido. Isso interrompe várias operações por indisponibilidade do banco, mas ainda não torna o token inválido por si só. Já a simples alteração de `active` deixa o banco no lugar e evidencia ainda mais o problema.

### Correção recomendada

Adicionar ao banco global uma versão de autenticação/acesso do tenant, por exemplo `Church.authVersion`, e copiá-la para o JWT no login. Ao desativar, arquivar ou reativar um tenant:

1. incrementar `authVersion`;
2. validar `active`, `status` e `authVersion` em um ponto central das requisições autenticadas;
3. recusar a sessão e orientar o cliente a limpar os caches de autenticação;
4. garantir a mesma validação em páginas, APIs, SSE e canais de jogos.

Uma consulta ao banco global em toda requisição é a opção mais simples e imediatamente consistente. Se o custo se tornar relevante, pode-se usar cache curto com invalidação, mas o banco global deve continuar sendo a fonte de verdade.

## 3. Sessões e atualização de permissões

No login, `role`, `permissions`, `tenantId`, `linkedMemberId`, `teamIds`, plano e `version` são copiados para o JWT. Durante o uso normal, esses valores não são lidos novamente do banco. A recarga ocorre apenas quando o callback JWT recebe `trigger === 'update'`.

Hoje a alteração de acesso:

1. atualiza o `User` no banco;
2. envia um evento SSE `permissions.updated`;
3. o navegador recebe o evento e chama `useSession().update()`;
4. o callback JWT recarrega papel e permissões.

Há quatro fragilidades:

- `MemberAccessRepository.saveUser()` não incrementa `User.version` ao mudar papel, permissões ou senha;
- `User.version` é colocado no token, mas não é comparado com o valor atual do banco para revogar sessões;
- o evento de permissão não é uma fonte de verdade persistida;
- o broker SSE é mantido apenas em memória e, em produção, não é compartilhado entre processos ou instâncias.

Se a atualização ocorrer na instância A e a conexão SSE estiver na instância B, o evento pode não chegar. Se o dispositivo estiver desconectado, o evento também pode ser perdido. A revalidação ao retornar para a página reduz o problema, mas não oferece revogação imediata nem garantia de consistência.

### Modelo recomendado

- Incrementar `User.version` em toda alteração de perfil, permissões, senha, atividade ou exclusão.
- Comparar a versão do JWT com o banco em todas as operações protegidas, ou por cache de curtíssima duração com invalidação.
- Tratar SSE como aceleração da atualização da interface, nunca como mecanismo de autorização.
- Em ambiente com mais de uma instância, usar Redis/pub-sub ou outro broker compartilhado para os eventos em tempo real.

## 4. Perfis e regras atuais

O acesso real é resultado da combinação de:

`plano do tenant` + `perfil` + `permissão granular` + `vínculo com Member` + `escopo de grupo/equipe`.

| Perfil | Comportamento atual | Pontos de atenção |
|---|---|---|
| `ADMIN` | Passa por todas as permissões granulares e também ignora limitações de plano em `hasPlanFeature()` | Alterar checkboxes de permissão de um admin não restringe seu acesso; isso precisa estar explícito na UI |
| `PASTOR` | Recebe implicitamente ações `view` e `manage_access`; outras ações dependem de permissão explícita | Algumas políticas ainda exigem o perfil PASTOR além da permissão, criando regras duplicadas |
| `LEADER` | Depende de permissões explícitas e, em grupos/equipes, de `linkedMemberId` e vínculo/escopo | Conceder a permissão sem vincular corretamente o membro/equipe não libera a ação |
| `MEMBER` | Depende de permissões explícitas; recebe um conjunto básico no cadastro/aprovação | O padrão atual inclui leitura do feed, Bíblia, jogos, grupos e notificações, mas não inclui publicar/comentar |
| `CANTEEN` | É aceito em algumas políticas da cantina | Não está entre os perfis permitidos pelo serviço/tela de acesso nem no tipo de usuário do frontend; hoje é um perfil praticamente inalcançável |

Permissões padrão atuais para membro:

```text
feed:view
bible:view
games:view
groups:view
groups:request
feed:share
notifications:view
```

## 5. Divergências no catálogo e na tela de permissões

O catálogo central reconhece mais permissões do que a interface administrativa oferece. Entre as permissões ausentes do editor estão:

- `groups:view`, `groups:create`, `groups:delete`, `groups:manage_access`, `groups:request`;
- todas as permissões `teams:*`;
- `tasks:view`, `tasks:delete`, `tasks:export`;
- `materials:delete`, `materials:request`, `materials:export`;
- `canteen:update`, `canteen:delete`, `canteen:export`;
- ações de criação, edição, exclusão e exportação da área pastoral;
- todas as permissões de infantil, estacionamento e projetos sociais;
- `feed:moderate` e `feed:delete`;
- `games:view`;
- `notifications:view` e `notifications:update`;
- `settings:view`.

Consequência: uma política pode exigir uma chave válida que o administrador não consegue conceder pela tela.

Outras inconsistências confirmadas:

- as políticas de equipes consultam `groups:*`, embora exista o módulo `teams` no catálogo;
- `/members` na navegação aceita somente ADMIN/PASTOR, mesmo que outro perfil receba `members:view`;
- projetos sociais, infantil e estacionamento têm pontos de navegação baseados apenas no plano, enquanto suas APIs usam permissões de ação;
- o link da cantina aparece com qualquer uma entre várias permissões, mas cada aba/operação possui exigências mais restritas;
- produtos e extrato da cantina exigem simultaneamente uma permissão e perfil ADMIN/PASTOR/CANTEEN;
- o papel `CANTEEN` exigido nessas políticas não pode ser atribuído pela tela atual.

### Recomendação

Gerar o editor de permissões diretamente a partir de `PERMISSION_CATALOG`, com metadados de rótulo e descrição em uma única fonte. A mesma fonte deve alimentar formulário administrativo, navegação, políticas de API, documentação e testes de matriz de acesso.

## 6. Caso específico: publicação no feed

A política de criação escolhe a permissão desta forma:

| Conteúdo enviado | Exigência atual |
|---|---|
| Publicar em nome de grupo | `feed:share` + ser gestor do grupo |
| Compartilhamento (`share = true`) | `feed:share` |
| Aviso, visibilidade não pública ou post fixado | `feed:moderate` |
| Publicação pública comum | `feed:create` ou `feed:publish` |

Problemas encontrados:

1. A interface chama `feed:publish` de “publicar avisos”, mas avisos exigem `feed:moderate` no servidor.
2. Se um cliente omitir `visibility`, a expressão `body.visibility !== 'public'` será verdadeira. Uma publicação comum pode ser classificada como conteúdo moderado e retornar 403.
3. O carregamento conjunto das opções do feed usa `Promise.all()` para grupos e membros. Se um membro puder publicar, mas não possuir `members:view`, a consulta de membros falha e derruba também as opções de grupos.
4. A interface converte falhas de publicação em uma mensagem genérica, dificultando distinguir 403 de 500.

Isso oferece uma explicação concreta para um membro com permissão aparente ainda não conseguir publicar, mesmo após novo login.

## 7. Erro 500 ao ver membros ou publicar

Uma negativa de autorização feita pelas políticas do projeto deve resultar em **403**, não em 500.

| Status | Significado esperado |
|---|---|
| 401 | Sessão ausente/inválida |
| 403 | Plano, perfil, permissão ou escopo insuficiente |
| 404 | Registro não encontrado |
| 409 | Conflito de dados |
| 422 | Validação do formulário |
| 500 | Erro interno, Prisma, SQLite, schema ou código inesperado |

Portanto, o erro 500 observado em outro tenant provavelmente não é uma simples falta de permissão.

### Hipótese forte e reproduzível: migration ausente

`MembersRepository.list()` chama `prisma.user.findMany()` sem `select`. O Prisma Client atual tenta ler todos os campos escalares do modelo, inclusive `coverUrl`. Se o banco do tenant ainda não recebeu a migration `20260930103000_user_cover_url`, a listagem pode falhar com coluna inexistente e retornar 500.

O feed lê e grava explicitamente `FeedPost.mentions`. Sem `20260930140000_feed_mentions`, listar ou publicar também pode retornar 500.

No banco local `church_igreja-teste.db`, a verificação somente de leitura encontrou migrations aplicadas até `20260927160000_game_challenge_invites`. Estão ausentes, nesse banco local, as migrations atuais:

- `20260930100000_sale_consumer_type`;
- `20260930103000_user_cover_url`;
- `20260930120000_game_challenge_runtime`;
- `20260930123000_member_feed_share`;
- `20260930130000_memory_challenge_runtime`;
- `20260930140000_feed_mentions`;
- `20260930150000_game_score_idempotency`.

Isso não prova o estado da produção, mas confirma que o repositório pode ser executado com tenant desatualizado.

### Por que isso pode acontecer em tenant “novo”

O provisionamento atual executa `prisma migrate deploy` em um arquivo temporário e só publica o tenant após criar o administrador e executar o seed. Um tenant realmente criado por esta versão deveria receber todas as migrations existentes no release.

Ainda assim, ele pode ficar atrás quando:

- foi criado por uma versão anterior e só parece novo do ponto de vista operacional;
- o deploy atualizou o código, mas não executou `db:tenant:migrate:all` nos bancos existentes;
- o processo usa um `CHURCH_DATABASE_DIR` diferente daquele migrado manualmente;
- aplicação e comando de migration apontam para volumes diferentes;
- o release que provisionou o tenant não continha as migrations atuais.

O script `start` executa apenas `next start`; ele não aplica migrations automaticamente. O `postinstall` apenas gera os Prisma Clients. Logo, fazer pull/build/start não atualiza os bancos existentes.

O teste de provisionamento valida criação do arquivo, administrador e estado ACTIVE, mas não compara explicitamente a lista final de migrations/colunas com a versão esperada pelo aplicativo.

## 8. Checklist seguro para investigação em produção

Não executar `db push`, `migrate reset`, remoção de arquivos ou comandos sobre o banco da Bíblia. Antes de qualquer migration, confirmar diretório/volume e produzir backup verificável.

### 8.1 Identificar o tenant real

No banco global, conferir sem expor senha ou hash:

```sql
SELECT id, name, slug, databaseKey, active, status, plan, deletedAt
FROM Church
WHERE slug = '<slug-do-tenant>';
```

Confirmar que a aplicação e o shell de manutenção usam o mesmo `CHURCH_DATABASE_DIR`. O arquivo físico esperado é:

```text
<CHURCH_DATABASE_DIR>/church_<databaseKey>.db
```

O nome do arquivo usa `databaseKey`, não necessariamente o slug atual.

### 8.2 Conferir migrations e colunas somente para leitura

```bash
sqlite3 -readonly '<arquivo-do-tenant>' \
  'SELECT migration_name, finished_at, rolled_back_at FROM _prisma_migrations ORDER BY started_at;'

sqlite3 -readonly '<arquivo-do-tenant>' "PRAGMA table_info('User');"
sqlite3 -readonly '<arquivo-do-tenant>' "PRAGMA table_info('FeedPost');"
sqlite3 -readonly '<arquivo-do-tenant>' "PRAGMA table_info('Sale');"
```

Também é possível consultar o status do Prisma apontando explicitamente para o arquivo correto:

```bash
DATABASE_URL='file:/caminho/absoluto/church_<databaseKey>.db' \
  npx prisma migrate status --schema=prisma/tenant/schema.prisma
```

### 8.3 Aplicar migrations somente após backup e validação

O comando preparado pelo projeto faz backup SQLite, `integrity_check`, lock e migration de tenants:

```bash
npm run db:tenant:migrate:all -- \
  --tenant '<slug-ou-databaseKey>' \
  --backup-dir '<diretorio-de-backup-fora-do-volume-efemero>' \
  --output '<arquivo-de-relatorio.json>'
```

Observação: o modo `--dry-run` do script atual valida seleção, existência, cabeçalho e integridade, mas não executa `prisma migrate status`; portanto ele não informa sozinho quais migrations estão pendentes.

### 8.4 Diagnosticar usuário excluído que ainda autentica

```sql
SELECT m.id, m.email, m.active, m.approved, m.deletedAt,
       u.id AS userId, u.active AS userActive, u.deletedAt AS userDeletedAt,
       u.role, u.version
FROM Member m
LEFT JOIN User u ON u.linkedMemberId = m.id OR lower(u.email) = lower(m.email)
WHERE lower(m.email) = lower('<email>');
```

Não consultar nem registrar `passwordHash` nos logs ou no relatório de suporte.

### 8.5 Logs necessários para separar 403 de 500

Para cada falha, registrar de forma estruturada e sem dados sensíveis:

- rota e método;
- `tenantId`/`databaseKey` e slug;
- ID/e-mail normalizado do ator;
- perfil e permissões usadas na decisão;
- recurso/ação exigidos;
- código Prisma e `meta` quando houver;
- ID de correlação da requisição.

`jsonError()` hoje devolve uma mensagem genérica para erros inesperados, mas não registra o erro diretamente. Isso reduz a informação disponível quando o 500 vem de schema ou SQLite.

## 9. Plano de ação priorizado

O plano abaixo deve ser executado na ordem apresentada. A correção de navegação e experiência não deve preceder a revogação no servidor, porque esconder um link não impede chamadas diretas às APIs.

### Fase 0 — contenção e diagnóstico de produção (P0, imediata)

Objetivo: identificar tenants incompatíveis e reduzir a exposição enquanto a revogação definitiva é implementada.

1. Inventariar todos os registros de `Church` com `slug`, `databaseKey`, `active`, `status`, plano e caminho físico esperado.
2. Conferir `_prisma_migrations` de cada banco de tenant e comparar com as migrations presentes no release.
3. Separar os incidentes por resposta HTTP:
   - 401: sessão ausente;
   - 403: plano/perfil/permissão/escopo;
   - 500: banco, migration, Prisma ou falha interna.
4. Identificar usuários cujo `Member.deletedAt` está preenchido, mas cujo `User` continua ativo.
5. Identificar tenants inativos com sessões ainda produzindo requisições.
6. Registrar backup e relatório antes de aplicar qualquer migration.

Entregáveis:

- relatório por tenant com banco, última migration e migrations pendentes;
- lista de contas inconsistentes, sem incluir hashes de senha;
- confirmação do `CHURCH_DATABASE_DIR` usado pela aplicação e pela manutenção;
- correlação dos erros 500 de produção com código Prisma/SQLite.

Critério de aceite:

- todos os tenants ativos foram classificados como compatíveis ou pendentes;
- nenhum comando foi executado sobre `bible.db`;
- existe backup validado para cada banco que será migrado.

### Fase 1 — revogação de usuário excluído (P0, primeira correção de código)

Objetivo: impedir imediatamente login e uso de sessão por uma conta removida.

1. Definir formalmente a diferença entre **arquivar membro** e **revogar acesso**.
2. Na exclusão com revogação, executar uma transação que:
   - marque `Member.deletedAt` e `Member.active = false`;
   - localize o `User` por `linkedMemberId`;
   - use e-mail apenas como fallback controlado e auditável;
   - defina `User.active = false` e `User.deletedAt`;
   - incremente `User.version`.
3. Alterar a autenticação para exigir simultaneamente:
   - `User.active = true`;
   - `User.deletedAt IS NULL`;
   - senha válida;
   - membro vinculado elegível conforme a regra definida (`active`, `approved` e `deletedAt`).
4. Criar uma validação central de usuário para APIs, páginas, SSE e canal de jogos.
5. Registrar auditoria com ator, alvo, tenant, data e motivo.

Critérios de aceite:

- usuário excluído não consegue criar nova sessão;
- um JWT emitido antes da exclusão falha na requisição protegida seguinte;
- exclusão não afeta usuário de outro tenant com o mesmo e-mail;
- falha no update de `User` desfaz também a exclusão de `Member`;
- reativação exige uma ação administrativa explícita e auditada.

Estratégia de implantação:

1. Adicionar testes de revogação antes da mudança.
2. Implantar a validação de sessão.
3. Corrigir contas inconsistentes já existentes por script específico, com modo de simulação e relatório.
4. Monitorar respostas 401/403 após a implantação para detectar bloqueios indevidos.

### Fase 2 — bloqueio imediato de tenant desabilitado (P0)

Objetivo: fazer a desativação interromper sessões existentes, e não apenas novos logins.

1. Adicionar ao tenant global um campo monotônico, como `Church.authVersion`.
2. Incluir `tenantAuthVersion` no JWT no momento do login.
3. Criar uma única função de validação que consulte ou obtenha de cache seguro:
   - existência da igreja;
   - `active = true`;
   - `status = ACTIVE`;
   - `deletedAt IS NULL`;
   - igualdade entre versão atual e versão do token.
4. Aplicar essa função a:
   - páginas protegidas;
   - todas as APIs autenticadas;
   - stream de notificações;
   - SSE de jogos;
   - sincronização offline quando voltar a ficar online.
5. Incrementar `authVersion` ao desabilitar, arquivar, reativar ou executar uma revogação global de sessões.
6. Ao receber 401 por revogação, limpar sessão online e caches locais de autenticação sem apagar dados locais pendentes antes de tratá-los.

Critérios de aceite:

- tenant desabilitado perde acesso em todos os dispositivos na requisição seguinte;
- login novo também permanece bloqueado;
- plataforma/admin global continua acessível, pois não pertence ao tenant;
- reativar o tenant não torna válido um JWT emitido antes da desativação;
- APIs diretas não contornam o bloqueio do proxy.

Decisão de arquitetura:

- começar com consulta ao banco global em cada validação protegida para garantir correção;
- somente depois medir e, se necessário, introduzir cache de poucos segundos com invalidação explícita;
- não usar SSE como único mecanismo de revogação.

### Fase 3 — compatibilidade obrigatória de schema por tenant (P0)

Objetivo: eliminar erros 500 causados por Prisma Client mais novo que o banco SQLite.

1. Executar a rotina de migration de todos os tenants com backup, lock, `integrity_check` e relatório.
2. Adicionar ao deploy uma etapa obrigatória, anterior à liberação de tráfego, para:
   - migrar o banco global;
   - migrar todos os tenants elegíveis;
   - gerar Prisma Clients;
   - validar o schema esperado.
3. Não executar migrations automaticamente dentro de cada processo `next start`, evitando concorrência entre réplicas.
4. Criar um marcador de versão de schema esperado pelo release.
5. Manter tenant incompatível em manutenção, com resposta controlada, em vez de deixá-lo produzir 500.
6. Fazer o teste de provisionamento conferir migrations críticas e colunas, não apenas a existência do administrador.
7. Melhorar `--dry-run` para também informar migrations pendentes via `prisma migrate status` ou comparação equivalente.

Critérios de aceite:

- todos os tenants ativos possuem as migrations do release;
- `/api/members` não falha pela ausência de `User.coverUrl`;
- feed não falha pela ausência de `FeedPost.mentions`;
- um tenant novo só muda para ACTIVE após validação completa do schema;
- restauração do backup foi ensaiada e documentada;
- `bible.db` permanece fora da rotina de migrations de tenant.

Rollback:

- interromper o release se qualquer tenant falhar;
- preservar relatório e banco que falhou para diagnóstico;
- restaurar somente o banco individual a partir do backup verificado;
- nunca usar `migrate reset` ou `db push` em produção.

### Fase 4 — versão de acesso e consistência da sessão (P1)

Objetivo: aplicar mudanças de perfil e permissões sem exigir novo login e sem depender do recebimento de SSE.

1. Incrementar `User.version` quando houver mudança de papel, permissões, senha, atividade ou vínculo.
2. Comparar `User.version` do JWT com a versão atual em requisições protegidas.
3. Quando a versão divergir:
   - recarregar dados permitidos e emitir token renovado, se o usuário continuar válido; ou
   - rejeitar a sessão, se estiver inativo/excluído.
4. Manter `permissions.updated` apenas para atualização rápida da interface.
5. Garantir que a sessão não preserve uma permissão removida durante modo offline; ações pendentes devem ser reautorizadas no servidor ao sincronizar.

Critérios de aceite:

- conceder ou remover permissão produz efeito sem logout;
- evento SSE perdido não mantém autorização antiga no servidor;
- o Zustand e o cache offline nunca ampliam autorização além do JWT validado;
- uma fila offline não executa ação que o usuário já não pode realizar.

### Fase 5 — matriz única de perfis, permissões e navegação (P1)

Objetivo: garantir que link, página e API tomem a mesma decisão.

1. Definir a matriz oficial para ADMIN, PASTOR, LEADER e MEMBER.
2. Decidir e documentar se `CANTEEN` será um perfil real:
   - se sim, adicioná-lo aos tipos, formulário, sessão, seed e testes;
   - se não, removê-lo das políticas e expressar o acesso apenas por permissões.
3. Decidir se equipes usarão `teams:*` ou `groups:*`; manter apenas um contrato.
4. Gerar opções administrativas a partir de `PERMISSION_CATALOG`, com rótulos e descrições centralizados.
5. Fazer `canAccessRoute()` consultar a mesma regra usada pela política do módulo.
6. Padronizar políticas que hoje exigem perfil e permissão simultaneamente.
7. Revisar o vínculo entre permissões e recursos do plano.
8. Mostrar na tela de acesso dependências como “requer vínculo com uma equipe”.

Critérios de aceite:

- toda permissão reconhecida pela API pode ser administrada ou é marcada como interna;
- nenhum link aparece quando a página será negada pelo mesmo contexto;
- nenhuma página autorizada fica sem link por divergência de regra;
- testes cobrem cada perfil, módulo, ação e requisito de escopo;
- ADMIN e PASTOR têm seus comportamentos especiais claramente informados.

### Fase 6 — correções específicas do feed e da cantina (P1)

Objetivo: remover os casos mais visíveis de “permissão concedida, ação negada”.

Feed:

1. Definir `visibility = public` no servidor quando o campo não for enviado.
2. Alinhar o nome e uso de `feed:create`, `feed:publish` e `feed:moderate`.
3. Não oferecer “aviso” a quem não possui moderação.
4. Carregar grupos e membros de forma independente.
5. Exibir a mensagem de 403 retornada pela API, mantendo mensagem genérica apenas para 500.

Cantina:

1. Definir permissões por capacidade: consultar, comprar, vender, operar pedidos, produtos e financeiro.
2. Fazer o link principal depender da existência de ao menos uma capacidade utilizável.
3. Exibir somente abas correspondentes às capacidades concedidas.
4. Remover dependências implícitas do perfil ou torná-las visíveis na administração.

Critérios de aceite:

- membro com `feed:create` publica post público comum;
- membro sem `members:view` ainda consegue publicar sem marcações;
- membro com `canteen:order` vê a cantina e consegue concluir pedido;
- usuário de operação vê preparo sem receber acesso financeiro/produtos indevido;
- resposta 403 identifica a capacidade ausente para o frontend.

### Fase 7 — observabilidade, SSE e auditoria (P2)

Objetivo: tornar falhas diagnosticáveis e o tempo real confiável em múltiplas instâncias.

1. Registrar erros inesperados com ID de correlação, tenant, rota e código Prisma, sem senha/hash/token.
2. Adicionar métricas de 401, 403 e 500 por tenant e rota.
3. Persistir auditoria de alterações de acesso, revogações e estado do tenant.
4. Substituir o broker SSE local por Redis/pub-sub ou transporte compartilhado.
5. Criar alerta para tenant ativo com migration pendente.
6. Criar uma verificação periódica de consistência entre `Member` e `User`.

Critérios de aceite:

- um erro de produção pode ser associado a tenant, rota e causa sem acessar dados sensíveis;
- eventos chegam quando produtor e cliente estão em instâncias diferentes;
- alterações administrativas possuem trilha de auditoria;
- inconsistências de schema e conta são detectadas antes de reclamação do usuário.

### Ordem resumida de execução

| Ordem | Fase | Pode ser implantada isoladamente? | Bloqueia |
|---:|---|---|---|
| 1 | Diagnóstico e backups | Sim | migrations seguras |
| 2 | Revogação de usuário | Sim | segurança de exclusão |
| 3 | Revogação de tenant | Sim, após migration global | segurança de desativação |
| 4 | Migrations obrigatórias | Sim, por tenant | estabilidade de membros/feed |
| 5 | Versão de acesso | Após revogação básica | consistência sem logout |
| 6 | Matriz única | Após definir perfis oficiais | navegação e administração |
| 7 | Feed e cantina | Após matriz | fluxos funcionais |
| 8 | Observabilidade/SSE compartilhado | Incremental | escala horizontal e suporte |

## 10. Testes que faltam

### Revogação

- usuário vinculado não autentica após excluir membro;
- JWT emitido antes da exclusão é rejeitado na requisição seguinte;
- usuário com `deletedAt` preenchido e `active = true` não autentica;
- membro inativo, excluído ou não aprovado segue a regra de acesso definida;
- todas as sessões são rejeitadas imediatamente após desabilitar o tenant;
- reativar o tenant não reativa automaticamente usuários individualmente revogados.

### Matriz de perfis

Para ADMIN, PASTOR, LEADER e MEMBER, testar por módulo:

- sem recurso no plano;
- com recurso no plano e sem permissão;
- com permissão e sem vínculo/escopo;
- com permissão e escopo correto;
- link de navegação, carregamento da página e API final com o mesmo resultado.

### Schema por tenant

- tenant novo contém exatamente as migrations esperadas pelo release;
- tenant existente é migrado antes de receber tráfego da nova versão;
- `/api/members` funciona com o schema atual;
- leitura e publicação no feed funcionam com `mentions`;
- migration interrompida não marca o tenant como operacional;
- nenhum comando de tenant altera `bible.db`.

### Feed

- membro com `feed:create` publica conteúdo público comum;
- payload sem `visibility` usa padrão público, sem exigir moderação;
- aviso exige `feed:moderate` e a UI apresenta essa regra;
- falta de `members:view` não impede carregar grupos nem publicar sem marcações;
- frontend preserva a mensagem/status de autorização retornado pela API.

## Conclusão

Os dois comportamentos mais graves não são efeitos de cache visual: são falhas de revogação no modelo atual. A exclusão atua apenas sobre `Member`, enquanto a autenticação pertence a `User`; e a desativação do tenant é verificada somente na emissão inicial do JWT. A correção precisa ser feita no servidor e aplicada a todas as requisições protegidas, sem depender de logout, refresh, SSE ou estado do navegador.

Os erros 500 observados em membros e feed têm forte relação com schema de tenant atrasado. Em produção, a primeira ação deve ser confirmar `databaseKey`, volume e `_prisma_migrations` do tenant afetado. Depois, aplicar as migrations com backup e somente então investigar eventuais falhas de política, que normalmente devem aparecer como 403.
