# TODO principal — Church App

Este é o índice canônico de trabalho. Os documentos de domínio abaixo mantêm o
detalhamento técnico; este arquivo contém apenas o estado e a ordem de execução.

## Fonte de verdade e próximo foco

Este arquivo é o índice canônico: define a ordem geral e aponta o estado resumido.
O plano operacional vigente para os incidentes de produção está em
[production-stability-todo.md](./production-stability-todo.md) e tem precedência sobre
qualquer checklist antigo ou documento de domínio quando houver conflito.

Antes de ampliar módulos, executar esse plano na ordem. As prioridades abaixo só
podem avançar depois do aceite das Fases 0 a 6 (backup da Bíblia, banco consistente,
provisionamento, autenticação, sessões revogáveis e dados íntegros). O `bible.db`
continua fora de qualquer limpeza ou reconstrução.

### Estado resumido do plano de produção

- [ ] Fase 0 — preservar e validar o `bible.db`; congelar o release.
- [ ] Fase 1 — escolher reconstrução limpa ou reparo incremental.
- [ ] Fase 2 — corrigir migrations, schema e provisionamento de tenants.
- [ ] Fase 3 — corrigir dados inválidos e concluir a integridade do banco.
- [ ] Fase 4 — revogar usuários excluídos/desativados e corrigir login.
- [ ] Fase 5 — revogar sessões quando tenant ou permissões mudarem.
- [ ] Fase 6 — consolidar perfis e matriz de permissões.
- [ ] Fases 7–10 — branding, observabilidade, testes de release e aceite final.

Próximo foco: validar a Fase 2 em ambiente limpo de produção, incluindo criação
assíncrona, falha, retry manual e fallback Push do admin global. O canal SSE global
permanece exclusivo do admin de plataforma e isolado dos tenants.

Cada item deve ser marcado somente no documento detalhado, com seu critério de
aceite registrado.

## Auditoria técnica — ação imediata

- [x] P0: remover a rota pública `/api/seed`; os dados de demonstração permanecem
      exclusivamente nos scripts explícitos de inicialização. Remover também as
      exceções públicas redundantes dos webhooks locais de teste no proxy.
- [x] P1: alinhar a integração Serwist ao bundler oficial Turbopack do Next 16 e
      validar o build com Service Worker gerado e precache automático.
- [x] P1: consolidar SSE/Web Push; o provider mantém uma única conexão SSE,
      `use-sse` reutiliza o mesmo stream e os serviços de polling legado foram removidos.
- [x] P1: tornar o polling do Feed fallback do SSE, ativado somente quando o stream
      estiver indisponível.
- [ ] Medir Lighthouse/Web Vitals e perfil de rede nas rotas Login, Dashboard, Feed,
      Cantina e Configurações antes de refatorar componentes grandes.
- [ ] Definir política de carregamento de mídia para `AppImage` (lazy, decoding,
      dimensões reservadas e prioridade).
- [ ] Revisar regras ESLint desabilitadas e elevar warnings de hooks relevantes após
      limpar ocorrências existentes.

## Estado atual

- [x] Next.js 16 + Webpack oficial + TypeScript; Turbopack permanece em avaliação.
- [x] Prisma separado em global, tenant e Bíblia compartilhada.
- [x] Arquitetura Route → Controller → Service → Repository aplicada aos principais módulos.
- [x] Cantina com produtos, PDV, preparo, pedidos, fiado, pagamentos e notificações.
- [x] Feed, grupos, membros, materiais, pastoral, infantil, estacionamento e Quiz com services próprios.
- [x] PWA com Serwist, manifest, fallback `/offline` e precache gerado no build.
- [x] Bíblia com Dexie, favoritos, anotações e download opcional.
- [x] Notificações internas, SSE e Web Push.
- [x] Atualização de perfil via SSE com fallback Push quando não há conexão ativa.
- [x] Badge numérico do ícone PWA sincronizado com notificações não lidas.
- [x] Beep moderno e vibração para eventos recebidos em primeiro plano, com vibração
      nativa no Web Push quando suportada pelo dispositivo.
- [x] Branding por tenant, cores, logos e configuração do PWA.
- [x] Manifest, ícones e tela de entrada PWA dinâmicos por tenant.
- [x] Perfil do próprio usuário com avatar WebP e atualização de dados pessoais.
- [x] Perfil do próprio usuário com capa horizontal em WebP, enviada em Base64 e
      servida somente para usuários autenticados do tenant.
- [x] Permissões padrão para novos membros aprovados, incluindo Feed e Bíblia.
- [x] Ranking geral da igreja agregando devocional, quiz e pontuações persistidas de jogos.
- [x] Quiz: persistir tentativa antes de exibir o resultado, mantendo a tela de
      resultado disponível mesmo se o envio falhar; criar convite persistido e
      notificação para desafio entre membros elegíveis.
