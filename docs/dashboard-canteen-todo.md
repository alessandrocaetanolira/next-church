# TODO — Dashboard e integridade operacional da Cantina

Atualizado em **16/10/2026**. As validações automatizadas abaixo não substituem o
aceite em artefato de produção no dispositivo.

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

- [x] Usar uma única store Zustand operacional, sem persistência, para cabeçalho,
      PDV/carrinho e Checkout; não confundir reutilização do hook com estado
      compartilhado (o hook anterior mantinha um `useState` por consumidor).
- [x] Isolar o estado por tenant/usuário, coalescer consultas e ignorar respostas
      anteriores a uma alteração de abertura ou troca de sessão.
- [x] Permitir `GET /api/canteen/status` para quem possui `canteen:sell` ou
      `canteen:order`, além das permissões atuais de visualização/operação.
- [~] Atualizar o status ao entrar em PDV/Checkout e ao retornar ao app. Falta
      integrar um evento em tempo real específico de fechamento. Montagem, foco,
      retorno online, visibilidade, reconexão do stream e notificação SSE
      `canteen-opened` já provocam revalidação.
- [x] Distinguir status não confirmado/erro de consulta de fechamento confirmado;
      apresentar retry sem exigir refresh da página.
- [x] Reconsultar o status antes de navegar ao checkout e antes do POST da venda;
      preservar o carrinho quando a consulta falha ou a operação está fechada.
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
- [x] Garantir contexto explícito para enviar pedido próprio ou abrir checkout
      de venda; apenas as ações autorizadas aparecem no carrinho compartilhado.

Em 16/10 os consumidores antigos de Minha Conta/Dashboard foram removidos.
`CanteenCartView` unifica catálogo/carrinho com banner no container e ações por
permissão. Chaves existentes de comprador/operador continuam preservadas, sem
mesclar rascunhos; pedido próprio é uma ação explícita, não outra aba.
Recuperação de rascunhos antigos em chaves alternativas, expiração e revalidação
completa ainda precisam seguir o checklist de compra unificada.

O push financeiro agora confirma mutação e recibo na mesma transação, vinculado
ao ator/tenant/conteúdo e reautorizado no replay. Comprar não concede alteração
de créditos; pagamentos inválidos/acima do débito são rejeitados. Outbox nova tem
dono na origem; legado sem vínculo verificável permanece para revisão. Isso não
conclui retry do POST direto, checkout operacional nem saneamento de caches/DTOs.

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

## Produtos — cards, detalhes e recomendação

- [x] Compartilhar o card do catálogo entre PDV, pedidos do membro e catálogo
      somente leitura; separar consulta de detalhes da ação de adicionar.
- [x] Compactar o card de compra: categoria sobre a imagem, descrição com `gap-1`,
      sem texto adicional de detalhes, preço à esquerda e estoque em “un.” à
      direita na mesma linha, alinhados ao início, com centavos menores. O clique
      continua abrindo a descrição completa.
- [x] Abrir detalhes pelo `DrawerProvider` padrão, com descrição completa inclusive
      sem foto; quantidade e produto acompanham o Zustand/Dexie sem reabrir o drawer.
- [x] Separar identificação, venda/custo/estoque e ações no card mobile de gestão.
- [x] Calcular `recommended` no backend pela soma de unidades em vendas confirmadas
      nos últimos **30 dias corridos**, dentro do banco do tenant da sessão.
- [x] Excluir pedidos pendentes, vendas canceladas e pedidos com status cancelado;
      incluir fiado confirmado e pedidos prontos arquivados, pois arquivar não
      desfaz a venda.
- [x] Destacar somente líderes entre produtos ativos, disponíveis hoje e com
      estoque; empates recebem o mesmo badge; histórico vazio não gera destaque.
- [x] Mostrar “Recomendado” no card e explicar o período nos detalhes, sem expor
      compradores, vendas individuais ou faturamento ao membro.
- [x] Manter o último resultado no Dexie para consulta offline e preservar os
      metadados no pull incremental do mesmo tenant. Não usar itens da sacola ou
      somente as últimas 50 vendas como fonte do ranking.
- [x] Ocultar metadados inválidos ou calculados há 30 dias ou mais; recalcular no
      próximo carregamento online do catálogo.
- [x] Testar consulta real em dois bancos temporários, exclusões por status/período,
      fiado/arquivamento, empates e cache de recomendação.
- [ ] Validar em produção mobile o fluxo: consultar descrição → adicionar → abrir
      a operação → finalizar a venda, com e sem histórico para recomendação.

