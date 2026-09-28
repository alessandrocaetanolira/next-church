# Análise do frontend mobile e padrão de composição de telas

> Documento de análise e planejamento. Nenhum código de produção foi alterado nesta etapa.

## 1. Objetivo

O frontend mobile já possui primitives suficientes para construir uma experiência
consistente, mas as páginas ainda combinam responsabilidades diferentes no mesmo
arquivo: carregamento de dados, estado local, autorização, formulários, overlays,
feedback e markup visual.

O objetivo desta proposta é definir contratos previsíveis para cada tipo de tela e
separar:

- composição da rota;
- estado remoto e chamadas de serviço;
- estado efêmero da tela;
- componentes visuais reutilizáveis;
- formulários e validação;
- drawers, dialogs e confirmações;
- feedback de sucesso, erro e carregamento.

Esta padronização deve preservar o comportamento atual, o suporte offline, a
identidade visual por tenant e a navegação PWA.

## 2. Evidências encontradas

### 2.1 Primitives e componentes já disponíveis

Já existem componentes que devem ser tratados como fundação:

- `src/components/ui`: `Button`, `Card`, `Badge`, `Dialog`, `Drawer`, `Sheet`,
  `AlertDialog`, `Tabs`, `Input`, `Select`, `Textarea`, `Skeleton` e demais
  primitives acessíveis;
- `src/components/common/PageShell` para largura, espaçamento e padding;
- `src/components/common/PageHeader` para título, descrição e ações;
- `src/components/SharedFlatList` para cards móveis e carregamento incremental;
- `src/components/common/LoadingState`, `EmptyState`, `Notice`, `SearchField` e
  `ConfirmDeleteDialog`;
- `src/components/providers/DrawerProvider` e `useDrawer` para drawers globais;
- `src/components/shared/AppImage` para imagens com fallback;
- `src/components/layout/AppLayout`, `Header` e `BottomNav` para o shell mobile;
- `src/components/ui/filter-chip` e `src/components/ui/currency-input` para
  padrões específicos já utilizados em múltiplos fluxos.

### 2.2 Organização atual

Há três níveis de composição convivendo:

1. rotas em `src/app/**/page.tsx`, muitas delas client components grandes;
2. componentes de domínio em `src/features/<domínio>`;
3. componentes antigos ou compartilhados em `src/components`, incluindo os
   formulários de membros e produtos.

Os formulários de membros e produtos já demonstram a intenção de separar
`FormCreate`, `FormEdit` e `FormUI`, mas grupos e cadastro infantil ainda mantêm
estado, API, validação e apresentação em um único componente.

### 2.3 Concentração de complexidade

As maiores telas mobile são:

| Tela | Linhas aproximadas | Principal problema arquitetural |
|---|---:|---|
| `minha-conta/page.tsx` | 690 | catálogo, carrinho, checkout, sheets e pedidos na mesma tela |
| `groups/[id]/page.tsx` | 681 | detalhes, membros, solicitações, posts, metas e ações |
| `feed/page.tsx` | 602 | feed, composer, filtros, SSE/polling e interação social |
| `settings/page.tsx` | 501 | preferências, branding, logos, sidebar e uploads |
| `games/page.tsx` | 496 | vários jogos e estados de partida no mesmo bundle |
| `parking/page.tsx` | 476 | listagem, registro, ações e filtros |
| `quiz/page.tsx` | 461 | partida, ranking, convite e drawer |
| `bible/page.tsx` | 406 | leitura, seleção de versos, drawers, offline e ações |
| `members/[id]/page.tsx` | 410 | detalhe, ações, permissões e informações pessoais |

O tamanho não é o único problema, mas é um sinal confiável de que uma página está
orquestrando mais de um caso de uso.

## 3. Regra de composição alvo

Uma rota deve ser pequena e coordenar apenas a tela:

```text
src/app/<rota>/page.tsx
  -> <DomainScreen />
      -> useDomainScreen()
      -> <MobilePageFrame />
          -> <MobilePageHeader />
          -> <ScreenState />
          -> <DomainContent />
          -> <DomainOverlay />
```

