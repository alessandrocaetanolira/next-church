# TODO — Offline-first do Church App

## Objetivo

Permitir que o aplicativo abra sem conexão, leia dados previamente baixados,
registre alterações localmente e sincronize com a API quando a conexão retornar.

O servidor continua sendo a fonte oficial. O Serwist será responsável pelo shell
e pelos assets; o Dexie será responsável pelos dados e pela fila de sincronização.

## Estado atual

- [x] Next.js 16 com Turbopack.
- [x] Manifest em `src/app/manifest.ts`.
- [x] Service Worker gerado pelo Serwist.
- [x] Precache gerado a partir do build.
- [x] Fallback `/offline`.
- [x] Escopo do Service Worker configurado para `/`.
- [x] `/api/*` fora do Cache Storage.
- [x] Bíblia, favoritos e anotações com cache Dexie.
- [ ] Validar abertura e refresh totalmente offline em navegador/dispositivo real.
- [x] Adicionar ícones PNG PWA 192x192 e 512x512 no `next-church`.
- [x] Definir persistência de branding PWA por tenant com fallback para o branding padrão do app.

## Fase 1 — Shell PWA offline

- [x] Gerar o Service Worker durante `next build`.
- [x] Registrar o worker somente através do `SerwistProvider`.
- [x] Remover o registro manual antigo.
- [x] Liberar `/serwist/*` no `proxy.ts`.
- [x] Precachear `/`, `/bible`, `/auth/login` e `/offline`.
- [x] Configurar fallback de navegação para `/offline`.
- [ ] Confirmar que o shell abre após fechar o navegador e desligar a rede.
- [ ] Confirmar que `/bible` funciona após refresh offline.
- [ ] Revisar se páginas autenticadas/RSC não estão sendo armazenadas de forma insegura.
- [ ] Adicionar PNGs 192x192, 512x512 e `apple-touch-icon`.
- [ ] Verificar instalação no Chrome Android e Safari iOS.

## Fase 1.5 — Branding PWA dinâmico por tenant

O banco global já possui `Church.name` e `Church.logoUrl`. Esses campos devem
continuar sendo o fallback institucional, mas o PWA precisa de configuração
explícita para não confundir o nome da igreja com o nome de instalação do app.

### Decisão de modelagem

Não usar um JSON como única fonte dos campos essenciais. Nome, ícones, cores e
versão de branding precisam ser validados, migrados e usados diretamente pelo
manifest e pelo tema. A recomendação é um modelo híbrido:

- [x] Manter campos essenciais tipados em `ChurchBranding` no modelo global.
- [x] Usar `configJson TEXT` apenas para extensões futuras não críticas.
- [ ] Validar `brandingConfig` com schema Zod antes de ler ou persistir.
- [ ] Versionar o formato do JSON (`schemaVersion`) e rejeitar versões inválidas.
- [ ] Não duplicar no JSON valores que também existam em colunas essenciais.
- [x] Centralizar fallback e normalização em um serviço de branding.

No SQLite, o JSON deve ser armazenado como `TEXT` serializado. O painel não deve
editar essa string diretamente: o CRUD trabalha com um objeto tipado e o servidor
faz parse, validação, normalização e serialização.

- [x] Adicionar `pwaName` e `pwaShortName` em `ChurchBranding`.
- [x] Adicionar campos separados para ícones `icon192Url` e `icon512Url`.
- [x] Adicionar `themeColor` e `backgroundColor` em `ChurchBranding`.
- [x] Adicionar `primaryColor` e `secondaryColor` em `ChurchBranding`.
- [ ] Adicionar suporte visual completo a `pwaThemeColor` e `pwaBackgroundColor` se forem
      necessários para personalização completa da instalação.
- [ ] Adicionar cores de marca opcionais `brandPrimaryColor` e
      `brandSecondaryColor`.
- [ ] Definir se `primary` será usado como `theme_color` do manifest e `secondary`
      como cor de apoio/background do PWA.
- [ ] Definir fallback: `pwaName` → `Church.name` → `Church App`.
- [ ] Definir fallback de ícone: ícone PWA do tenant → `pwa-512x512.png`/
      `pwa-192x192.png` padrão do app.