- [x] Link do devocional para abrir diretamente livro, capítulo e verso na Bíblia.
- [ ] E-mail transacional ainda não implementado.

## Prioridade 1 — Estabilização

- [x] Executar a suíte completa fora do sandbox e corrigir falhas reais, separando-as de limitações de subprocesso.
- [x] Corrigir migrations pendentes em ambientes existentes antes de consultar colunas novas.
- [x] Revalidar `npm run build` após as últimas alterações de branding/layout.
- [x] Reduzir warnings relevantes de lint, corrigindo imagens, hooks e configuração do Vitest.
- [x] Atualizar o estado de validação no README após cada rodada.

## Prioridade 2 — Template Web

- [x] Separar o `WebTemplate` do componente de layout que também atende o Mobile.
- [x] Extrair `WebHeader` com logo, título, tema, notificações e ações da conta.
- [x] Separar `WebSidebar` da renderização dos itens de navegação.
- [x] Criar configuração central de navegação Web por grupos e módulos.
- [x] Manter as regras de acesso fora dos componentes visuais de navegação.
- [x] Criar `WebPageContainer` com largura e espaçamento padrão para telas Web.
- [x] Criar breadcrumbs e contexto de navegação para telas internas.
- [x] Criar `WebUserMenu` com perfil, configurações e logout.
- [x] Criar `WebPageHeader` compartilhado para cabeçalhos de telas Web.
- [x] Criar entrada compartilhada para componentes Web reutilizáveis (`components/shared/web`).
- [x] Iniciar a migração de Membros para o padrão Web com tabela desktop própria.
- [x] Iniciar a migração de Materiais com tabela desktop própria.
- [x] Migrar Grupos para tabela Web, mantendo cartões no Mobile.
- [x] Iniciar a migração do Feed com lista de publicações Web própria.
- [x] Migrar o Feed para tabela Web, mantendo cards no Mobile.
- [x] Iniciar a migração da Bíblia com navegação Web própria.
- [x] Iniciar a migração de Administração e Cantina para o padrão Web com container compartilhado.
- [x] Migrar a listagem de Planos para tabela Web.
- [x] Migrar a gestão de Produtos da Cantina para tabela Web.
- [x] Migrar o histórico de vendas da Cantina para tabela Web.
- [x] Migrar a listagem de Fiado da Cantina para tabela Web.
- [x] Migrar a listagem de membros da Cantina para tabela Web.
- [x] Migrar Notificações para tabela Web.
- [x] Migrar Escalas para tabela Web.
- [x] Concluir as principais listagens desktop de Administração e Cantina.
- [x] Migrar Grupos, Feed e Bíblia com componentes Web próprios.
- [x] Migrar Estacionamento para tabela Web.
- [x] Migrar Infantil para tabela Web.
- [x] Migrar Projetos Sociais para tabela Web.
- [x] Migrar Pastoral para tabelas Web.
- [x] Garantir que chamadas de API permaneçam em hooks/services de domínio.
- [x] Manter o template Mobile inalterado durante esta fase, usando variantes Web apenas no desktop.

## Prioridade 3 — Permissões e experiência de acesso

- [x] Completar escopo de líder em grupos, materiais e tarefas.
- [x] Garantir que o administrador veja todos os módulos autorizados, incluindo Cantina.
- [x] Persistir permissões e equipes no store após login e atualizar permissões via SSE.
- [x] Cobrir permissões com testes de policy, service e resposta HTTP.
- [x] Cobrir transições ADMIN/MEMBER e entrega `permissions.updated` via SSE.

## Prioridade 4 — Offline-first real

- [x] Isolar o cache da sessão offline por tenant e usuário e limpar o contexto no logout.
- [x] Isolar o cursor e a fila de sincronização por tenant e usuário.
- [x] Bloquear claramente publicação, curtida e comentário do Feed sem conexão.
- [x] Iniciar o isolamento dos registros Dexie sincronizados pelo tenant ativo.
- [x] Criar limpeza explícita dos registros offline legados sem tenant.
- [x] Criar teste automatizado de isolamento entre dois tenants.
- [x] Isolar favoritos, anotações e tentativas de Quiz pelo tenant ativo.
- [x] Versionar o schema Dexie para índices pessoais com tenant.
- [ ] Validar abertura e refresh offline em dispositivo real (Android, iOS e desktop).
- [ ] Garantir sessão offline sem redirecionamento indevido para login.
- [x] Revalidar a sessão online e liberar overlays/drawers ao retornar de uma aba
      suspensa, evitando a tela aparentemente sem cliques.
