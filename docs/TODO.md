# TODO principal — Church App

Este é o índice canônico de trabalho. Os documentos de domínio abaixo mantêm o
detalhamento técnico; este arquivo contém apenas o estado e a ordem de execução.

## Estado atual

- [x] Next.js 16 + Turbopack + TypeScript.
- [x] Prisma separado em global, tenant e Bíblia compartilhada.
- [x] Arquitetura Route → Controller → Service → Repository aplicada aos principais módulos.
- [x] Cantina com produtos, PDV, preparo, pedidos, fiado, pagamentos e notificações.
- [x] Feed, grupos, membros, materiais, pastoral, infantil, estacionamento e Quiz com services próprios.
- [x] PWA com Serwist, manifest, fallback `/offline` e precache gerado no build.
- [x] Bíblia com Dexie, favoritos, anotações e download opcional.
- [x] Notificações internas, SSE e Web Push.
- [x] Branding por tenant, cores, logos e configuração do PWA.
- [ ] E-mail transacional ainda não implementado.

## Prioridade 1 — Estabilização

- [ ] Executar a suíte completa fora do sandbox e corrigir falhas reais, separando-as de limitações de subprocesso.
- [ ] Corrigir migrations pendentes em ambientes existentes antes de consultar colunas novas.
- [ ] Revalidar `npm run build` após as últimas alterações de branding/layout.
- [ ] Reduzir warnings relevantes de lint, principalmente imagens e configuração do Vitest.
- [ ] Atualizar o estado de validação no README após cada rodada.

## Prioridade 2 — Permissões e experiência de acesso

- [ ] Completar escopo de líder em grupos, materiais e tarefas.
- [ ] Garantir que o administrador veja todos os módulos autorizados, incluindo Cantina.
- [ ] Persistir permissões no store após login e atualizar via SSE.
- [ ] Cobrir permissões com testes de policy, service e resposta HTTP.

## Prioridade 3 — Offline-first real

- [ ] Validar abertura e refresh offline em dispositivo real.
- [ ] Garantir sessão offline sem redirecionamento indevido para login.
- [ ] Isolar cache Dexie por tenant e usuário.
- [ ] Completar sincronização, retry, conflitos e quota do IndexedDB.
- [ ] Validar Bíblia offline com as três versões e downloads interrompidos.
- [ ] Validar branding e manifest sem mistura entre tenants.

## Prioridade 4 — Cantina

- [ ] Adicionar consumidor intencional `VISITOR` sem criar membro falso.
- [ ] Diferenciar no PDV: membro, visitante e não identificado.
- [ ] Impedir fiado para visitante/não identificado.
- [ ] Adicionar filtros e relatórios por tipo de consumidor.
- [ ] Revisar PDF de vendas e operação de remoção de pedidos prontos.

## Prioridade 5 — Branding e UI

- [ ] Preview de branding no painel administrativo.
- [ ] Restaurar branding padrão do app.
- [ ] Alternar logo claro/escuro conforme o tema.
- [ ] Atualizar metadata/title e ícones dinamicamente por tenant.
- [ ] Consolidar `AppImage`, `ErrorState`, `ActionMenu` e filtros compartilhados.
- [ ] Validar carregamento inicial e fallback de logo após login.

## Prioridade 6 — Notificações e e-mail

- [x] Broker SSE, persistência interna e Web Push.
- [x] Eventos compartilhados para Cantina e demais módulos principais.
- [ ] Adicionar testes para remetente, entrega e eventos de crédito.
- [ ] Implementar e-mail transacional com provider, templates, fila, retry e idempotência.

## Prioridade 7 — Módulos de baixa prioridade

- [ ] Refatorar Jogos conforme [games-todo.md](./games-todo.md).
- [ ] Completar melhorias de frontend conforme [frontend-todo.md](./frontend-todo.md).

## Documentos detalhados

- [Roadmap](./roadmap.md)
- [Arquitetura em camadas](./layered-architecture-todo.md)
- [Separação de tenants](./tenant-separation-todo.md)
- [Offline-first](./offline-first-todo.md)
- [Bíblia offline](./bible-offline-todo.md)
- [E-mail transacional](./email-todo.md)
- [Frontend](./frontend-todo.md)
- [Jogos](./games-todo.md)
