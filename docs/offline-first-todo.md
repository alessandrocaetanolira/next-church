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
- [ ] Adicionar ícones PNG PWA 192x192 e 512x512 no `next-church`.

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

## Fase 2 — Modelo local Dexie

- [ ] Definir versão/migration única para o schema offline atual.
- [ ] Criar tabela `offlineMetadata` para versão do conteúdo e último sync.
- [ ] Criar tabela `syncQueue` para operações pendentes.
- [ ] Criar tabela `offlineUserState` para o estado mínimo da sessão local.
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
- [ ] Persistir somente o estado mínimo da última sessão válida.
- [ ] Permitir navegação offline sem redirecionamento indevido para login.
- [ ] Marcar a sessão como `offline` no cliente.
- [ ] Bloquear claramente ações que exigem servidor.
- [ ] Permitir leitura somente dos dados previamente sincronizados.
- [ ] Limpar a sessão local no logout explícito.
- [ ] Testar expiração/revogação da sessão após reconexão.

## Fase 5 — Contrato de sincronização da API

- [ ] Padronizar `updatedAt`, `deletedAt` e versão dos registros.
- [ ] Adicionar `idempotencyKey` às mutações.
- [ ] Criar `POST /api/sync/push` para envio em lote.
- [ ] Criar `GET /api/sync/pull` para alterações desde um cursor.
- [ ] Criar `GET /api/sync/status` para diagnóstico.
- [ ] Garantir escopo por tenant e usuário em todas as operações.
- [ ] Definir respostas para sucesso parcial, conflito e autorização expirada.
- [ ] Documentar política de resolução de conflitos.

## Fase 6 — Motor de sincronização

- [ ] Implementar `syncService` único no frontend.
- [ ] Detectar eventos `online` e `offline`.
- [ ] Processar a fila com retry e backoff.
- [ ] Usar idempotência para impedir duplicidade.
- [ ] Persistir falhas e permitir retry manual.
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
