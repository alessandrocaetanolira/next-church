# TODO Frontend — Arquitetura, Componentes, Formulários e Performance

## 1. Intenção

Este documento define a organização futura do frontend do Church Hub Next. O objetivo
é transformar páginas grandes e componentes específicos em uma composição previsível
de componentes reutilizáveis, forms por domínio, clientes de API tipados e estado
separado por responsabilidade.

A refatoração deve preservar o comportamento e os contratos atuais das APIs. O foco
é reduzir duplicação, facilitar manutenção, manter a experiência visual consistente
em light/dark e diminuir o JavaScript enviado ou executado sem necessidade.

Princípios:

- página coordena a tela; não concentra regra de formulário, fetch e apresentação;
- componentes compartilhados não conhecem detalhes de um domínio;
- componentes de domínio não acessam `fetch` diretamente;
- dados remotos não devem ser duplicados em Zustand sem necessidade;
- formulários usam schema, tipos e mensagens consistentes;
- tokens semânticos de design substituem cores e tamanhos arbitrários;
- cada domínio pode evoluir isoladamente sem criar outra versão do mesmo componente.

## 2. Diagnóstico do frontend atual

### 2.1 Organização encontrada

Existem três estilos misturados:

1. `src/app/<rota>/page.tsx` com páginas client-side grandes e lógica de fetch,
   estado, formulário e renderização no mesmo arquivo;
2. `src/features/<domínio>` com alguns componentes, hooks e stores já separados;
3. `src/components` com primitives UI e componentes comuns, mas ainda há componentes
   de domínio antigo em `src/components/forms`.

As maiores páginas atuais são `groups/[id]`, `minha-conta`, `feed`, `parking`,
`games`, `kids`, `groups`, `members/[id]` e `quiz`. Elas devem ser tratadas como
epics de refatoração, não como um único PR.

### 2.2 Problemas observados

- chamadas `fetch` espalhadas por páginas, componentes e utilitários;
- ausência de um cliente HTTP/API global com parsing de resposta, erros, sessão,
  cancelamento e tratamento de 401/403/422;
- formulários implementados com `useState` manual em `MemberForm`, `ProductForm` e
  várias páginas;
- React Hook Form usado apenas em partes do projeto e sem schema Zod compartilhado;
- Zod ainda não está presente como dependência principal;
- dados de servidor, estado de tela, carrinho, sessão e preferências têm estratégias
  diferentes de armazenamento;
- Zustand existe em auth, UI, sync e cantina, enquanto `AppSettingsProvider` mantém
  outro estado para tema e branding;
- `src/components/forms` mistura formulários de domínio com componentes que deveriam
  viver em `src/features/<dominio>`;
- componentes comuns ainda possuem variações duplicadas de tabela, cards, headers,
  estados vazios, carregamento, modais e ações;
- uso direto de `bg-white`, `text-gray-*`, bordas e tamanhos arbitrários em partes
  do frontend pode quebrar a coerência entre light e dark;
- imagens usam `<img>` em componentes onde o carregamento, dimensões e fallback
  poderiam ser controlados por um componente único;
- algumas telas carregam várias coleções inteiras em paralelo sem paginação,
  seleção de campos ou cache de domínio;
- páginas interativas tendem a ser client components maiores que o necessário;
- jogos possuem necessidades específicas de performance e não devem impor o mesmo
  bundle inicial das telas administrativas.

## 3. Arquitetura frontend alvo

```text
src/app/<rota>/page.tsx
  -> feature/<dominio>/pages ou screen
    -> feature/<dominio>/components
    -> feature/<dominio>/forms
    -> feature/<dominio>/hooks
    -> feature/<dominio>/api
      -> src/lib/api/client.ts
        -> /api/<dominio>

src/components/ui       primitives acessíveis e sem regra de domínio
src/components/common   padrões visuais e comportamentais compartilhados
src/components/layout   shell, navegação e responsividade global
src/lib/api             transporte, erros, tipos base e autenticação HTTP
src/features/<dominio>  composição e regras de apresentação do domínio
```

### 3.1 Responsabilidade de cada camada