**Banco dos ajustes de produtos já implementados:** não houve migration nova,
mudança de índices/tabelas ou incremento de
versão Dexie. `recommended` e `recommendationCalculatedAt` são propriedades
opcionais derivadas, não colunas do Prisma. `bible.db` não participa dessas mudanças
nem dos testes, que usam bancos isolados em diretórios temporários.

## Fase 5 — Compra unificada e remoção do pedido antigo da Carteira

Checklist detalhado e ordem obrigatória em
[canteen-purchase-unification-todo.md](./canteen-purchase-unification-todo.md).

- [~] Garantir compra pessoal de MEMBER/LEADER/PASTOR e operadores autorizados,
      sem exigir permissão de operação para comprar.
- [x] Exibir menu horizontal operacional somente a usuários com as permissões das
      respectivas ações; comprador vê catálogo e carrinho.
- [x] Permitir montar carrinho com Cantina fechada, mas bloquear envio/checkout até
      confirmar abertura; preservar itens e explicar indisponibilidade/erro.
- [x] Validar no backend produto ativo, disponível, não removido, estoque e preço
      oficial, inclusive na aprovação e replay de sincronização.
- [~] Compartilhar cards/detalhes/carrinho e entrada de pedidos; separar intenção
      pessoal do PDV por contexto, sem duplicar estado ou APIs.
- [ ] Adicionar observação opcional do comprador no checkout e persistir no pedido,
      rascunho, API e sync; exibir na aprovação e preparo. Criar migration tenant
      aditiva para `Sale.customerNotes`, sem reset e sem tocar em `bible.db`.
- [x] Remover somente o fluxo antigo de pedidos e seus resíduos do Dashboard,
      preservando Carteira, histórico, extrato, saldo, pagamentos e alertas.
      “Fazer pedido” usa `/cantina`, links antigos redirecionam e pedidos
      próprios são consultados pelo drawer padrão, sem liberar fila operacional.
- [x] Mostrar banner passivo no topo da compra/catálogo e atualizar abertura e
      fechamento por sinal SSE do mesmo tenant. Manter consulta inicial,
      revalidação na reconexão e proteção contra resposta antiga; sem depender
      de botão de atualização. Banner também aparece na entrada da NavBottom.
      Operadores usam uma única aba “Carrinho” e demais abas autorizadas, sem
      “Comprar”/PDV duplicados. Aceite real mobile pendente.
- [ ] Cumprir a matriz de testes de compra, autorização, concorrência, isolamento,
      offline e aceite mobile antes de considerar a substituição concluída.

## Fase 6 — Relatórios por período e extrato exportável

Diagnóstico e checklist em [canteen-reports-todo.md](./canteen-reports-todo.md).
Implementação pendente, na sequência da compra unificada.

- [ ] Consolidar vendas pagas e fiado no mesmo relatório, com recortes opcionais;
      distinguir vendido, recebido, fiado gerado, pagamentos e saldo devedor.
- [ ] Filtrar por período de São Paulo, membro/consumidor, situação e pagamentos;
      consultar o banco completo, sem limite de 50 vendas nem totais do cache.
- [ ] Criar extrato por membro/usuário vinculado, incluindo saldo anterior/final,
      compras e pagamentos, acessível também a quem quitou a dívida; membro vê
      apenas o próprio extrato, operador precisa de autorização para terceiros.
- [ ] Compor filtros no drawer padrão e resumo/detalhes em sub-rota com topbar de
      voltar; listas mobile shared com infinite scroll, export independente da
      página carregada.
- [ ] PDF/CSV usam mesmo contrato/filtros/totais, com branding correto, período,
      detalhamento de itens, quantidade, preços e movimentos financeiros.
- [ ] Cobrir reconciliação, períodos, grandes volumes, cancelados/arquivados,
      isolamento/permissões e abertura dos arquivos em PWA Android/iOS.

## Ordem de execução e validação final

1. Fase 1: backend e frontend do Dashboard, com testes.
2. Fase 2: status da Cantina e bloqueio operacional, com testes de API/UI.
3. Fase 3: migração do carrinho, testes de persistência e isolamento.
4. Fase 4: segurança, atualização e extrato da Carteira.
5. Fase 5: seguir contratos/permissões → backend → UI → remoção de duplicações →
   testes/aceite do plano de compra unificada, sem aguardar evolução estética.
6. Fase 6: contratos financeiros e backend por período → filtros/detalhes shared →
   PDF/CSV/extrato → reconciliação e aceite de arquivo real no dispositivo.
7. Rodar `npm test`, `npm run typecheck` e lint; build será executado pelo usuário.
8. Validar em dispositivo mobile: cantina aberta/fechada, troca de usuário,
   reinicialização do PWA e venda offline/online.
