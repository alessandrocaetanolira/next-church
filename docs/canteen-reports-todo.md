# TODO — Cantina: relatórios, export por período e extrato individual

Atualizado em **16/10/2026**. Status: **análise realizada; implementação e aceite
pendentes**. Detalhamento do item 7 do [TODO principal](./TODO.md), complementar ao
[plano de compra unificada](./canteen-purchase-unification-todo.md).

## Objetivo

Permitir um relatório consolidado com vendas pagas e fiado, com filtros explícitos,
resumo verificável e detalhamento exportável. Disponibilizar extrato individual por
membro/usuário vinculado, tanto para o próprio comprador quanto para operadores
financeiros autorizados. Priorizar mobile: filtros em drawer padrão e resultados
em página de detalhes, não em modal longa ou tabelas que cortem a tela.

## Diagnóstico confirmado

- `SalesHistory` separa as abas Vendas e Fiado. O export de vendas recebe
  `filteredSales` e **não exclui fiado por regra explícita**; o export de Fiado
  recebe membros com saldo atual positivo. Portanto são relatórios distintos,
  não uma composição financeira única.
- Os filtros atuais são busca e tipo de consumidor, sem início/fim de período.
  O resumo “Hoje” usa dia do navegador e soma as vendas locais sem excluir
  explicitamente pendentes/canceladas.
- `export.ts` apenas formata arrays do frontend. Não consulta todo o período nem
  calcula resumo consolidado. PDF de vendas mostra itens sem suas quantidades,
  pagamento técnico (`cash`, `fiado` etc.) e data sem ano/hora.
- A API operacional limita vendas a 50; sync/Dexie não são fonte suficiente para
  garantir relatório completo. A Carteira também limita sua lista de compras a
  50, embora o ledger próprio já tenha cursor.
- Export de Fiado é uma fotografia de `Member.creditBalance`, não um histórico
  por período. Não pode representar “fiado vendido no período” ou saldo histórico.
- O histórico individual atual é aberto em `Dialog` a partir dos devedores; não
  tem export nem filtro de período e não atende quem já quitou o saldo.
- Ledger tem débitos e pagamentos, mas o pagamento manual recebe apenas valor:
  não há evidência de forma de recebimento suficiente para separar esse montante
  em PIX/dinheiro/cartão. Não inferir uma informação que não foi registrada.
- Policy atual do ledger inclui uma lista fixa de perfis. Revisar junto às
  permissões explícitas: perfil sozinho não deve ampliar o acesso e um operador
  explicitamente autorizado não pode ser bloqueado apenas pelo nome do perfil.

## Regras financeiras e escopo

- **Vendido confirmado:** vendas pagas no ato + vendas confirmadas em fiado.
  Pedido pendente não é venda confirmada. Cancelamento não entra no vendido
  válido; se solicitado no detalhamento, deve aparecer identificado à parte.
- **Recebido no período:** vendas pagas no ato no período + recebimentos de débitos
  efetivados no período. Um pagamento de fiado não é uma nova venda.
- **Fiado vendido no período:** vendas em fiado confirmadas, não o saldo atual
  inteiro dos membros. Fiado quitado continua sendo venda histórica em fiado.
- **Saldo devedor:** saldo anterior + novos débitos − pagamentos, com ajustes e
  estornos identificados por sinal/tipo quando existirem. Saldo atual e saldo no
  fim do período são informações distintas, rotuladas com suas datas.
- Uma compra em fiado pode aparecer como compra e como lançamento de débito no
  detalhamento, vinculada por `saleId`; não somar as duas linhas no mesmo total.
- Datas de filtro são dias de `America/Sao_Paulo`: início inclusivo e início do
  dia seguinte ao fim exclusivo, convertidos para os timestamps usados no banco.
  Não usar `toDateString()` do dispositivo para agregação oficial.
- Definir explicitamente data de contabilização da venda confirmada. Pedido
  criado num dia e aprovado noutro não pode mudar de período por suposição.
  Auditar ausência de timestamp de confirmação; registrar necessidade de schema
  antes de prometer relatório por uma data que não está armazenada.
- Arquivar pedido pronto para retirar da fila não desfaz venda nem recebimento.
  Distinguir esse caso de exclusão/cancelamento financeiro: `deletedAt` isolado
  não deve eliminar automaticamente vendas válidas do relatório.
