# TODO principal — Church App

Atualizado em **09/10/2026** após auditoria de código, documentação, histórico
recente e testes existentes. Este é o índice canônico de prioridade. Os documentos
de domínio continuam contendo contratos e checklists detalhados, mas não substituem
a ordem definida aqui.

Legenda: `[ ]` pendente; `[~]` parcial ou sem aceite operacional; `[x]` implementado
e validado no nível indicado.

## Estado confirmado

- [x] Next.js 16, Prisma separado em bancos global, tenant e Bíblia compartilhada.
- [x] PWA com Serwist, `manifest.ts`, fallback `/offline`, shell precacheado e dados
      bíblicos no Dexie, fora do Cache Storage.
- [x] Cadeia Route → Controller → Service → Repository aplicada na maior parte dos
      módulos novos e críticos.
- [x] Autorização por perfil + permissões persistidas; alterações chegam por SSE com
      fallback Push quando não há listener ativo.
- [x] SSE, notificações persistidas e Web Push são infraestrutura compartilhada.
- [x] Branding, manifesto e cores por tenant possuem fallback institucional.
- [x] Cantina possui PDV, carrinho persistente por tenant/usuário, preparo, fiado,
      pagamentos, extrato inicial e bloqueio visual de cantina fechada.
- [x] Feed possui comentários, menções, publicação por escopo e atualização SSE sem
      deslocar a leitura quando a pessoa está rolada.
- [x] Bíblia possui três versões no banco compartilhado, download opcional no Dexie,
      favoritos, anotações, ajuste de fonte e tentativa de Wake Lock.
- [x] Desafios de Quiz e Memória possuem convite, aceite, estado persistido e stream
      de jogo separado.

## Trabalho local ainda não consolidado

Só considerar estes itens concluídos depois de commit, build e aceite manual:

- [~] Feed: evento SSE refaz a primeira página no topo e mostra aviso durante leitura;
      backend limita a entrega aos destinatários de posts públicos, de grupo ou
      individuais.
- [~] Feed: menções renderizadas usam cor primária com contraste no claro/escuro.
- [~] Aprovação pastoral: cria post de apresentação do novo membro e notificação
      persistida para todos os usuários ativos do tenant, entregue por SSE e Push.
- [~] Bíblia: fonte expandida de 13px a 40px e estado explícito para Wake Lock;
      navegadores sem suporte, especialmente Safari/iOS, exibem a limitação.
- [~] Jogos: Memória e Quiz online usam tabuleiro/ordem de questões persistidos no
      servidor; ainda exigem aceite em dois dispositivos e reconexão real.

---

## P0 — Bloqueadores de release e segurança operacional

Nenhuma evolução de produto deve preceder estes itens em produção. `bible.db` nunca
entra em limpeza, reset ou migration de tenant.

### 1. Banco, provisionamento e arquivos

- [~] Inventário e backup local verificável concluídos em 08/10; manifesto e cópia
      íntegra estão em `/tmp/church-p0-backup-20261008-1428`. Repetir no volume ou
      cofre do ambiente de deploy antes de qualquer operação nele.
- [ ] Registrar no deploy: commit, Node, Prisma, diretório absoluto dos bancos,
      comando de start, quantidade de processos e volumes persistentes.
- [ ] Confirmar que migrations global/tenant e arquivos de branding estão no artefato
      de deploy e em volume persistente.
- [ ] Validar criação assíncrona de tenant em processo de produção: `PROVISIONING` →
      `ACTIVE`, falha intermediária, retry, reinício do processo durante job e logs
      sanitizados.
- [ ] Garantir que os canais global-admin e tenant não cruzem eventos, inclusive no
      fallback Push.
- [ ] Executar smoke test para tenant novo: login, branding padrão, permissões,
      migrations, admin inicial e desativação/reativação.

Referência: [production-stability-todo.md](./production-stability-todo.md) e
[tenant-separation-todo.md](./tenant-separation-todo.md).

### 2. Sessões, revogação e acesso

- [~] Validar em produção que membro arquivado/revogado perde acesso na requisição
      seguinte; tenant desativado já possui aceite local, mas precisa repetir no
      ambiente publicado.
- [ ] Separar definitivamente as ações “arquivar membro” e “revogar acesso”, com
      auditoria de ator, alvo, motivo e data.
- [ ] Criar testes de transição MEMBER → ADMIN → MEMBER com SSE, Push fallback,
      atualização de navegação e bloqueio real nas APIs.
