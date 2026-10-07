# TODO — Dashboard e integridade operacional da Cantina

## Objetivo

Substituir os dados demonstrativos do Dashboard por agregados reais, isolados por
tenant e autorização, e impedir que o carrinho permita uma venda quando a Cantina
estiver fechada. O servidor continua sendo a autoridade final em toda criação de
venda.

## Regras inegociáveis

- Rotas chamam apenas controllers; controllers chamam services; services chamam
  repositories. Nenhuma rota consulta Prisma diretamente.
- Toda agregação é restrita ao banco do tenant da sessão.
- A UI melhora a experiência, mas não substitui a validação no backend.
- Valores financeiros, estoque e estado de abertura são sempre confirmados pelo
  servidor antes de concluir uma venda.
- O carrinho persistido é isolado por `tenantId` e usuário; nunca pode reaparecer
  após trocar de igreja ou conta.

## Fase 1 — Contrato real do Dashboard

- [x] Criar `GET /api/dashboard/summary`.
- [x] Criar `dashboard.controller.ts`, `dashboard.service.ts`,
      `dashboard.repository.ts` e `dashboard.policy.ts`.
- [x] Definir contrato tipado único:

  ```ts
  {
    tasks: {
      completedToday: number;
      pendingToday: number;
      upcoming: DashboardTask[];
    } | null;
    canteen: {
      salesToday: number;
      lowStock: number;
    } | null;
  }
  ```

- [x] Retornar `null` para blocos que o perfil não está autorizado a consultar;
      o frontend não deve exibir cards sem permissão.
- [x] Cobrir ADMIN, PASTOR e LEADER, aplicando o escopo de equipes ao líder.

### Regras de cálculo

- [x] Usar início/fim do dia em `America/Sao_Paulo` para tarefas e vendas.
- [x] `completedToday`: tarefas não removidas, com status concluído, na data do dia.
- [x] `pendingToday`: tarefas não removidas, não concluídas, na data do dia.
- [x] `salesToday`: soma das vendas não removidas, não canceladas e não pendentes
      criadas no dia. Documentar explicitamente os status incluídos.
- [x] `lowStock`: produtos ativos, não removidos, onde `stock <= minStock` e
      `minStock > 0`.
- [x] `upcoming`: próximas tarefas permitidas, ordenadas por data e com limite
      explícito no repository.

### Frontend e aceite da Fase 1

- [x] Criar `features/dashboard/api/dashboard.api.ts` e hook de resumo.
- [x] Remover os números mockados de `LeaderDashboard`.
- [x] Renomear os cards para “Concluídas hoje” e “Pendentes hoje”.
- [x] Substituir o placeholder de tarefas pela lista retornada pela API e por um
      estado vazio real.
- [x] Ocultar ação “Nova tarefa” sem a permissão correspondente.
- [x] Testar controller, service, repository e rota para tenant, escopo de líder,
      fuso horário, cancelamento de venda e estoque baixo.

**Aceite:** alterar uma tarefa, venda ou estoque no banco do tenant atual atualiza
somente os cards autorizados desse tenant; nenhum card apresenta número fixo.

## Fase 2 — Estado operacional compartilhado da Cantina

- [x] Criar hook/API de status compartilhado para PDV e Checkout.
- [x] Permitir `GET /api/canteen/status` para quem possui `canteen:sell` ou
      `canteen:order`, além das permissões atuais de visualização/operação.
- [~] Atualizar o status ao entrar em PDV/Checkout e ao retornar ao app. Falta
      integrar um evento em tempo real de abertura/fechamento.
- [x] Exibir aviso persistente e acessível “Cantina fechada” no carrinho e checkout.
- [x] Desabilitar “Finalizar venda” e “Confirmar venda” quando fechada, com motivo
      textual visível, não apenas tooltip.
- [x] Manter o bloqueio atual em `CanteenSalesService.create()` e cobrir a resposta
      `409 Conflict` no cliente para alterações de estado ocorridas após abrir a tela.
- [ ] Revisar envio offline: uma venda não pode ser considerada concluída localmente
      se o servidor a rejeitar por Cantina fechada durante a sincronização.

**Aceite:** fechar a Cantina em outro dispositivo bloqueia o checkout aberto após
revalidação; tentar burlar a UI continua recebendo `409` do backend.

## Fase 3 — Carrinho único e persistente

- [x] Remover a duplicidade entre `features/canteen/store.ts` e
      `features/canteen/store/useCartStore.ts`.