- Resumo, detalhes, PDF e CSV usam os mesmos filtros, regras e fonte oficial.
  Cache parcial pode servir à consulta offline com aviso, nunca a um export
  apresentado como financeiro completo.

## Etapa 1 — Contrato e composição do relatório

- [ ] Definir contratos tipados de filtro e resposta para relatório geral e extrato
      individual, sem `any[]` e sem receber totais calculados pelo navegador.
- [ ] Filtros: início/fim, todos/pagos/fiado, forma de pagamento registrada, tipo
      de consumidor, membro e situação. Ter presets Hoje, 7 dias, Mês atual e
      Personalizado; rejeitar intervalo invertido ou datas inválidas.
- [ ] Composição: Consolidado, Resumo, Detalhado e Extrato individual; seleção
      explícita no drawer, com escopo/período visíveis antes de gerar arquivo.
- [ ] Consolidado inclui pagos e fiado por padrão; permitir recortes sem obrigar
      gerar arquivos separados para obter a visão completa.
- [ ] Resumo traz quantidade de vendas/itens, vendido confirmado, pago no ato,
      fiado vendido, recebimentos de débitos e valores pendentes/cancelados à parte.
      Não apresentar “vendido + recebido” como total de receita.
- [ ] Detalhamento identifica venda, data/hora/ano, comprador/tipo de consumidor,
      itens/quantidades, preço unitário, total, pagamento e situação. Observações
      do comprador seguem o contrato da compra unificada, quando disponíveis.
- [ ] Definir rodapé/cabeçalho com tenant correto, período, filtros, fuso,
      data/hora de emissão, contagem e totais. Visitantes/não identificados devem
      continuar incluídos no relatório geral, sem carteira fictícia.

## Etapa 2 — Backend completo, seguro e reconciliável

- [ ] Criar composição de relatório em rota → controller → service → repository,
      reaproveitando regras de vendas/ledger sem chamar repository na rota.
- [ ] Consultar todo o período no banco do tenant da sessão, sem o limite da lista
      operacional, sem depender do Dexie e sem truncamento silencioso.
- [ ] Usar consultas parametrizadas, ordem estável e paginação/cursor para detalhes;
      agregados abrangem o filtro inteiro, não apenas a página exibida. Em export
      grande, buscar todos os lotes com limite explícito e erro acionável se
      excedido, nunca entregar um arquivo parcial rotulado como completo.
- [ ] Manter corte de dados consistente entre agregado, páginas e arquivo; definir
      comportamento se novas vendas/pagamentos chegam enquanto o relatório gera.
- [ ] Revisar precisão monetária/arredondamento e detectar divergências entre
      ledger e saldo persistido. Mostrar discrepância identificada, sem inventar
      lançamentos anteriores ou corrigir saldo silenciosamente.
- [ ] Calcular saldo anterior ao período e saldo final considerando todos os
      lançamentos anteriores/relevantes, não apenas os lançamentos carregados.
- [ ] Autorizar relatório geral e extrato de terceiros por permissões financeiras
      operacionais e `canteen:export`, conforme policy explícita. `canteen:view`
      básico do membro não deve abrir relatórios de outras pessoas.
- [ ] Extrato próprio usa identidade/vínculo da sessão; não exige permissão para
      operar/exportar dados de terceiros. `userId` deve resolver para membro
      autorizado no tenant, não virar um filtro arbitrário por e-mail.
- [ ] Permitir consultar histórico de quem quitou, sem limitar seleção a
      `membersWithDebt`; tratar membros arquivados com histórico autorizado sem
      reativar seu acesso. Nunca cruzar tenant por ID recebido.
- [ ] Revisar informação ausente para recebimentos por método, confirmação e
      estornos. Se precisar schema, criar migration tenant aditiva e incluir no
      setup/provisionamento/deploy; não modificar `bible.db` nem resetar dados.

## Etapa 3 — Extrato por membro/usuário

- [ ] Disponibilizar entrada pela Carteira própria e, para operador autorizado,
      por Membros/relatórios/consulta do membro, mesmo com saldo zero.
- [ ] Cabeçalho identifica membro e período; resumo mostra saldo anterior,
      débitos, pagamentos, ajustes quando existentes e saldo final; saldo atual
      aparece separado quando o período é histórico.
- [ ] Mostrar cronologia com compras pagas, compras em fiado e movimentações de
      crédito; compra paga não aumenta saldo devedor. Vincular débito à compra
      sem duplicar sua contabilização. Pagamento parcial/quitação são legíveis.