- [x] Isolar cache Dexie por tenant e usuário.
- [ ] Completar sincronização, retry, conflitos e quota do IndexedDB, documentando a estratégia de resolução.
- [x] Detectar conflito de versão no `push` sem sobrescrever alteração mais recente do servidor.
- [x] Expor resumo de sucesso parcial, conflitos e falhas no sincronismo.
- [x] Permitir resolução manual de conflitos pelo indicador de sincronização.
- [x] Tratar sessão expirada e retry manual de falha parcial no indicador de sincronização.
- [ ] Validar Bíblia offline com as três versões e downloads interrompidos.
- [ ] Validar branding e manifest sem mistura entre tenants.
- [ ] Confirmar instalação PWA em Android real, incluindo ícone e manifest do tenant.
- [x] Usar o ícone PWA do tenant no payload de notificação Push, mantendo fallback
      para o ícone padrão.
- [x] Revisar modal inicial de notificações para recuperar subscriptions concedidas
      mas ainda não registradas.

## Prioridade 5 — Cantina

- [x] Enfileirar criação, atualização de status e arquivamento de pedidos no Dexie
      quando a aplicação estiver offline, mantendo o registro local como `pending`.
- [x] Processar a fila de vendas no endpoint de sincronização com autorização de
      operação, detecção de conflito e idempotência para retries.
- [x] Adicionar consumidor intencional `VISITOR` sem criar membro falso.
- [x] Diferenciar no PDV: membro, visitante e não identificado.
- [x] Impedir fiado para visitante/não identificado.
- [x] Adicionar filtros e relatórios por tipo de consumidor.
- [x] Revisar PDF de vendas e operação de remoção de pedidos prontos.

## Prioridade 6 — Branding e UI

- [x] Preview de branding no painel administrativo com tela mobile de dashboard e variantes iOS/Android.
- [x] Organizar a aba Aparência em layout Web lado a lado, com preview à esquerda e formulários à direita.
- [x] Aplicar logos light/dark configuráveis no loading inicial e nos estados de carregamento compartilhados.
- [ ] Restaurar branding padrão do app.
- [x] Alternar logo claro/escuro conforme o tema no template Web.
- [x] Configurar ícone mobile e quatro logos da sidebar: aberta/recolhida em claro/escuro.
- [x] Configurar uso opcional da imagem e textos opcionais da sidebar.
- [ ] Atualizar metadata/title e ícones dinamicamente por tenant.
- [x] Consolidar `AppImage` e fallback de logo nos principais carregamentos.
- [x] Validar fallback de logo após login e em light/dark.
- [x] Criar `InfiniteScroll` compartilhado para listas mobile.
- [x] Ajustar Feed mobile com cards, categorias, aviso de novas publicações e drawer inferior de comentários.
- [x] Substituir menu de usuário mobile por drawer bottom padrão, com confirmação de logout.
- [x] Consolidar `ErrorState`, `OfflineState`, `ActionMenu` e `FilterBar` compartilhados.
- [ ] Extrair hooks e seções das telas client-side maiores (Dashboard, Minha Conta,
      Grupo, Cantina, Feed e Configurações), começando pelas rotas mais acessadas.

## Prioridade 7 — Notificações e e-mail

- [x] Broker SSE, persistência interna e Web Push.
- [x] Eventos compartilhados para Cantina e demais módulos principais.
- [x] Reproduzir beep e vibração em notificações SSE e Push recebidas com o app aberto.
- [x] Adicionar testes para remetente, entrega e eventos de crédito.
- [ ] Implementar e-mail transacional com provider, templates, fila, retry e idempotência.

## Prioridade 8 — Módulos de baixa prioridade

- [ ] Refatorar Jogos conforme [games-todo.md](./games-todo.md).
- [x] Criar persistência inicial de pontuação de jogos e integrar o ranking ao perfil de engajamento.
- [ ] Integrar todos os jogos solo ao endpoint de pontuação com `clientRunId`/idempotência.
- [ ] Implementar marcação de pessoas no Feed, com seleção de membros, notificação e link para a publicação.
- [ ] Completar desafios entre membros: aceite/recusa, partida em dupla e resultado
      persistido. O convite inicial de Quiz e sua notificação já estão disponíveis.
- [ ] Implementar o módulo isolado de desafios online conforme [game-challenges-todo.md](./game-challenges-todo.md), incluindo `ssegames`, reconexão, pontuação server-side e feature flag.
- [ ] Completar melhorias de frontend conforme [frontend-todo.md](./frontend-todo.md).
- [ ] Executar a separação progressiva Web/Mobile conforme [web-mobile-separation-todo.md](./web-mobile-separation-todo.md).

## Documentos detalhados

- [Roadmap](./roadmap.md)
- [Arquitetura em camadas](./layered-architecture-todo.md)
- [Separação de tenants](./tenant-separation-todo.md)
- [Offline-first](./offline-first-todo.md)
- [Bíblia offline](./bible-offline-todo.md)
- [E-mail transacional](./email-todo.md)
- [Frontend](./frontend-todo.md)
- [Separação Web/Mobile](./web-mobile-separation-todo.md)
- [Jogos](./games-todo.md)
- [Auditoria técnica](./technical-audit-2026-09.md)
- [Estabilização de produção](./production-stability-todo.md)