- `app`: roteamento, metadata, loading/error boundaries e composição mínima da página;
- `components/ui`: Button, Input, Select, Dialog, Table e primitives acessíveis;
- `components/common`: PageShell, PageHeader, DataTable, filtros, estados e ações;
- `features`: telas, componentes e hooks específicos do domínio;
- `features/<dominio>/api`: funções tipadas do domínio, sempre usando o cliente global;
- `features/<dominio>/forms`: schemas, valores padrão, fields e formulários de CRUD;
- `lib/api`: um único transporte HTTP, serialização, erros e política de cache;
- Zustand: estado global de UI, sessão derivada, carrinho e offline quando necessário;
- React Hook Form + Zod: estado e validação de formulários;
- servidor/API: fonte de verdade dos dados persistidos.

Um componente compartilhado deve ser promovido para `common` somente quando possuir
contrato genérico e pelo menos dois consumidores reais. Componentes específicos
continuam dentro do domínio até a abstração ficar comprovada.

## 4. API frontend global e APIs de domínio

### 4.1 Cliente global obrigatório

Criar:

```text
src/lib/api/client.ts
src/lib/api/errors.ts
src/lib/api/types.ts
src/lib/api/index.ts
```

O cliente global deve:

- aceitar método, URL, query, body, headers e `AbortSignal`;
- serializar JSON e `FormData` sem destruir uploads;
- interpretar respostas de sucesso e erro padronizadas;
- converter 401, 403, 404, 409, 422 e 5xx em erros tipados;
- incluir `cache`, `credentials` e `signal` de forma explícita;
- evitar `fetch` duplicado e mensagens de erro diferentes para o mesmo problema;
- permitir instrumentação, timeout e retry somente para operações idempotentes;
- não conhecer componentes ou regras de domínio.

Exemplo de uso alvo:

```ts
import { apiClient } from '@/lib/api';

export const membersApi = {
  list: (query?: MembersQuery, options?: RequestOptions) =>
    apiClient.get<MembersResponse>('/api/members', { query, ...options }),
};
```

### 4.2 APIs por domínio

Cada domínio deve encapsular seus endpoints:

```text
src/features/members/api/members.api.ts
src/features/canteen/api/products.api.ts
src/features/canteen/api/sales.api.ts
src/features/groups/api/groups.api.ts
src/features/feed/api/feed.api.ts
```

As APIs de domínio devem conter apenas contrato de entrada/saída, URL e chamada ao
cliente global. Não devem conter JSX, regra de autorização ou normalização visual.

### 4.3 Hooks de dados

Os hooks de domínio consomem as APIs de domínio e controlam loading, erro, cache,
refetch e invalidação. Avaliar a adoção de TanStack Query ou uma camada equivalente;
não criar um cache manual diferente para cada tela.

Regra: Zustand não será usado como banco de dados remoto. Ele fica reservado para
estado global de UI, carrinho, preferências e fila offline. Dados de servidor devem
ter cache, invalidação e ciclo de vida próprios.

## 5. Padrão de formulários por domínio

### 5.1 Estrutura obrigatória

Para cada CRUD que possuir criação e edição, usar:

```text
src/features/<dominio>/forms/
  <entidade>.schema.ts
  <entidade>.types.ts
  <entidade>-form-ui.tsx
  <entidade>-form-create.tsx
  <entidade>-form-edit.tsx
  index.ts
```

Nomes equivalentes em PascalCase são aceitáveis, mas o trio deve existir com
responsabilidades separadas: `FormCreate`, `FormEdit` e `FormUI`.

### 5.2 Responsabilidades

`FormUI`:

- renderiza somente campos, labels, mensagens e ações;
- recebe `control`, `register`, `errors`, `isSubmitting` e callbacks;
- não conhece endpoint, toast, router ou regra de permissão;
- permite composição de campos específicos sem duplicar layout.

`FormCreate`:

- define `defaultValues` de criação;
- cria o `useForm` com `zodResolver`;
- chama `domainApi.create`;
- trata sucesso, erro e invalidação do cache;
- recebe apenas callbacks de tela, como `onSuccess` e `onCancel`.

`FormEdit`:

- recebe a entidade e converte dados da API para valores do formulário;
- usa o mesmo schema e `FormUI` do create;
- chama `domainApi.update`;
- controla diferenças de campos somente quando a regra for real do modo edição.

### 5.3 RHF e Zod