- [ ] Revisar rotas ainda fora da arquitetura em camadas ou com Prisma direto:
      fundraising de grupos, líderes de equipes, escalas/equipes, perfil, cadastro
      público, sync e páginas server-side pastorais.
- [ ] Substituir `jsonError` genérico por logs estruturados com correlação, rota,
      tenant, usuário normalizado, decisão de autorização e erro Prisma sanitizado.

### 3. PWA/offline-first: aceite real obrigatório

- [ ] Remover uma única vez registros legados de `/sw.js`, preservando apenas o
      registro Serwist `/serwist/sw.js` com scope `/`.
- [~] Artefato verificado em 08/10: build diagnóstico compilou, expôs
      `/serwist/sw.js` com scope `/` e 250 entradas de precache, incluindo
      `/bible` e `/offline`. O `npm run build` oficial com Turbopack ainda precisa
      ser repetido no host de deploy: neste ambiente isolado o PostCSS não pode abrir
      seu processo auxiliar. Em cada release, executar `npm run build` e depois
      `npm run start` no mesmo artefato; confirmar worker `activated` e página
      controlada.
- [ ] Testar abertura e refresh offline em Android, iOS e desktop após visita online,
      incluindo rota inicial e `/bible` com conteúdo já baixado.
- [ ] Confirmar que API/RSC autenticada não fica armazenada inseguramente no Cache
      Storage e que textos bíblicos vêm exclusivamente do Dexie.
- [ ] Validar permissões Push e recuperação de subscription em Android/iOS, com app
      aberto e fechado; conferir badge do ícone PWA e clique da notificação.
- [ ] Corrigir somente após reprodução documentada qualquer tela branca, modal travada
      ou falha de registro de subscription em iOS.

Referência: [offline-first-todo.md](./offline-first-todo.md).

---

## P1 — Correções de experiência mobile e fluxos já entregues

O mobile é a referência principal do produto.

### 4. Layout estável e componentes compartilhados

- [ ] Auditar e corrigir os contêineres desktop aninhados: `WebTemplate` já aplica
      `WebPageContainer`, enquanto páginas que usam `WebPageLayout` ou outro
      `WebPageContainer` aplicam largura e padding novamente.
- [ ] Consolidar o shell de tabelas web. Há 12 componentes `*WebTable` próprios;
      somente membros e materiais usam o `WebDataTable` compartilhado. Preservar as
      colunas e regras de cada domínio, compartilhando estrutura, paginação e estados.
- [ ] Adotar `SharedFlatList`/`InfiniteScroll` nas listagens mobile elegíveis e
      extrair padrões de card reutilizáveis; hoje a lista compartilhada não padroniza
      o conteúdo visual dos itens, e grupos, infantil e estacionamento mantêm
      composições próprias.
- [ ] Definir um shell compartilhado para drawers/dialogs (cabeçalho, altura,
      safe-area, scroll e ações), mantendo conteúdo e regras dentro de cada domínio.
- [ ] Completar o mapeamento de chrome mobile para rotas de detalhe, incluindo
      `/admin/tenants/[id]` se confirmado o padrão imersivo: voltar contextual e
      NavBottom oculta.
- [ ] Padronizar conteúdo de Dashboard e telas de detalhe para usar os padrões
      comuns de página, cabeçalho e estados loading/empty/error.
- [ ] Registrar layouts imersivos/públicos como exceções explícitas: Bíblia, jogos,
      perfil social, autenticação, offline e início do PWA.
- [ ] Reproduzir e corrigir o `NavBottom` que sobe com scroll/teclado em iPhone;
      validar `position: fixed`, viewport dinâmico, safe-area e formulários.
- [ ] Corrigir drawer/modal com área branca inferior ou altura desproporcional em
      mudanças de estado, teclado, request lento e troca de perfil.
- [ ] Consolidar modal mobile: backdrop em flex centralizado, largura segura,
      bordas/rounded coerentes e sem colar nas laterais.
- [ ] Revisar topbars: tela raiz usa título simples; create/edit/detail usam chevron,
      título central e avatar somente quando necessário; subrotas não exibem NavBottom.
- [ ] Revisar overflow horizontal e dimensões de cards/listas, começando por Membros,
      Feed, Cantina e administração global.
- [ ] Validar light/dark em cards, drawers, chips, badges, divisores e contraste das
      cores do tenant.