- [ ] Detalhes de compra mostram itens, valores, situação e observação; registros
      financeiros têm sua própria descrição, sem confundir os dois campos.
- [ ] Expor PDF/CSV do extrato completo filtrado, não apenas da primeira página
      ou dos itens já carregados no infinite scroll.

## Etapa 4 — UI e export compartilhados

- [ ] Criar filtros em `DrawerProvider` padrão, responsivos e reativos, com
      Aplicar/Limpar/Cancelar; usar RHF/Zod, sem criar outra versão de drawer.
- [ ] Abrir resultado completo em sub-rota de detalhes, com topbar shared de
      voltar/título, sem topheader/navbottom de página raiz. Preservar filtros
      ao abrir uma venda e voltar, sem abas/modais empilhadas.
- [ ] Compartilhar composição entre relatório geral, membro e Carteira: filtros,
      resumo, linhas e estados; manter cálculos financeiros nos services, não
      nas variantes Web/Mobile. Mobile usa `SharedFlatList`/infinite scroll.
- [ ] Exibir filtros ativos, origem/atualização dos dados e ações PDF/CSV com
      loading, vazio, erro/retry e estado offline explícitos. Não disparar
      download vazio ou repetir geração por duplo toque.
- [ ] PDF: resumo e detalhamento selecionados, títulos/totais, identificação do
      tenant, cabeçalhos repetidos, paginação, textos longos e valores pt-BR;
      validar arquivo e abertura/download em PWA Android/iOS sem nova tela branca.
- [ ] CSV: preservar proteção de fórmula, acentos, aspas e quebras de linha;
      colunas consistentes com PDF, números/datas utilizáveis e nome com período
      e tipo. Continuar CSV compatível com Excel, sem reintroduzir `xlsx`.
- [ ] Informações de extrato/observações ficam restritas a destinatários
      autorizados; arquivos não podem ser publicados em URL estática pública.

## Etapa 5 — Matriz de testes e aceite

- [ ] Período completo com mais de 50 vendas e várias páginas de extrato; resumo,
      consulta e arquivos contêm todos os dados esperados, sem duplicidade.
- [ ] Dias limítrofes, virada de mês/ano e navegador em outro fuso mantêm recorte
      São Paulo; incluir pedido criado antes e confirmado no período correto.
- [ ] Venda paga, fiado em aberto, parcialmente pago e quitado; pagamento neste
      período de dívida de período anterior, com saldos inicial/final corretos.
- [ ] Pendentes/cancelados fora do vendido válido e arquivamento de pedido pronto
      sem apagar faturamento; testar estorno/ajuste conforme contrato existente.
- [ ] MEMBER exporta só o próprio extrato; tentativa de acessar outro membro,
      tenant, relatório geral ou usar permissão básica deve ser rejeitada.
      Operador autorizado funciona por ação, sem depender de role hardcoded.
- [ ] Usuário com saldo zero continua encontrável; visitante/não identificado
      entra nas vendas gerais, sem inventar vínculo de membro.
- [ ] Totais de dinheiro/PIX/cartão só usam métodos registrados; recebimento sem
      método conhecido é identificado, nunca atribuído arbitrariamente a caixa.
- [ ] PDF/CSV com acentos, textos extensos, observações, múltiplas páginas,
      arredondamentos e fórmulas maliciosas preserva legibilidade/segurança.
- [ ] Filtros em drawer e resultado em detalhes respeitam padrão mobile e retorno;
      offline/erro de API não gera relatório parcial como se fosse completo.
- [ ] Testes de domínio/API/UI, integração em bancos temporários e revisão visual
      dos arquivos; build pelo usuário e aceite de arquivos reais Android/iOS.

## Ordem de execução

1. Fixar contratos, regras financeiras e matriz de autorização por testes.
2. Implementar consultas/agregados completos por período e extrato individual.
3. Compor filtros em drawer e resultado em detalhes com componentes shared.
4. Substituir exports locais antigos por PDF/CSV do mesmo contrato validado.
5. Executar testes de reconciliação/isolamento e aceite de arquivos mobile.

Executar esta frente na sequência da compra unificada e sua observação de pedido;
não marcar como entregue pela inclusão deste TODO. Nenhuma correção de export ou
migration foi aplicada durante esta análise.