- [x] Manter um único Zustand com `persist` e versão de schema.
- [x] Incluir identidade do dono do carrinho (`tenantId`, `userId`) no estado
      persistido e validar a identidade antes de hidratar itens.
- [x] Limpar ou separar o carrinho ao logout, troca de tenant, troca de usuário e
      venda confirmada.
- [ ] Revalidar produtos, disponibilidade, preço e estoque ao restaurar carrinho;
      itens inválidos devem ser destacados/removidos com explicação ao usuário.
- [ ] Definir política de expiração para carrinho abandonado e implementar limpeza
      previsível.
- [ ] Garantir que pedido de membro e PDV de operador não compartilhem itens sem
      contexto explícito.

**Aceite:** sair e retornar ao mesmo usuário/tenant restaura o carrinho válido;
trocar de conta ou igreja nunca mostra os itens anteriores; concluir a venda limpa o
carrinho correto.

## Fase 4 — Carteira e extrato do membro

### Segurança e arquitetura

- [x] Substituir o acesso direto ao Prisma em `/api/members/me/financials` pela
      cadeia rota → controller → service → repository.
- [x] Criar política exclusiva de leitura da própria carteira: um MEMBER pode
      consultar apenas o membro vinculado à sua sessão, sem precisar receber
      `members:view` nem acesso à listagem de membros.
- [x] Resolver o membro por `linkedMemberId`, com fallback seguro para e-mail
      normalizado somente durante a compatibilidade de contas legadas.
- [x] Garantir tenant obrigatório em toda consulta de saldo, compras e extrato.

### Fonte de dados e atualização do frontend

- [x] Definir `MemberWallet` como contrato único: saldo atual, resumo de débitos,
      pagamentos e lançamentos paginados.
- [x] Disponibilizar em “Minha conta” uma seção pessoal de Alertas, usando o
      provider compartilhado de Push para permitir ativar/desativar notificações
      no dispositivo atual sem expor as configurações administrativas da igreja.
- [~] Não manter `financialMember` em estado React como fonte prioritária após o
      Dexie mudar; usar uma fonte única ou atualizar ambas de forma atômica.
- [~] Ao registrar venda em fiado, atualizar o membro local com o saldo confirmado
      pelo servidor e sincronizar a lista operacional de devedores.
- [ ] Ao registrar pagamento, manter a atualização otimista apenas até a resposta;
      em conflito/erro, restaurar ou sincronizar o saldo oficial.
- [x] Reagir a SSE/notificações `canteen-credit-debit` e
      `canteen-credit-payment`, revalidando a carteira e o cache Dexie.
- [ ] Revalidar no retorno ao app, ao ficar online e após concluir sincronização
      offline.

### Extrato para o membro

- [~] Criar endpoint de extrato próprio, combinando `CreditTransaction`
      com compras relevantes da Cantina, sem expor compras de outros membros.
- [x] Exibir saldo pendente, total de cobranças, total pago e estado “em dia”.
- [~] Exibir linha cronológica com data/hora, tipo, descrição e valor após
      cada lançamento: compra em fiado, pagamento parcial, quitação e ajuste.
- [~] Usar paginação por cursor no backend e `SharedFlatList` com infinite scroll
      no mobile; filtros básicos por período e tipo continuam pendentes.
- [ ] Tratar estados offline com a última cópia conhecida, sinalização explícita e
      atualização quando a conexão retornar.

### Testes e aceite

- [x] Cobrir MEMBER sem `members:view`, MEMBER vinculado, membro inexistente e
      isolamento entre tenants.
- [ ] Cobrir venda em fiado, pagamento parcial, quitação completa, cancelamento e
      falha de sincronização offline.
- [ ] Cobrir atualização por evento em tempo real sem recarregar a página.

**Aceite:** o membro abre a Carteira e vê exclusivamente seu saldo e extrato; uma
compra em fiado ou pagamento feito em outro dispositivo atualiza a tela e o cache
local, sem conceder acesso administrativo ao módulo de membros.

## Ordem de execução e validação final

1. Fase 1: backend e frontend do Dashboard, com testes.
2. Fase 2: status da Cantina e bloqueio operacional, com testes de API/UI.
3. Fase 3: migração do carrinho, testes de persistência e isolamento.
4. Fase 4: segurança, atualização e extrato da Carteira.
5. Rodar `npm test`, `npm run typecheck`, lint e build.
6. Validar em dispositivo mobile: cantina aberta/fechada, troca de usuário,
   reinicialização do PWA e venda offline/online.