### 5. Feed, perfil social e comunicação

- [~] Testar em dois usuários/dispositivos o post SSE no topo, aviso durante scroll,
      filtros e fallback de stream desconectado.
- [ ] Testar menção criada por seleção e por texto digitado: resolução de membro,
      link visual, notificação persistida, SSE e Push para subscription real.
- [~] Testar aprovação de membro: post idempotente de boas-vindas, notificação para
      todos do tenant e ausência de entrega entre tenants.
- [ ] Completar perfil social: capa/avatares em todas as superfícies, visualização
      fullscreen compartilhada, dados públicos adequados e links Feed/Membros/Perfil.
- [ ] Definir política de privacidade para campos exibidos no perfil social e posts
      automáticos de entrada de membro.

### 6. Bíblia e leitura

- [~] Testar ajustes de fonte no mobile e persistência entre abertura/fechamento.
- [ ] Confirmar Wake Lock em navegadores suportados; Safari/iOS deve manter feedback
      de indisponibilidade, sem promessa falsa de tela ligada.
- [ ] Validar downloads interrompidos, quota do IndexedDB e as três traduções offline
      em dispositivos reais.
- [ ] Avaliar presets de leitura (pequena, padrão, grande, extra grande) se o ajuste
      de 1px não for suficiente para acessibilidade.

### 7. Cantina, dashboard e carteira

- [ ] Validar em operação real PDF de vendas, arquivamento de pedido pronto e
      atualização SSE da fila.
- [ ] Revalidar produto, disponibilidade, preço e estoque ao restaurar carrinho;
      definir expiração e limpeza de carrinho abandonado.
- [ ] Definir e testar venda offline quando a Cantina fechar antes da sincronização;
      ela não pode ser apresentada como concluída localmente.
- [ ] Finalizar carteira: rollback/revalidação em pagamento com erro, atualização ao
      voltar online e filtros de extrato por período/tipo.
- [ ] Cobrir fiado, pagamento parcial, quitação, cancelamento, conflito e eventos em
      tempo real com testes de integração.

Referência: [dashboard-canteen-todo.md](./dashboard-canteen-todo.md).

---

## Adiado — não iniciar nesta etapa

Os itens abaixo não fazem parte da sequência ativa. A infraestrutura atual de SSE e
Push permanece em uso de instância única; nenhuma entrega de produto deve depender
de Redis, métricas novas, presença ou refatoração operacional adicional.

### 8. Notificações, Push e SSE

- [ ] Criar testes de integração para Push de menções, aprovação de membro, Cantina,
      mudança de perfil e limpeza de endpoints 404/410.
- [ ] Garantir idempotência/deduplicação de notificações persistidas por evento de
      negócio, especialmente quando uma requisição é repetida após falha.
- [ ] Adicionar métricas e logs estruturados: conexões SSE, listeners, entregas Push,
      subscriptions expiradas, falhas e latência, sem segredos.
- [ ] Formalizar o contrato de eventos por domínio e manter SSE como transporte, não
      como fonte de autorização ou armazenamento durável.
- [ ] Antes de múltiplas instâncias, substituir brokers em memória por Redis/pub-sub
      ou infraestrutura compartilhada equivalente.

### 9. Presença online por tenant

- [~] Infraestrutura e UI existem; faltam aceite e cobertura completa.
- [ ] Rejeitar imediatamente usuário/tenant inativo e interromper entrega quando a
      permissão `members:online:view` for revogada.
- [ ] Limpar estado em logout/troca de tenant e testar TTL, reconexão, suspensão de
      aba, múltiplos tenants e ausência de conexão duplicada.
- [ ] Adicionar logs/métricas e validar em produção de instância única antes de escalar.

Referência: [presence-todo.md](./presence-todo.md).

### Branding por tenant

- [ ] Eliminar qualquer fallback específico de tenant de código/asset; usar somente a
      marca padrão do Church App até o branding do tenant ser resolvido.
- [ ] Testar troca de tenant, restart, upload ausente e cache browser/SW sem vazamento
      de nome, logo, ícone ou cores.
- [ ] Resolver metadata/title, Apple Web App metadata e cache versionado de manifest e
      ícones conforme `brandingVersion`.
- [ ] Validar instalação e atualização de branding de dois tenants no mesmo aparelho.

---

## Próximas evoluções — somente após concluir P0 e P1