- [x] Criar migration global para `ChurchBranding`.
- [x] Atualizar provisionamento e seed sem exigir branding personalizado.
- [x] Expor branding público resolvido pelo tenant sem retornar dados sensíveis.
- [x] Reutilizar `/api/settings/branding` para GET e PATCH do branding do tenant.
- [x] Implementar upsert administrativo da configuração de branding.
- [x] Restringir atualização a ADMIN/PASTOR com permissão de settings.
- [x] Validar nomes, cores e tamanho/formato dos arquivos no servidor.
- [ ] Exibir preview de nome, logo, cor primária e cor secundária no admin.
- [ ] Permitir restaurar o branding padrão do app.
- [ ] Registrar `updatedAt`/`brandingVersion` a cada alteração.
- [ ] Resolver o tenant do manifest por hostname, slug ou contexto público definido.
- [ ] Tornar `/manifest.webmanifest` dinâmico por tenant.
- [ ] Alterar `metadata.title`, `appleWebApp.title` e ícones do layout conforme o
      branding resolvido.
- [ ] Aplicar `primary` e `secondary` às variáveis CSS do tema sem depender de
      classes Tailwind geradas estaticamente.
- [ ] Validar formato das cores (hex/RGB/HSL) e rejeitar valores inválidos.
- [ ] Verificar contraste mínimo entre texto e as cores personalizadas.
- [ ] Atualizar preview de branding antes de salvar no painel administrativo.
- [ ] Garantir que o manifest não seja precacheado como se fosse igual para todos
      os tenants.
- [ ] Definir cache runtime versionado para manifest e ícones por tenant.
- [ ] Invalidar o cache de branding quando `brandingVersion` ou `updatedAt` mudar.
- [ ] Garantir que o Service Worker não misture logo, manifest ou nome de tenants.
- [ ] Permitir que tenant sem imagem continue usando os ícones padrão.
- [ ] Validar instalação do PWA com dois tenants no mesmo navegador/dispositivo.
- [ ] Validar atualização do nome/logo sem reinstalar o aplicativo manualmente.

### Contrato sugerido

```text
Church
├── name                 nome institucional da igreja
├── logoUrl              logo geral já existente
├── pwaName              nome exibido na instalação do PWA
├── pwaShortName         nome curto opcional
├── pwaIcon192Url        ícone 192x192 opcional
├── pwaIcon512Url        ícone 512x512 opcional
├── brandPrimaryColor    cor primária da igreja opcional
├── brandSecondaryColor  cor secundária da igreja opcional
├── pwaThemeColor        cor da interface/instalação opcional
├── pwaBackgroundColor   cor de splash opcional
└── brandingVersion      versão para invalidação de cache
```

O armazenamento deve aceitar uma única imagem original apenas se houver uma
estratégia confiável para gerar os tamanhos exigidos. Caso contrário, devem ser
armazenadas duas URLs otimizadas, uma para 192x192 e outra para 512x512.

## Fase 2 — Modelo local Dexie

- [x] Definir versão/migration única para o schema offline atual (v1).
- [x] Criar tabela `offlineMetadata` para versão do conteúdo e último sync.
- [x] Criar tabela `syncQueue` para operações pendentes.
- [x] Criar tabela `offlineUserState` para o estado mínimo da sessão local.
- [ ] Definir chaves compostas por tenant, usuário e entidade quando necessário.
- [ ] Garantir que dados de tenants diferentes nunca compartilhem índices locais.
- [ ] Evitar armazenar senhas ou tokens persistentes em texto puro.
- [ ] Criar testes de migration e recuperação de banco local.

Modelo mínimo da fila:

```text
id, tenantSlug, userId, entity, entityId, operation, payload,
createdAt, status, retryCount, lastError, idempotencyKey
```

## Fase 3 — Bíblia offline

- [x] Usar Dexie como fallback da leitura bíblica.
- [x] Separar cache por tradução, livro e capítulo.
- [x] Persistir favoritos e anotações localmente.
- [x] Permitir download opcional das versões.
- [ ] Completar o fluxo com as três versões disponíveis.
- [ ] Criar manifesto de conteúdo com `contentVersion`/hash.
- [ ] Atualizar somente capítulos quando a versão do conteúdo mudar.
- [ ] Retomar downloads interrompidos sem apagar capítulos íntegros.
- [ ] Tratar quota excedida do IndexedDB.
- [ ] Testar versão cacheada, versão ausente e versão desatualizada offline.

## Fase 4 — Sessão e modo offline

