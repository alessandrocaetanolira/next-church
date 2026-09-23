# TODO — Bíblia offline com Dexie

## Objetivo

Permitir a leitura da Bíblia sem conexão, mantendo `bible.db` como fonte de verdade
compartilhada no servidor e usando Dexie/IndexedDB apenas como cache local do aparelho.

O aplicativo não deve duplicar automaticamente AA, ACF e NVI em todos os dispositivos.
O usuário escolhe quais versões deseja baixar para leitura offline.

## Estado atual

- [x] O servidor possui `bible.db` compartilhado com AA, ACF e NVI.
- [x] A API recebe a tradução em `translation`.
- [x] O cliente possui Dexie em `src/lib/db.ts`.
- [ ] `bibleChapters` não diferencia tradução.
- [ ] A tela principal em `src/app/bible/page.tsx` não consulta o cache Dexie.
- [ ] O hook legado `src/features/bible/hooks/use-bible.ts` não envia tradução à API.
- [ ] O catálogo de livros e capítulos não está disponível offline.
- [ ] Os capítulos de exemplo em `src/lib/db-seeds.ts` não representam uma estratégia
      confiável de cache offline.

## Modelo Dexie alvo

Substituir o cache legado por tabelas versionadas no Dexie:

```ts
type OfflineBibleBook = {
  translation: 'AA' | 'ACF' | 'NVI';
  abbrev: string;
  name: string;
  testament: 'AT' | 'NT';
  position: number;
  contentVersion: string;
};

type OfflineBibleChapter = {
  translation: 'AA' | 'ACF' | 'NVI';
  bookAbbrev: string;
  chapter: number;
  verses: string[];
  cachedAt: string;
  contentVersion: string;
};

type OfflineBibleDownload = {
  translation: 'AA' | 'ACF' | 'NVI';
  status: 'idle' | 'downloading' | 'ready' | 'error';
  downloadedChapters: number;
  totalChapters: number;
  contentVersion: string;
  updatedAt: string;
};
```

Índices mínimos:

```text
books:    [translation+abbrev], translation, testament
chapters: [translation+bookAbbrev+chapter], translation, bookAbbrev
downloads: translation
```

Marcadores continuam locais, mas devem usar `userId + translation + book + chapter`
para evitar colisão entre versões.

## Fase 1 — Base de cache

- [ ] Criar nova versão do schema Dexie sem apagar favoritos existentes.
- [ ] Migrar `BibleBookmark` para incluir tradução quando não houver valor legado;
      assumir `NVI` para marcadores antigos.
- [ ] Criar `offlineBibleBooks`, `offlineBibleChapters` e `offlineBibleDownloads`.
- [ ] Remover o seed de capítulos de exemplo do fluxo de leitura offline.
- [ ] Definir um tipo compartilhado para tradução e referências bíblicas.

Aceite:

- [ ] Capítulos de versões diferentes nunca compartilham a mesma chave local.
- [ ] Um marcador de Gênesis 1 em NVI não marca Gênesis 1 em ACF ou AA.
- [ ] Atualizar Dexie não apaga bookmarks existentes.

## Fase 2 — Contrato de sincronização

- [ ] Criar endpoint de manifesto do conteúdo bíblico: versões disponíveis, hash/versão,
      quantidade de livros e capítulos.
- [ ] Garantir que endpoints de livros, capítulos e versículos retornem metadados de
      cache (`translation`, `contentVersion` e abreviação do livro).
- [ ] Definir política de cache: conteúdo só é substituído quando `contentVersion` mudar.
- [ ] Documentar que as fontes e downloads respeitam a licença das traduções incluídas.

Aceite:

- [ ] O cliente identifica uma versão desatualizada sem baixar capítulos repetidos.
- [ ] Uma atualização interrompida não remove capítulos íntegros já disponíveis.

## Fase 3 — Leitura cache-first

- [ ] Criar `features/bible/api` para encapsular o acesso HTTP à Bíblia.
- [ ] Criar hook de capítulo com estratégia: Dexie primeiro, rede para atualizar quando
      disponível, Dexie como fallback quando a rede falhar.
- [ ] Criar hook de catálogo para livros e capítulos offline.
- [ ] Atualizar `src/app/bible/page.tsx` para usar os hooks; remover `fetch` direto.
- [ ] Exibir estado claro: online, salvo no aparelho ou indisponível offline.
- [ ] Adaptar o drawer de livros/capítulos para funcionar com o catálogo cacheado.

Aceite:

- [ ] Um capítulo já lido abre em modo avião.
- [ ] A seleção de versão respeita o cache correspondente.
- [ ] Sem cache e sem rede, a interface informa como baixar a versão quando houver conexão.

## Fase 4 — Download de versões

- [ ] Criar ação “Baixar para leitura offline” em Configurações ou na tela da Bíblia.
- [ ] Permitir baixar uma versão por vez: NVI, ACF ou AA.
- [ ] Baixar em lotes de capítulos com limite de concorrência e progresso persistido no Dexie.
- [ ] Permitir pausar, retomar e remover uma versão baixada.
- [ ] Solicitar confirmação antes de iniciar, informando espaço estimado e licença aplicável.
- [ ] Não manter conteúdo parcial como `ready`; registrar `downloading` ou `error`.

Aceite:

- [ ] O usuário pode baixar somente NVI e ler seus 1.189 capítulos offline.
- [ ] Reabrir o app durante o download permite retomar de onde parou.
- [ ] Remover ACF não afeta NVI, AA, marcadores ou dados do tenant.

## Fase 5 — PWA e qualidade

- [ ] Cachear o shell da tela da Bíblia no service worker, sem confundir cache HTTP com
      conteúdo persistente no Dexie.
- [ ] Medir espaço usado por versão no IndexedDB e tratar quota excedida.
- [ ] Não usar `localStorage` para textos bíblicos completos.
- [ ] Testar em navegador sem conexão, aba privada e armazenamento quase cheio.
- [ ] Adicionar testes unitários para chave de cache, migração Dexie e fallback offline.
- [ ] Adicionar teste de interface: capítulo cacheado abre offline; capítulo ausente mostra
      estado orientativo.

## Critério de conclusão

- [ ] A Bíblia continua sendo consultada centralmente em `bible.db` quando online.
- [ ] Catálogo, capítulos lidos e versões baixadas funcionam offline pelo Dexie.
- [ ] A cache é isolada por tradução e não conflita com marcadores.
- [ ] Downloads são opcionais, retomáveis e removíveis.
- [ ] O app apresenta estados claros de conexão, progresso, erro e conteúdo disponível.