### 11. Jogos, ranking e desafios

- [ ] Testar Memória e Quiz online em dois usuários: aceite, mesma sala/tabuleiro,
      turnos, placar, recusa, cancelamento, expiração, reconexão e retorno à partida.
- [ ] Notificar desafiante ao aceitar/recusar e participantes ao concluir, sem Push por
      jogada e sem duplicidade.
- [ ] Consolidar UI de convite/sala/placar e entrada por notificações pendentes.
- [ ] Completar resultados solo: `runId`, idempotência, fila offline por tenant/usuário,
      retry visível, histórico e ranking por tenant.
- [ ] Definir feature flag por tenant e plano de rollout antes de liberar desafios em
      produção para vários usuários.

Referências: [games-todo.md](./games-todo.md) e
[game-challenges-todo.md](./game-challenges-todo.md).

### 12. Arquitetura de frontend e dados

- [ ] Consolidar FormCreate/FormEdit/FormUI + RHF/Zod nos CRUDs restantes: membros,
      materiais, grupos, equipes, infantil, estacionamento, planos e branding.
- [ ] Extrair hooks/seções das páginas grandes: Dashboard, Minha Conta, Grupo,
      Cantina, Feed e Configurações.
- [ ] Definir política única de cache/invalidação para dados remotos; Zustand não deve
      duplicar dados de servidor sem justificativa.
- [ ] Completar separação Web/Mobile da Cantina, Membros, Feed, Grupos, Bíblia,
      Dashboard e Minha Conta sem duplicar services, sync ou autorização.
- [ ] Padronizar primitives UI, estados loading/empty/error, listas infinitas, filtros,
      formulários acessíveis e estratégia de mídia com `AppImage`.

Referências: [frontend-todo.md](./frontend-todo.md) e
[web-mobile-separation-todo.md](./web-mobile-separation-todo.md).

### 13. E-mail e integrações nativas

- [ ] Implementar e-mail transacional por porta de infraestrutura, provider, outbox,
      retry, idempotência, preferências e templates; começar por convite/cadastro,
      recuperação de senha e avisos de Cantina.
- [ ] Consolidar Web Share API para Bíblia, Feed, perfis e resultados de jogos.
- [ ] Avaliar Web Share Target API e Media Session somente quando os fluxos de conteúdo
      e privacidade estiverem definidos.
- [ ] Adicionar `description` e `screenshots` no manifest para melhorar instalação no
      Android, usando dados fictícios e aceitando que iOS mantém fluxo próprio.

Referência: [email-todo.md](./email-todo.md).

---

## Qualidade, performance e rotina de aceite

- [ ] Medir isoladamente typecheck, tracing Prisma, geração Serwist e páginas estáticas
      no hardware/servidor de deploy; não otimizar por suposição.
- [ ] Medir Lighthouse/Web Vitals e perfil de rede de Login, Dashboard, Feed, Cantina
      e Configurações antes de quebrar componentes por performance.
- [ ] Revisar warnings ESLint e regras de hooks ainda desabilitadas após reduzir as
      ocorrências reais.
- [ ] Para todo release: `npm run prisma:generate`, `npm run typecheck`, `npm run lint`,
      `npm test`, `npm run build` e smoke test com `npm run start`.
- [ ] Registrar aceite manual mobile (Android/iOS), PWA, Push, SSE, permissões, tenant
      novo, tenant desativado, Feed e Cantina.

## Próxima ação recomendada

**Executar o aceite PWA/offline-first em artefato de produção.** Há relatos de tela
branca, subscription travada no iOS e comportamento divergente do worker entre
dispositivos. O teste deve ocorrer após build novo, via `next start`, verificando
`/serwist/sw.js`, Cache Storage e refresh offline da rota inicial e da Bíblia baixada.

## Documentos de detalhe

- [Estabilização de produção](./production-stability-todo.md)
- [Separação de tenants](./tenant-separation-todo.md)
- [Offline-first](./offline-first-todo.md)
- [Bíblia offline](./bible-offline-todo.md)
- [Dashboard e Cantina](./dashboard-canteen-todo.md)
- [Frontend](./frontend-todo.md)
- [Separação Web/Mobile](./web-mobile-separation-todo.md)
- [Presença online](./presence-todo.md)
- [Jogos](./games-todo.md)
- [Desafios online](./game-challenges-todo.md)
- [E-mail transacional](./email-todo.md)