Responsabilidades:

- `page.tsx`: parâmetros da rota, suspense/loading boundary e chamada da screen;
- `Screen`: composição da tela e transições entre estados;
- `hook`: dados, mutações, seleção, filtros, paginação e ações da tela;
- `api/service`: transporte e contratos do domínio;
- `components`: renderização de uma responsabilidade visual;
- `forms`: schema, valores padrão, campos e submissão;
- `common`: padrões que não dependem de um domínio específico.

Regra de promoção: um componente só deve ir para `common` quando tiver contrato
genérico e pelo menos dois consumidores reais. Se conhece `Member`, `Product`,
`Group` ou outro modelo específico, deve continuar dentro da feature.

## 4. Interfaces padrão de tela

Os nomes abaixo são contratos conceituais para orientar a implementação futura.
Eles não exigem a criação imediata de todos os arquivos.

### 4.1 `MobilePageFrame`

Responsável pelo shell interno da página:

```ts
type MobilePageFrameProps = {
  title?: string;
  description?: string;
  backHref?: string;
  headerActions?: ReactNode;
  children: ReactNode;
  bottomInset?: 'nav' | 'none';
};
```

Regras:

- respeitar `Header`/`BottomNav` do `AppLayout`;
- aplicar `safe-area` e espaço para a navegação inferior;
- permitir páginas sem `TopHeader` quando a tela já possui cabeçalho próprio;
- usar `PageShell` como base, sem replicar `p-4`, `space-y-4` e largura em cada rota;
- manter o título e ações acessíveis em telas estreitas.

### 4.2 `MobileListPage`

Para membros, grupos, materiais, notificações, projetos, escalas e catálogos:

```ts
type MobileListPageProps<T> = {
  title: string;
  description?: string;
  items: T[];
  renderItem: (item: T) => ReactNode;
  keyExtractor: (item: T) => string;
  search?: SearchConfig;
  filters?: ReactNode;
  primaryAction?: ReactNode;
  loading?: boolean;
  error?: ReactNode;
  empty?: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  hasMore?: boolean;
  onLoadMore?: () => void;
};
```

Composição padrão:

1. cabeçalho e ação primária;
2. busca/filtros em uma seção independente;
3. `LoadingState` ou skeleton;
4. `SharedFlatList` com `EntityCard` de domínio;
5. `EmptyState`, `InlineError` e paginação/infinite scroll;
6. ações secundárias em `ActionMenu` ou drawer.

Não deve haver uma segunda implementação de lista infinita por domínio.

### 4.3 `MobileDetailsPage`

Para membro, grupo, produto, publicação, criança e tenant:

```ts
type MobileDetailsPageProps = {
  title: string;
  subtitle?: string;
  backHref: string;
  status?: ReactNode;
  primaryAction?: ReactNode;
  secondaryActions?: ReactNode;
  sections: ReactNode[];
  loading?: boolean;
  error?: ReactNode;
};
```

Regras:

- uma ação principal visível;
- ações destrutivas e administrativas em menu/drawer;
- seções em `Card` com `CardHeader`/`CardContent` e tokens semânticos;
- telefone, email, WhatsApp e links com comportamento explícito;
- abas somente quando o detalhe tiver subáreas independentes (por exemplo,
  tenant: branding, logos, usuários e plano);
- não abrir nova guia dentro do PWA para navegar no próprio app.

### 4.4 `MobileCreatePage` e `MobileEditPage`

As duas telas usam o mesmo contrato visual, diferenciando apenas texto, valores
iniciais e operação:

```ts
type MobileFormPageProps = {
  mode: 'create' | 'edit';
  title: string;
  backHref: string;
  form: ReactNode;
  isSubmitting?: boolean;
  dirty?: boolean;
  onCancel?: () => void;
};
```

Estrutura obrigatória:

