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
- [x] O cache novo diferencia tradução, livro e capítulo.
- [x] A tela principal em `src/app/bible/page.tsx` consulta o cache Dexie antes da rede.
- [x] O hook de Bíblia envia a tradução à API e usa a camada de cache compartilhada.
- [x] O catálogo de livros e capítulos é salvo no cache quando consultado.
- [x] Os capítulos de exemplo foram removidos do fluxo de leitura offline.

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

- [x] Reiniciar o schema Dexie em `version(1)` para o ambiente de desenvolvimento.
- [x] Definir `BibleBookmark` com tradução desde a primeira versão do novo banco local.
- [x] Criar `offlineBibleBooks`, `offlineBibleChapters` e `offlineBibleDownloads`.
- [x] Remover o seed de capítulos de exemplo do fluxo de leitura offline.
- [x] Definir tipo compartilhado de tradução e referências para a camada de cache.

Aceite:

- [x] Capítulos de versões diferentes nunca compartilham a mesma chave local.
- [x] Um marcador de Gênesis 1 em NVI não marca Gênesis 1 em ACF ou AA.
- [x] O novo banco local inicia sem dados legados, conforme a política de desenvolvimento.

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

- [x] Criar `features/bible/api` para encapsular o acesso HTTP à Bíblia.
- [x] Criar acesso de capítulo com estratégia: Dexie primeiro e rede como fallback.
- [x] Criar cache de catálogo para livros e capítulos offline.
- [x] Atualizar `src/app/bible/page.tsx` para usar a camada de cache.
- [x] Exibir estado claro quando o capítulo veio do dispositivo.
- [x] Adaptar o drawer de livros/capítulos para funcionar com o catálogo cacheado.

Aceite:

- [x] Um capítulo já lido abre em modo avião.
- [x] A seleção de versão respeita o cache correspondente.
- [x] Sem cache e sem rede, a interface informa como baixar a versão quando houver conexão.

## Fase 4 — Download de versões

- [x] Criar ação “Baixar para leitura offline” na gaveta de versões.
- [x] Permitir baixar NVI, ACF ou AA independentemente.
- [x] Baixar capítulos com concorrência limitada e progresso persistido no Dexie.
- [x] Permitir pausar, retomar e remover uma versão baixada.
- [ ] Solicitar confirmação antes de iniciar, informando espaço estimado e licença aplicável.
- [x] Não manter conteúdo parcial como `ready`; registrar `downloading`, `paused` ou `error`.

Aceite:

- [x] O usuário pode baixar uma versão e ler seus capítulos offline.
- [x] Reabrir o app durante o download permite retomar de onde parou.
- [x] Remover ACF não afeta NVI, AA, favoritos ou dados do tenant.

## Fase 5 — PWA e qualidade

- [ ] Cachear o shell da tela da Bíblia no service worker, sem confundir cache HTTP com
      conteúdo persistente no Dexie.
- [ ] Medir espaço usado por versão no IndexedDB e tratar quota excedida.
- [ ] Não usar `localStorage` para textos bíblicos completos.
- [ ] Testar em navegador sem conexão, aba privada e armazenamento quase cheio.
- [x] Adicionar testes unitários para chave de cache, download e fallback offline.
- [ ] Adicionar teste de interface: capítulo cacheado abre offline; capítulo ausente mostra
      estado orientativo.

## Critério de conclusão

- [ ] A Bíblia continua sendo consultada centralmente em `bible.db` quando online.
- [ ] Catálogo, capítulos lidos e versões baixadas funcionam offline pelo Dexie.
- [ ] A cache é isolada por tradução e não conflita com marcadores.
- [ ] Downloads são opcionais, retomáveis e removíveis.
- [ ] O app apresenta estados claros de conexão, progresso, erro e conteúdo disponível.