- [x] Exibir indicador de modo offline.
- [x] Persistir somente o estado mínimo da última sessão válida.
- [ ] Permitir navegação offline sem redirecionamento indevido para login.
- [ ] Marcar a sessão como `offline` no cliente.
- [ ] Bloquear claramente ações que exigem servidor.
- [ ] Permitir leitura somente dos dados previamente sincronizados.
- [ ] Limpar a sessão local no logout explícito.
- [ ] Testar expiração/revogação da sessão após reconexão.

## Fase 5 — Contrato de sincronização da API

- [ ] Padronizar `updatedAt`, `deletedAt` e versão dos registros.
- [x] Adicionar `idempotencyKey` às mutações.
- [ ] Criar `POST /api/sync/push` para envio em lote.
- [ ] Criar `GET /api/sync/pull` para alterações desde um cursor.
- [ ] Criar `GET /api/sync/status` para diagnóstico.
- [ ] Garantir escopo por tenant e usuário em todas as operações.
- [ ] Definir respostas para sucesso parcial, conflito e autorização expirada.
- [ ] Documentar política de resolução de conflitos.

## Fase 6 — Motor de sincronização

- [x] Implementar `syncService` único no frontend.
- [x] Detectar eventos `online` e `offline`.
- [x] Processar a fila com retry e estado de erro persistido.
- [x] Usar `idempotencyKey` para impedir duplicidade na migração da fila.
- [x] Persistir falhas e permitir retry manual.
- [ ] Atualizar o Dexie após confirmação do servidor.
- [ ] Processar pull incremental após o push.
- [ ] Exibir progresso e erros de sincronização.
- [ ] Garantir que uma falha isolada não bloqueie outras operações.
- [ ] Avaliar Background Sync apenas depois do fluxo principal estar estável.

## Fase 7 — Módulos offline por prioridade

- [ ] Bíblia, favoritos e anotações.
- [ ] Perfil e configurações pessoais.
- [ ] Notificações previamente carregadas.
- [ ] Feed essencial.
- [ ] Grupos e equipes.
- [ ] Tarefas e escalas.
- [ ] Materiais.
- [ ] Produtos da cantina.
- [ ] Vendas, créditos e estoque.
- [ ] Relatórios.

Os módulos de cantina devem ser os últimos por envolverem estoque, vendas,
créditos e conflitos concorrentes.

## Fase 8 — Testes e aceite

### Testes automatizados

- [ ] Testar migrations do Dexie.
- [ ] Testar leitura cache-first.
- [ ] Testar escrita offline.
- [ ] Testar inclusão e remoção da fila.
- [ ] Testar retry e backoff.
- [ ] Testar idempotência.
- [ ] Testar conflitos.
- [ ] Testar isolamento por tenant.
- [ ] Testar sessão offline.
- [ ] Testar fallback `/offline`.

### Teste real de produção

- [ ] Executar `npm run build`.
- [ ] Executar `npm start`.
- [ ] Abrir o app online uma vez.
- [ ] Confirmar Service Worker `activated`.
- [ ] Acessar `/bible` e baixar uma versão.
- [ ] Criar favorito e anotação.
- [ ] Fechar completamente o app.
- [ ] Desligar a rede do dispositivo.
- [ ] Abrir novamente o app.
- [ ] Atualizar a rota principal offline.
- [ ] Atualizar `/bible` offline.
- [ ] Navegar por livros e capítulos disponíveis.
- [ ] Restaurar a rede.
- [ ] Confirmar sincronização e ausência de duplicidades.

## Critério de conclusão

- [ ] O app abre sem rede e sem tela branca.
- [ ] A rota principal e `/bible` suportam refresh offline.
- [ ] Dados bíblicos vêm do Dexie, não do Cache Storage.
- [ ] APIs não são armazenadas como cache de dados.
- [ ] Alterações offline entram na fila.
- [ ] A reconexão sincroniza automaticamente.
- [ ] Operações repetidas não criam duplicidades.
- [ ] Dados permanecem isolados por tenant e usuário.
- [ ] O fluxo funciona em desktop e dispositivo móvel.

## Documentos relacionados

- [Bíblia offline com Dexie](./bible-offline-todo.md)
- [Arquitetura em camadas](./layered-architecture-todo.md)
- [Separação de tenants](./tenant-separation-todo.md)
### Regra arquitetural obrigatória

As rotas HTTP (`src/app/api/**/route.ts`) não podem instanciar ou chamar repositories/services diretamente. Elas devem apenas delegar ao controller HTTP. A composição de dependências, autenticação/autorização e orquestração ficam no controller; regras de negócio no service; persistência no repository.