- tela própria no mobile, com botão voltar;
- sem `TopHeader` duplicado quando a rota já possui cabeçalho de formulário;
- `FormUI` sem API, router, toast ou regra de permissão;
- `FormCreate` e `FormEdit` controlam `useForm`, schema, mutation e callbacks;
- `FormActions` fixo no final ou sticky, respeitando teclado e safe area;
- confirmação ao sair se o formulário estiver sujo;
- erro de campo junto ao campo e erro de submissão no topo/resumo;
- botão de submissão desabilitado durante a mutation, sem duplicar requests.

Formulários prioritários: grupos, kids, branding/settings, cadastro público,
publicação no feed, escalas, materiais e estacionamento. Membros e produtos são
referência parcial, mas ainda precisam consolidar o contrato comum.

### 4.5 `ResponsiveDrawer`

O drawer deve ser usado para escolha, ação contextual, filtros e formulários
curtos; não para páginas inteiras sem necessidade.

Contrato sugerido:

```ts
type ResponsiveDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'content' | 'half' | 'large';
  dismissible?: boolean;
};
```

Regras de UX:

- usar `DrawerProvider/useDrawer` quando o conteúdo for disparado por ações
  globais, como ações de versos;
- usar `Drawer` controlado quando o estado pertence exclusivamente à página;
- manter handle de arraste, `overscroll-contain`, limite de altura e safe area;
- não colocar `overflow` concorrente em vários níveis;
- área de formulário deve acompanhar o teclado via `visualViewport`;
- footer com ações separadas por `gap`, ação primária por último no DOM;
- conteúdo que precisa de histórico, refresh ou deep link deve virar página,
  não drawer.

Alvos imediatos: Bible actions/version/chapter, comentários do feed, filtros de
listas, carrinho da cantina e menus da navegação inferior.

### 4.6 `ResponsiveModal` e confirmação

Separar claramente:

- `Dialog`: informação, edição curta e decisões não destrutivas;
- `AlertDialog`/`ConfirmDeleteDialog`: exclusão, cancelamento ou ação irreversível;
- `ResponsiveDrawer`: fluxo mobile contextual ou seleção;
- `Sheet`: painel maior que pode conter lista ou carrinho.

Todo overlay deve ter título acessível, descrição quando necessário, foco,
fechamento por Escape, comportamento de voltar no Android/PWA e ações com hierarquia
visual. Não usar modal para substituir uma rota de criação/edição longa.

### 4.7 Toasts, notices e erros

Padronizar feedback em três níveis:

| Situação | Componente | Uso |
|---|---|---|
| sucesso/erro transitório | `toast.success/error/info` | mutation concluída ou falha recuperável |
| erro que bloqueia a tela | `InlineError`/`Notice` | falha de carregamento, sem esconder contexto |
| erro de campo | `FormMessage` | validação local ou resposta 422 |
| ação destrutiva | `ConfirmDeleteDialog` | confirmação antes da mutation |

Mensagens devem ser consistentes, sem expor stack trace, e devem indicar próxima
ação quando offline, sem permissão ou com conflito de sincronização.

## 5. Componentes comuns a consolidar

### Prioridade alta

- `MobilePageFrame` / `MobilePageHeader`;
- `MobileListPage` + `SharedFlatList`;
- `EntityCard` com slots de status, meta, ações e avatar/imagem;
- `FormActions`, `FormSection`, `FormField` e resumo de erro;
- `ResponsiveDrawer` e `ResponsiveDialog`;
- `InlineError` e `ScreenState` (`loading | error | empty | ready | offline`);
- `StatusBadge` e `PermissionGate`;
- `ActionMenu` para ações secundárias.

### Prioridade média

- `FilterBar`/`FilterChips` com estado de URL;
- `StatCard` e `SummaryGrid` para dashboards;
- `MoneyText`, `DateText`, `PhoneLink` e `WhatsAppLink`;
- `ImageField`/`LogoField` para upload, preview e remoção;
- `StickyMobileFooter` para submit e carrinho;
- `Tabs` de detalhe com estado restaurável.

### Evitar por enquanto