- adicionar `zod` e `@hookform/resolvers` às dependências;
- definir schema único para cada entidade;
- inferir o tipo do formulário com `z.infer<typeof schema>`;
- validar no client apenas para experiência; a API continua sendo a autoridade;
- usar transformações explícitas para datas, números, moeda, booleanos e arquivos;
- não manter números como `NaN` por causa de `parseFloat` em `onChange`;
- exibir erros por campo e erro geral de submissão com o mesmo componente;
- testar schema com valores válidos, inválidos, limites e campos opcionais.

Primeiros candidatos: membros, produtos de cantina, materiais, grupos, equipes,
vagas de estacionamento, crianças, planos, branding e publicação no feed.

## 6. Biblioteca de componentes compartilhados

### 6.1 Primitives UI

Auditar e consolidar `src/components/ui` para que todos os componentes:

- tenham foco visível, teclado, aria e estados disabled/loading;
- aceitem `className` via `cn` sem quebrar variantes;
- usem tokens semânticos e não cores fixas;
- tenham tamanhos e variantes documentados;
- sejam consistentes em mobile, light e dark.

### 6.2 Componentes comuns a criar ou consolidar

- `AppShell`, `PageShell`, `PageHeader` e breadcrumbs;
- `FormField`, `FormMessage`, `FormActions`, `FormSection` e `FileField`;
- `DataTable` com loading, vazio, erro, paginação, ordenação e ações;
- `FilterBar`, `FilterChips`, `SearchField` e filtros sincronizáveis com URL;
- `EntityCard`, `StatCard`, `StatusBadge` e `PermissionGate`;
- `EmptyState`, `LoadingState`, `ErrorState` e `InlineError`;
- `ConfirmDeleteDialog`, `ActionMenu`, `ResponsiveDialog` e `ResponsiveDrawer`;
- `AppImage` com dimensões, fallback, lazy loading e alt obrigatório;
- `MoneyText`, `DateText`, `RelativeTime` e formatadores consistentes.

Não transformar `DataTable` em um componente específico para membros ou produtos.
O domínio deve fornecer colunas, dados e ações; a tabela fornece interação comum.

## 7. Convenção visual e tema

### 7.1 Tokens obrigatórios

Usar os tokens semânticos já definidos em `globals.css`:

| Intenção | Classes padrão |
|---|---|
| fundo da aplicação | `bg-background text-foreground` |
| superfície/card | `bg-card text-card-foreground` |
| borda | `border-border` |
| texto secundário | `text-muted-foreground` |
| ação principal | `bg-primary text-primary-foreground` |
| ação secundária | `bg-secondary text-secondary-foreground` |
| destaque | `bg-accent text-accent-foreground` |
| sucesso/alerta/erro | `success`, `warning`, `destructive` sem cor fixa |
| foco | `ring-ring` |

### 7.2 Regras de light/dark

- não usar `bg-white`, `bg-black`, `text-gray-*`, `border-gray-*` em telas de negócio;
- não usar `dark:` para compensar uma cor que deveria ser token semântico;
- manter contraste mínimo e testar cada componente nos seis variants de tema;
- padronizar títulos, pesos e tamanhos: página `text-2xl/font-semibold`, seção
  `text-lg/font-semibold`, corpo `text-sm` ou `text-base`, apoio `text-xs`;
- limitar pesos a 400, 500, 600 e 700; reservar `font-display` para experiências
  de jogos ou branding explícito;
- definir escala de espaçamento, raio e sombra em primitives, não em cada página;
- revisar a aplicação de `data-theme` e `.dark` para que a combinação de tema e
  modo seja sempre refletida no mesmo elemento raiz;
- criar uma página/story de tokens com exemplos de superfície, borda, texto, botão,
  formulário, tabela, status e foco em light/dark.

## 8. Performance e carregamento

