# Auditoria técnica — setembro de 2026

## Escopo

Revisão estática de performance, duplicação e configuração. A correção do achado
P0 foi aplicada em 27/09/2026; os demais achados continuam pendentes de medição
real com Lighthouse, Web Vitals, perfil de CPU ou teste de carga.

## Resumo executivo

O app tem uma base funcional e testes automatizados recentes, mas há três áreas
que merecem priorização antes de ampliar módulos: duas estratégias de PWA/bundler
em conflito, código legado de notificações em paralelo ao SSE consolidado e telas
client-side grandes que dificultam performance e manutenção.

## Achados prioritários

### P0 — Rota de seed exposta — resolvido em 27/09/2026

`src/app/api/seed/route.ts` atendia `GET`, criava membros no tenant fixo
`igreja-teste` e não verificava sessão, ambiente ou permissão. Como o proxy libera
rotas `/api` para que cada handler autorize seu próprio acesso, essa rota poderia
ser alcançada em produção caso o build a incluísse.

Correção aplicada: a rota foi removida. Seeds continuam disponíveis somente por
scripts explícitos de banco, fora da superfície HTTP. As exceções públicas do proxy
para os webhooks locais `/enviar-sse` e `/enviar-push` também foram removidas; os
handlers permanecem protegidos pelo flag `ENABLE_TEST_WEBHOOKS` e por origem local.

### P1 — Alinhar Serwist ao bundler oficial

Os scripts `dev` e `build` usam `--webpack`, mas `next.config.ts`, o provider do
layout e as dependências usam a integração `@serwist/turbopack`. O projeto já teve
problemas de chunks e instalação PWA; manter as duas estratégias aumenta o risco de
artefatos incompatíveis e torna o diagnóstico de service worker mais difícil.

O projeto foi validado com `next build --turbopack`: o Serwist gerou o Service Worker
e o precache automaticamente. Os scripts de desenvolvimento e produção agora usam
explicitamente Turbopack. Ainda faltam os testes em dispositivo real, atualização
do worker e rollback de cache.

### P1 — Consolidar notificações em um único fluxo

O caminho ativo usa `NotificationsProvider` + `openNotificationStream()` para SSE e
Web Push. Os dois serviços de polling sem consumidores foram removidos, e
`src/features/sync/hooks/use-sse.ts` agora reutiliza o mesmo stream compartilhado.
A política de reconexão permanece centralizada em `notification-stream.ts`.

### P1 — Evitar polling redundante no Feed

`src/app/feed/page.tsx` usa o evento `church:feed-post-created` distribuído pelo
SSE global como fonte principal. O polling de 30 segundos é ativado somente quando
o stream sinaliza desconexão, reduzindo chamadas em sessões saudáveis.

## Performance e arquitetura

### Componentes grandes e responsabilidades misturadas

Há arquivos client-side extensos que concentram renderização, estado, chamadas de
API e regras de domínio. Os maiores incluem `MemberDashboard` (702 linhas),
`/minha-conta` (690), detalhe de grupo (681), `SalesHistory` (605), Feed (566) e
Configurações (501).

Próxima ação: extrair hooks de carregamento/mutação, componentes de seção e tipos
de view model. Priorizar dashboard, cantina, Feed e configurações, pois são rotas
de uso recorrente.

### Carregamento de mídia

`AppImage` usa `<img>` nativo para contornar instabilidade anterior do
`next/image`. Isso é válido como contenção, mas o componente não define política
central para `loading`, `decoding`, dimensões reservadas ou prioridade. Em listas
de Feed, produtos e histórico, imagens podem competir com o conteúdo inicial.

Próxima ação: definir contrato de mídia compartilhado: imagem crítica com prioridade
explícita; itens abaixo da dobra com `loading="lazy"` e `decoding="async"`; largura
e altura ou `aspect-ratio` para evitar deslocamento de layout. Medir antes/depois.

### Bibliotecas pesadas no cliente

Exportações da cantina usam `jspdf` e `jspdf-autotable` para PDF. A exportação de
planilhas foi convertida para CSV compatível com Excel/LibreOffice e o pacote
`xlsx@0.18.5` foi removido por possuir advisories sem correção publicada no npm.
O CSV é gerado somente no clique de exportação.

### Branding e renderização dinâmica global

O `RootLayout` usa `dynamic = "force-dynamic"` para consultar branding pelo cookie
em `generateMetadata`. Isso reduz o potencial de cache de toda a árvore e ainda há
duas fontes de branding no cliente: `localStorage` e `getUserBranding()` no
`AppSettingsProvider`.

Próxima ação: medir TTFB e navegação autenticada; definir uma fonte de verdade para
branding por tenant e limitar metadata dinâmica às rotas que efetivamente precisam
dela, sem quebrar o manifest por tenant.

## Configurações e PWA

- O service worker usa `/pwa-192x192.png` fixo em notificações Push, enquanto
  manifest e metadata usam ícones dinâmicos por tenant. Push ainda pode exibir o
  ícone padrão em vez da identidade da igreja.
- O manifest global depende do cookie `church-tenant-slug`; o manifest público por
  query é `no-store`. É necessário validar instalação, atualização de ícone e troca
  de tenant em Android/iOS para evitar cache cruzado.
- `allowedDevOrigins` contém o domínio público. Confirmar se é necessário somente
  em desenvolvimento e mantê-lo alinhado com os ambientes realmente usados.
- `eslint.config.mjs` desabilita regras úteis de qualidade como `no-explicit-any` e
  `no-unused-vars`, além de manter `exhaustive-deps` apenas como warning. Isso
  reduz sinal para regressões de hooks e arquivos legados.

## Duplicações a tratar

- Notificações/SSE/polling: três implementações legadas além do fluxo ativo.
- Formatação de data e moeda: `formatCurrency` já é compartilhado, mas há várias
  formatações locais de data. Criar utilitários de apresentação apenas onde a
  repetição for recorrente, sem abstrair formatos específicos prematuramente.
- Estrutura de cards e blocos de formulário aparece repetidamente. A consolidação
  deve partir dos padrões já existentes em `components/ui`, `components/common` e
  `components/shared/web`, evitando criar um novo design system paralelo.

## Validação recomendada antes de refatorar

1. Build e `next start` com a integração PWA escolhida.
2. Matriz real Android, iOS e desktop: instalar, atualizar, abrir offline,
   receber Push e trocar de tenant.
3. Lighthouse/Web Vitals em login, dashboard, Feed, cantina e configurações.
4. Perfil de rede com Feed aberto para confirmar redução de polling e conexões SSE.