- uma mega-componente que conheça todos os módulos;
- abstrair jogos junto com CRUD administrativo;
- criar um novo store global para cada lista;
- duplicar `Drawer` com pequenas diferenças de padding;
- encapsular API dentro de componente visual;
- criar uma tabela mobile genérica antes de consolidar cards/listas.

## 6. Mapeamento de migração por domínio

### Fase 1 — fundação visual e estados

1. Definir `ScreenState`, `MobilePageFrame`, `FormActions` e `EntityCard`.
2. Consolidar tokens, bordas, gaps, safe areas e estados dark/light.
3. Padronizar `DrawerFooter`, hierarquia de botões e fechamento por gesto/Escape.
4. Adicionar testes de acessibilidade e snapshots mínimos para primitives.

### Fase 2 — listagens e detalhes administrativos

1. membros: listagem, detalhe e permissões;
2. grupos: listagem, detalhe e solicitações;
3. materiais, estacionamento, kids e notificações;
4. schedules/equipes e projetos sociais.

Cada domínio deve terminar com `Screen`, hook de dados, cards e estados sem markup
duplicado na rota.

### Fase 3 — fluxos de criação/edição

1. grupos e kids;
2. cadastro público e perfil;
3. escalas, materiais e estacionamento;
4. branding/settings;
5. publicação no feed.

Migrar os formulários manuais para RHF + Zod sem alterar contratos de API.

### Fase 4 — experiências móveis complexas

1. cantina: catálogo, carrinho, checkout, preparo e histórico;
2. feed: timeline, composer, detalhe e comentários;
3. Bíblia: leitor, ações de verso, favoritos, anotações e downloads offline;
4. dashboard e minha conta;
5. jogos/quiz em ciclo separado, com lazy loading.

Essas áreas devem preservar SSE, Dexie, sincronização e push; a refatoração é de
composição, não uma troca de fonte de verdade.

## 7. Critérios de aceite por tela

Uma tela móvel só deve ser considerada migrada quando:

- a rota não contém fetch, regra de negócio ou formulário extenso;
- loading, erro, vazio, offline e sucesso possuem estados explícitos;
- ações principais e destrutivas têm hierarquia visual clara;
- o layout funciona em viewport estreito com teclado e safe area;
- dark/light não usa borda ou fundo branco arbitrário;
- drawers não ficam atrás do `BottomNav` nem se movem durante entrada de texto;
- retorno interno usa `router`/`Link`, sem abrir guia externa para navegação do app;
- permissões são resolvidas por helper/gate, não por verificações duplicadas;
- a tela funciona com conexão lenta e não perde estado ao retornar do background;
- testes cobrem mutation, erro, cancelamento e autorização relevante.

## 8. Checklist de revisão de PR mobile

- [ ] A rota só orquestra a screen?
- [ ] Existe componente comum já aplicável?
- [ ] O componente conhece domínio demais para estar em `common`?
- [ ] A lista usa `SharedFlatList`/contrato equivalente?
- [ ] O formulário separa `schema`, `FormUI`, create e edit?
- [ ] O drawer/modal tem título, foco, Escape e safe area?
- [ ] A ação primária está visualmente destacada?
- [ ] Toast, erro inline e erro de campo estão no nível correto?
- [ ] Não há cor, borda ou espaçamento arbitrário que quebre dark/light?
- [ ] O fluxo foi testado em mobile real/PWA e offline quando aplicável?
- [ ] Nenhum dado remoto foi duplicado no Zustand sem motivo?

## 9. Resultado esperado

Ao final, cada módulo deve ter uma composição previsível:

```text
Page route
  -> DomainScreen
    -> MobilePageFrame
      -> MobilePageHeader
      -> ScreenState
      -> EntityList / DetailSections / FormUI
      -> ResponsiveDrawer / ResponsiveDialog
      -> Toast + invalidation + navigation
```

Isso permite alterar a aparência global de uma lista, formulário, drawer ou detalhe
sem editar todas as páginas, reduz o risco de regressões no PWA e mantém a separação
entre UI, estado, transporte e regras de domínio.