- manter páginas como Server Components quando não precisarem de interação;
- mover apenas a parte interativa para componentes `use client` menores;
- evitar `useEffect` para fetch inicial quando a tela puder receber dados no servidor;
- usar cache/invalidação de domínio e cancelar requests ao desmontar;
- paginar membros, feed, vendas, notificações e listagens grandes;
- pedir apenas campos necessários e evitar carregar membros repetidos em cada widget;
- usar `Promise.all` somente para chamadas independentes e com tratamento parcial;
- aplicar debounce em busca e filtros que consultam API;
- usar `next/image` ou `AppImage` para imagens de produtos, avatars e branding;
- lazy-load jogos, gráficos, PDF/XLSX e módulos pesados fora do caminho inicial;
- não persistir sessão completa, dados sensíveis ou listas grandes no localStorage;
- revisar hydration mismatch causado por tema, Zustand persistido e IndexedDB;
- medir bundle e renderizações antes/depois com Lighthouse e React Profiler;
- manter acessibilidade como requisito de performance percebida e não apenas visual.

## 9. Migração por domínio

### Fase 0 — fundação

- [ ] Adicionar Zod e resolver do RHF.
- [ ] Criar `src/lib/api` global com erros e tipos.
- [ ] Definir padrão de hooks de dados e política de cache.
- [ ] Consolidar tokens e criar matriz visual light/dark.
- [ ] Criar componentes de formulário e estados de tela comuns.
- [ ] Definir convenção de pastas, nomes e exports.

### Fase 1 — CRUDs simples

- [ ] Migrar membros para `features/members` com list/detail, schema e FormCreate/FormEdit/FormUI.
- [ ] Migrar materiais para `features/materials`.
- [ ] Migrar produtos de cantina para `features/canteen/forms`.
- [ ] Migrar vagas de estacionamento para `features/parking`.
- [ ] Substituir `src/components/forms/MemberForm.tsx` e `ProductForm.tsx` pelos forms de domínio.

### Fase 2 — operação e administração

- [ ] Migrar planos e tenants do admin para APIs/hooks/forms do domínio global.
- [ ] Migrar branding/configurações com upload e preview reutilizáveis.
- [ ] Migrar grupos, equipes, crianças e pastoral.
- [ ] Criar tabelas, filtros, dialogs e ações compartilhadas sem duplicar markup.

### Fase 3 — fluxos complexos

- [ ] Refatorar cantina completa: catálogo, PDV, pedidos, preparo, vendas, ledger e fidelidade.
- [ ] Refatorar feed e comentários com cache/invalidação e publicação por escopo.
- [ ] Refatorar `minha-conta`, carteira e notificações.
- [ ] Refatorar tarefas, escalas e grupos/[id] reduzindo a responsabilidade das páginas.

### Fase 4 — experiências especiais

- [ ] Separar Bible Reader, Quiz e jogos do bundle administrativo.
- [ ] Definir APIs e stores específicas para jogos sem misturar estado de jogo com UI global.
- [ ] Revisar offline, Dexie, fila de sync e indicadores de conectividade.

## 10. Critérios de aceite

- [ ] Nenhum CRUD novo usa `useState` manual para todos os campos sem justificativa.
- [ ] Cada CRUD migrado possui schema, tipos, FormCreate, FormEdit e FormUI.
- [ ] Nenhum componente de frontend de domínio chama `fetch` diretamente.
- [ ] Todas as chamadas passam pelo cliente API global e API do domínio.
- [ ] Nenhuma página de domínio ultrapassa responsabilidade de composição e estado da tela.
- [ ] Cores, bordas, fontes, pesos e estados usam tokens semânticos.
- [ ] Componentes compartilhados funcionam nos modos light/dark e em mobile.
- [ ] Dados remotos não são duplicados em Zustand sem motivo documentado.
- [ ] Listas grandes possuem paginação, filtro ou carregamento incremental.
- [ ] Formulários têm mensagens acessíveis e tratamento de 401/403/422.
- [ ] Testes cobrem schemas, hooks de API e estados loading/success/error/empty.
- [ ] Build, lint, TypeScript e testes passam antes de considerar uma fase concluída.

## 11. Ordem imediata recomendada

1. Criar a fundação de API, schemas e componentes comuns.
2. Migrar membros como primeiro vertical slice completo.
3. Migrar produtos da cantina para validar upload, offline e CRUD.
4. Aplicar o padrão a materiais e estacionamento.
5. Só depois migrar as páginas grandes de grupos, feed, cantina e minha-conta.

Cada etapa deve atualizar este documento, registrar componentes promovidos para
`common` e remover explicitamente as duplicações substituídas.
