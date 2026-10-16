# TODO — Compra unificada: Carteira, Dashboard e Cantina

Atualizado em **16/10/2026**. Status: **implementação iniciada, com base de acesso,
compra pessoal, validação de produtos e migração das entradas aplicada; observação,
sincronização completa e aceite mobile pendentes**. Este documento detalha o item 7 do [TODO principal](./TODO.md).

## Execução — primeira entrega de 16/10

- [x] Centralizar capacidades e resolução da navegação em `lib/canteen/access.ts`;
      comprador não vê menu operacional nem cai em Vendas com `canteen:view`.
      API de vendas exige acesso operacional, não apenas o preset básico.
- [x] Unificar catálogo e carrinho em `CanteenCartView`, com entrada `/cantina`.
      Removidas as UIs distintas `MemberOrderView` e `PDV`, além da aba “Comprar”.
      `tab=buy`, `tab=pdv` e `tab=cart` resolvem para o mesmo carrinho, sem tela
      duplicada. NavBottom, Carteira, Dashboard e links de notificações convergem.
      Operadores têm uma única aba “Carrinho” e demais abas autorizadas; comprador
      sem operação não recebe menu horizontal. Pedido pessoal usa `intent: purchase`
      e o vínculo ativo/aprovado da sessão mesmo quando há permissão de venda.
      No mesmo carrinho, `canteen:order` libera “Enviar pedido” (ou “Enviar pedido
      para mim” para operador); `canteen:sell` libera “Finalizar venda”.
      Validação desta correção: **59 testes em 8 arquivos**, typecheck e lint
      aprovados. Cobertos entrada direta/aliases, banner único, mudança de acesso,
      ações de comprador/operador, status/checkout e preservação de alterações
      durante POST. Build e aceite visual Android/iOS pendentes com o usuário.
- [x] Banner informativo no topo da Cantina em todos os caminhos: aberta/fechada, consulta e
      indisponibilidade são estados distintos, sem botões de status ao comprador.
      Mudanças efetivas de abertura **e fechamento** emitem `canteen.status.updated`
      pela infra SSE nos streams já autenticados do tenant, sem adicionar contagem
      ou alerta no sininho. O provider invalida o store, que reconsulta a API
      autorizada; reconexão/retorno ao app também revalidam. Push/sininho de
      abertura já existentes são preservados. Não há um segundo stream.
      Leituras iniciadas antes do sinal não sobrescrevem a resposta mais recente.
- [x] Preservar rascunhos por contexto de acesso: comprador usa chave `purchase`
      e operador mantém a chave `sale` existente. O contexto vem das permissões,
      não de abas de compra distintas; a ação de envio explicita pedido próprio
      ou checkout operacional. Drawer de detalhes usa a mesma chave da tela.
- [x] Permitir montar carrinho fechado, bloquear envio sem abertura confirmada e
      preservar rascunho em erro de status/rede/API; não anunciar envio offline
      como confirmado. Comprador por URL direta não vê o checkout operacional.
- [x] Validar abertura, produtos ativos/disponíveis/não removidos, quantidades
      consolidadas, preço oficial e total em centavos na transação de criação e
      aprovação. Pedido pendente não baixa estoque; confirmação usa decremento
      condicionado ao estoque e disponibilidade, com rollback em conflito.
- [x] Restringir pull de vendas à própria identidade para comprador, com teste
      real em dois bancos temporários. Sync push passa pela mesma validação.
- [x] Desativar o endpoint legado `/api/sync` com `410 LEGACY_SYNC_RETIRED`, sem
      consumidores no frontend atual: seus upserts brutos contornavam as regras.
      O motor atual continua usando `/api/sync/pull` e `/api/sync/push`.
- [x] Migrar os atalhos da Carteira e Dashboard para `/cantina` e apagar
      seus catálogos/carrinhos duplicados. Links antigos `?view=order` redirecionam
      sem montar a UI removida; notificações novas usam a mesma entrada.
- [x] Manter saldo, extrato, pagamentos e alertas na Carteira. Disponibilizar
      “Meus pedidos” no drawer padrão da compra, usando a consulta pessoal já
      autorizada e o stream existente para atualizar. Lista de compras recentes,
      não substitui o futuro extrato/export completo por período. Falha de rede
      é exibida com retry, sem simular lista vazia ou confirmação de envio.
- [ ] Implementar observação, migration `customerNotes`, confirmação/retry
      idempotente e conciliação completa da sincronização. Ainda não há migration
      nova aplicada; os testes usam migrations existentes em bancos temporários.
- [x] Corrigir o `sync/pull` agregado com Route → Controller → Service → Repository:
      autenticação/plano/cursor antes de acessar o banco e autorização por módulo.
      Comprador recebe vendas e membro próprios; membros não incluem `passwordHash`
      em nenhum perfil, inclusive ADMIN. Consulta de diretório não concede saldos
      de terceiros; catálogo básico não recebe custos. Líder usa equipes do vínculo
      atual no banco, não IDs antigos do token; sem equipe não há fallback global.
      Tombstones autorizados são preservados. Cursor é capturado antes das consultas
      e alterações posteriores ficam para o próximo pull; resposta privada/no-store.
- [x] Separar `sync/push` em Route → Controller → Service → Repository, sem
      compatibilidade que dispense autorização de tarefas. Cada operação exige
      identidade/plano/permissão; tarefas verificam equipe atual e solicitada no
      banco. Comprar ou gerenciar membros não autoriza alterar créditos.
- [x] Vincular o recibo do push ao tenant, ator, membro, módulo, ação e hash
      canônico do conteúdo; reautorizar antes de reconhecer replay. Mutação,
      estoque/débito e recibo são confirmados na mesma transação. Notificações
      aguardam commit e não se repetem no replay. Recibos antigos sem vínculo
      verificável geram conflito, nunca sucesso presumido ou nova cobrança.
- [x] Capturar dono/tenant na criação da outbox. Recuperar `processing` com a
      mesma chave e aceitar apenas ACK único dos itens enviados. Filas antigas
      sem dono/chave verificáveis ficam preservadas para revisão, sem adoção pelo
      próximo login; conflitos de idempotência não permitem “Usar local”.
- [ ] Aplicar confirmação/retry idempotente também ao POST direto de vendas:
      proteção de duplo toque do componente não resolve perda da resposta HTTP.
- [ ] Definir recuperação durável de efeitos pós-commit: falha de aviso é logada
      sem desfazer venda confirmada; ainda não há outbox de notificações com retry.
- [ ] Revisar módulos ainda sem executor no push (`members`, `teams` e demais
      produtores legados): operação não suportada fica com erro/fila preservada,
      sem ACK falso. Não reintroduzir upsert bruto para liberar essa fila.
- [ ] Limpar campos sensíveis já gravados em caches de versões antigas (inclusive
      eventual `passwordHash` em membros); reconciliar/restringir os caches quando
      houver rebaixamento, mudança de equipes ou plano e resincronizar ao ampliar
      acesso. Não apagar Bíblia, carrinho nem outbox silenciosamente. Bloqueador
      antes de declarar toda a sincronização saneada; o pull corrigido impede
      novas respostas indevidas, mas não apaga automaticamente cópias já locais.
- [ ] Auditar também DTOs das APIs fora do sync: `MembersRepository.list/findById`
      ainda usam spread de Member; remover credenciais dessas respostas e revisar
      projeção do catálogo online para não reintroduzir dados internos no cache.
      Não considerar a seleção segura do pull uma correção global dessas APIs.
- [ ] Validar integração real com mudança por SSE, build de produção e mobile.

## Objetivo e limites

Remover a implementação antiga de pedidos da Carteira e compartilhar catálogo,
detalhes e carrinho na Cantina. Todo usuário/membro comprador autorizado deve
conseguir fazer seu próprio pedido sem receber permissões operacionais.

A Carteira continua existindo com saldo, extrato, compras, pagamentos e alertas.
Não remover essas funcionalidades, resetar bancos, alterar o Dexie da Bíblia ou
tocar em `bible.db`. O campo de observação do comprador exige uma migration
aditiva no banco tenant (detalhada abaixo), sem reset de dados e sem alterar os
bancos global ou Bíblia.

## Regras definidas com o usuário

1. **Comprar não é operar:** `canteen:catalog`/`canteen:order` não concedem acesso
   ao PDV, vendas de terceiros, preparo, produtos ou configurações operacionais.
2. **Operação exige autorização:** PDV/checkout de venda exige `canteen:sell`;
   fila/preparo e abertura/fechamento exigem `canteen:operate`. Gestão de produtos,
   histórico e demais ações conservam suas próprias policies. Cada opção do menu
   operacional exige a permissão correspondente; não usar apenas o nome do perfil.
3. **Comprador sem menu operacional horizontal:** vê o catálogo de produtos e o
   carrinho. Busca e filtro de categoria não são abas operacionais. Seus pedidos
   podem ser acompanhados por uma ação/drawer próprio, sem acessar a fila geral.
   Quem possui permissões operacionais vê uma única aba “Carrinho” e as demais
   ações autorizadas; não há aba “Comprar” nem botão alternando perfil/modo. Abrir/fechar continuam
   ações exclusivas de `canteen:operate`, fora do banner informativo da compra.
4. **Carrinho permitido com Cantina fechada:** adicionar, remover e alterar
   quantidades não dependem da abertura. Produto inelegível para compra deve ter
   motivo visível; itens antigos inválidos permanecem identificados até correção,
   sem permitir seu envio.
5. **Envio/checkout somente com Cantina aberta:** revalidar no cliente e no
   servidor. Status desconhecido, erro ou ausência de conexão não significam
   aberta. Bloquear a conclusão, mostrar motivo/retry e preservar o carrinho.
6. **Disponibilidade é regra do backend:** nenhum pedido pode ser aceito apenas
   porque o produto estava disponível no Dexie. Revalidar ao receber, ao
   sincronizar e ao aprovar/confirmar a venda.
7. **Pedido não é fiado confirmado:** o comprador envia para aprovação. Somente a
   confirmação autorizada define pagamento/fiado, baixa estoque e atualiza saldo.
8. **Mesmo tenant e dono:** sessão determina tenant e comprador. Nenhuma entrada
   por Carteira, Dashboard, link direto, replay ou payload pode permitir comprar
   como outro membro ou consultar seus dados.
9. **Observação opcional do pedido:** o comprador pode informar preferências no
   checkout, por exemplo “Sem mostarda” ou “Com pimenta”. O texto deve acompanhar
   o pedido da confirmação ao preparo, separado de anotações financeiras. Nesta
   etapa é uma observação geral do pedido; observações individuais por item ficam
   fora do escopo.

## Diagnóstico de partida (antes da execução acima)

- `/carteira` reexporta `minha-conta/page.tsx`; `?view=order` ativa um catálogo
  antigo, com `useState<any[]>`, cards próprios e `Sheet` independente.
- Esse fluxo não usa o carrinho Zustand, não revalida abertura antes do envio,
  depende de membro encontrado no Dexie por e-mail e chama a confirmação de
  “Fiado” embora envie `paymentMethod: pending`.
- Cantina usa `ProductCard`, `ProductDetailsDrawer`, `ProductPurchaseActions` e
  carrinho Zustand. `MemberOrderView` envia pedidos; `PDV` abre checkout de venda.
  Ainda não formam um único fluxo completo de compra/validação.
- `CanteenContainer` escolhe entre pedido e PDV por `canSell`; não existe entrada
  explícita para compra pessoal de quem também pode vender.
- `MemberDashboard` mantém outro conjunto local de carrinho/cards/drawers, embora
  o atalho atual navegue para `/carteira?view=order`; auditar e remover o resíduo.
- `CanteenSalesService` verifica abertura, formato e autorização, mas recebe preço
  e total do cliente. A criação de pedido pendente não percorre a validação de
  produtos/estoque usada na confirmação da venda. Corrigir sem afrouxar testes.
- `Sale`, `LocalSale` e os contratos atuais de criação/listagem não possuem campo
  de observação do comprador. `CreditTransaction.notes` é anotação financeira e
  não deve ser reaproveitado para preferências de preparo.

## Etapa 1 — Contratos, navegação e acesso

- [ ] Testar e fixar a matriz catálogo/pedido próprio versus operação por ação:
      MEMBER, LEADER, PASTOR, CANTEEN e ADMIN do tenant; respeitar plano, sessão
      ativa e revogação segundo as regras vigentes, sem ampliar bypasses.
- [ ] Verificar que cadastro aprovado, seed inicial e provisionamento persistem as
      permissões de compra previstas para cada perfil. MEMBER sem permissão não
      deve ganhar acesso por fallback automático para fazer um teste passar.
- [x] Definir entrada única de catálogo/carrinho na Cantina: `/cantina`, inclusive
      para operadores. `tab=buy` e `tab=pdv` são aliases de compatibilidade, não
      telas diferentes. Compra pessoal é definida pela ação e payload explícito.
- [x] Levar “Fazer pedido” da Carteira e Dashboard a essa mesma entrada; manter
      compatibilidade de links `/carteira?view=order` e `/minha-conta?view=order`
      por redirecionamento, sem renderizar a implementação antiga em paralelo.
- [x] Resolver vínculo pela sessão/consulta própria autorizada, não pela existência
      prévia de uma linha no Dexie por e-mail. Sem vínculo válido, explicar a
      pendência e orientar regularização; não vincular outra pessoa por payload.
- [~] Garantir que comprador não veja abas operacionais nem possa acessá-las por
      URL; operador vê apenas opções autorizadas. Mudança de perfil por SSE deve
      revalidar modo e navegação sem reidratar carrinho de outro contexto. Resolução
      reativa e teste de rerender aplicados; falta aceite com stream real.
- [ ] Definir `customerNotes?: string | null` no contrato compartilhado de pedido
      e venda: texto opcional, máximo de 500 caracteres, trim externo, vazio
      normalizado para `null`, preservando acentos e quebras de linha. Validar
      tipo/limite no backend e schema Zod do formulário; não truncar silenciosamente.

**Saída:** teste de navegação demonstra que todos os atalhos de compra chegam ao
mesmo fluxo, com acesso básico independente da permissão de operar.

## Etapa 2 — Validação obrigatória no backend

- [x] Centralizar as regras de validação reutilizadas por criação de pedido,
      checkout, aprovação e replay/sync. Regras puras e guardas transacionais
      aplicadas; rota individual de vendas compõe contexto pelo controller, mas
      pull e push agregados também separados em camadas. Repositórios reutilizam
      a transação do push, sem transações aninhadas ou consultas de status fora dela.
- [x] Exigir IDs reais dos produtos no pedido; rejeitar inexistentes, de outro
      tenant, removidos, inativos ou com `availableToday` desabilitado.
- [x] Consolidar linhas repetidas do mesmo produto antes de validar quantidade;
      exigir inteiro positivo e estoque suficiente para a quantidade total.
- [x] Usar preço oficial do produto e calcular totais no servidor. Em divergência
      com o carrinho apresentado, retornar conflito compreensível para revisão,
      sem cobrar novo preço silenciosamente ou confiar no preço enviado.
- [x] No envio pessoal, fixar comprador/remetente na sessão e status pendente,
      inclusive quando o usuário tem permissão de venda. Separar essa intenção
      da venda operacional; nunca inferir compra de terceiro só por ser ADMIN.
- [x] Revalidar abertura e produtos na confirmação efetiva; validação/baixa de
      estoque e lançamentos financeiros devem ser atômicos, sem estoque negativo.
- [x] Preservar a regra de pedido pendente sem baixa/reserva de estoque: validar
      disponibilidade no envio e novamente na aprovação, que pode falhar se o
      estoque mudou. Não prometer reserva de um pedido ainda não aprovado.
- [~] Garantir idempotência por pedido, tenant e dono em retry/replay: mesma
      operação não cria nova venda, cobrança ou notificação. IDs iguais com
      conteúdo/dono incompatível devem ser rejeitados, não tratados como sucesso.
      Push com recibo transacional coberto; falta contrato idempotente no POST
      direto e conciliação de resposta perdida no cliente.
- [x] Aplicar as mesmas policies e validações ao sync de vendas/produtos/tarefas/
      créditos; `/api/sync` bruto desativado. Push revalida identidade/conteúdo e
      escopo inclusive no replay; pagamento inválido ou superior ao débito é rejeitado.
      Isso não conclui suporte a outros módulos nem saneamento de caches antigos.
- [ ] Criar migration Prisma tenant aditiva com `Sale.customerNotes String?`;
      pedidos anteriores continuam válidos com `null`. Gerar o client e conferir
      deploy de migrations no script inicial, provisionamento de novos tenants e
      atualização dos tenants existentes. Não usar `db push`/reset como substituto.
- [ ] Persistir e retornar `customerNotes` em criação, consultas e aprovação;
      revisar todos os SELECTs raw/serializadores e sincronizações de vendas e
      Carteira para evitar perder o campo. Atualização de status/aprovação não
      pode sobrescrever a observação original do comprador.
- [ ] Tratar a observação como texto, nunca HTML; entregar somente ao comprador e
      aos operadores autorizados do mesmo tenant. Incluir o texto na verificação
      de payload de retry/idempotência sem torná-lo parte de logs/Push públicos.

**Saída:** chamadas diretas à API e replay não contornam abertura, disponibilidade,
preço, vínculo, autorização ou isolamento, mesmo com UI/cache desatualizados.

## Etapa 3 — Catálogo e carrinho compartilhados

- [x] Extrair composição de catálogo/compra do domínio para os consumidores, com
      `ProductCard`, detalhes no `DrawerProvider`, busca e filtros compartilhados.
      `CanteenCartView` substitui as duas composições anteriores. Envio pessoal
      reside em `useSubmitPersonalOrder`; checkout de venda continua autorizado.
- [ ] Usar um único contrato de item, hook de pedido e API tipada; evitar handlers
      de transporte e regras de negócio duplicados nas páginas.
- [ ] Adicionar textarea “Observação do pedido (opcional)” antes da confirmação,
      placeholder “Ex.: sem mostarda, com pimenta”, contador e erro de validação,
      usando RHF/Zod e UI compartilhada nos fluxos pessoal e operacional.
- [ ] Persistir `customerNotes` junto ao rascunho Zustand do respectivo dono/modo;
      manter ao navegar, recarregar ou falhar o envio. Limpar somente com descarte
      explícito do rascunho ou confirmação bem-sucedida do carrinho correspondente.
- [ ] Exibir a observação na revisão do pedido, consulta própria, aprovação e card
      da fila de preparo, com rótulo e quebras de linha legíveis no mobile. Não
      depender apenas de toast/notificação para a cozinha ter acesso ao texto.
- [ ] Atualizar `LocalSale`, contratos de API e mapeamentos Dexie/outbox para
      preservar a observação em pull/replay e eventos; verificar se adicionar
      propriedade sem índice exige apenas compatibilidade dos dados, sem mudar
      versão/índices Dexie desnecessariamente.
- [x] Persistir carrinho por tenant/usuário/contexto de acesso, mantendo as chaves
      existentes. Compradores e operadores usam a mesma UI; a ação explícita
      escolhe pedido próprio ou venda sem reutilizar dados de comprador do
      checkout. Mudança de permissões não hidrata o rascunho de outro contexto.
- [ ] Definir recuperação explícita de rascunhos antigos do operador salvos em
      `purchase`, sem mesclar com a chave `sale` ativa ou apagar itens. Nenhuma
      chave antiga foi excluída nesta unificação; não copiar carrinhos silenciosamente.
- [ ] Revalidar produtos/preços/estoque restaurados; indicar o que mudou, permitir
      ajuste e não apagar itens silenciosamente por falha de conexão.
- [x] Manter controles do carrinho disponíveis com Cantina fechada; apenas o botão
      de envio/checkout fica bloqueado com aviso persistente e acessível.
- [x] Compartilhar status operacional Zustand existente, sem persistir “aberta”
      como garantia offline. Reconsultar antes do envio e tratar conflito do
      servidor se a Cantina fechar durante a solicitação.
- [ ] Bloquear duplo toque enquanto envia; mostrar loading/erro acionável. Limpar
      apenas o carrinho correto após confirmação válida e preservar em falhas.
- [~] Tratar alteração de itens enquanto status/POST estão em andamento: não enviar
      silenciosamente um snapshot antigo nem apagar alterações novas ao receber
      confirmação; cobrir também controles abertos no drawer de produto.
      Pedido próprio agora valida snapshot antes do POST e só limpa se dono/itens
      continuarem iguais; trava síncrona impede duplo toque. Checkout operacional
      e retry/idempotência completa continuam pendentes.
- [ ] Offline: permitir montar/preservar rascunho. Não mostrar “pedido enviado” ou
      “venda concluída” sem aceite do servidor. Se houver operação já enfileirada,
      exibir “aguardando sincronização”, revalidar no replay e manter rejeições
      visíveis com possibilidade de corrigir/repetir, sem perder o rascunho.
- [x] Mostrar confirmação e acompanhamento dos próprios pedidos com dados
      autorizados. Reutilizar SSE/notificações/Push existentes, sem criar outro
      stream nem expor eventos financeiros de outros membros. Drawer de pedidos
      recentes atualiza ao receber notificação de pedido e em focus/online;
      acompanhamento completo offline e aceite do stream real ainda pendentes.

## Etapa 4 — Remover a implementação substituída

- [x] Remover de Minha Conta o modo visual antigo de pedidos, carrinho `useState`,
      handlers, cards, `Sheet` e imports que deixarem de ser usados.
- [x] Remover carrinho/cards/drawers residuais de pedido no `MemberDashboard` após
      confirmar consumidores; manter o atalho para a compra unificada.
- [x] Preservar Carteira, extrato/infinite scroll, histórico próprio, saldo,
      pagamentos, fidelidade e preferências de notificações.
- [x] Remover fachadas/helpers somente se não houver consumidores; auditar imports
      e links para garantir que a implementação antiga não continue acessível.
      Removida a fachada sem consumidores `services/canteen/member-sales-api.ts`.
- [x] Atualizar os TODOs de domínio/frontend e documentação de acesso com o que
      foi realmente implementado, distinguindo testes de aceite no dispositivo.

Validação desta migração de entradas: typecheck e lint dos arquivos alterados
aprovados; **27 testes em 5 arquivos** (entradas, pedidos próprios, compra pessoal,
navegação e realtime). Não equivale ao aceite mobile/build; build será executado
pelo usuário. Nenhuma migration ou alteração nos bancos foi necessária nesta parte.

## Etapa 5 — Testes obrigatórios antes do aceite

**Pendência de organização do frontend:** a remoção do pedido antigo não conclui
a componentização da Carteira. Extrair UI de saldo/alertas/fidelidade/histórico/
extrato e hooks financeiros de `minha-conta/page.tsx`, preservando funcionalidades
e a compra unificada. Checklist em [frontend-todo.md](./frontend-todo.md).

- [ ] MEMBER com permissões de compra e sem `sell`/`operate` acessa produtos,
      monta carrinho e envia pedido com Cantina aberta; nenhum menu operacional.
- [ ] LEADER/PASTOR compram sem permissão operacional extra; CANTEEN/ADMIN também
      fazem pedido pessoal por ação explícita no mesmo carrinho visual, sem
      transformar automaticamente a compra própria em venda para terceiro.
- [ ] Usuário sem vínculo recebe orientação; vínculo válido no servidor funciona
      mesmo sem membro previamente carregado no Dexie. Sem sessão/permissão real
      continua bloqueado, inclusive por acesso direto e payload adulterado.
- [ ] Cantina fechada permite adicionar/editar/remover itens, mas não enviar ou
      confirmar; status com erro/desconhecido também bloqueia apenas conclusão.
- [ ] Cantina fecha depois de abrir carrinho ou durante envio: backend rejeita e
      itens permanecem. Reabertura/retry permite prosseguir sem reiniciar o app.
- [ ] Produto removido/inativo/indisponível/esgotado, quantidade repetida excedendo
      estoque, preço alterado e produto de outro tenant são rejeitados em API,
      aprovação e sync, sem venda, baixa, cobrança ou notificação indevida.
- [ ] Concorrência de aprovações/vendas não produz estoque negativo ou débito duplo;
      retry/duplo toque/replay não duplicam pedido e eventos.
- [ ] Navegação Carteira → compra → Cantina, reload/PWA e troca de usuário/tenant
      preservam apenas o carrinho do contexto correto. Sessão/perfil muda por SSE
      sem expor abas ou dados de operação ao comprador.
- [ ] Pedido aprovado/rejeitado/pronto atualiza acompanhamento e Carteira por
      eventos existentes; somente confirmação em fiado gera débito correspondente.
- [ ] Observação vazia/ausente mantém compatibilidade; texto válido com acentos e
      quebras de linha chega intacto a API, banco, sync, revisão e preparo. Tipo
      inválido ou mais de 500 caracteres é rejeitado sem pedido parcial.
- [ ] Observação persiste após navegação/reload/erro e fica isolada entre donos e
      modos; aprovação, mudança de status e replay não apagam nem duplicam o texto.
      Conteúdo semelhante a HTML deve renderizar literalmente, nunca executar.
- [ ] Testar migration em banco tenant existente com pedidos anteriores e em
      ambiente novo via script inicial/provisionamento, sem reset e sem acesso ao
      banco Bíblia. Regeneração do client e deploy repetido não podem falhar.
- [ ] Executar testes unitários/UI e integração em bancos temporários, typecheck e
      lint. Build de produção será executado pelo usuário; não marcar aceite
      apenas por compilação. Nunca usar/limpar `bible.db` para testar.
- [ ] Aceite manual Android/iOS: fazer pedido a partir da Carteira com MEMBER,
      acompanhar aprovação/preparo, retornar à Carteira e conferir lançamento;
      repetir fechado/aberto, offline/retorno, reload e conta operadora.

## Ordem obrigatória e próximo passo

1. Fixar contratos, permissões, vínculo e navegação por testes (Etapa 1).
2. Fechar os caminhos inseguros no backend e sync (Etapa 2).
3. Compartilhar a UI/estado e migrar entradas sem perder a Carteira (Etapa 3).
4. Apagar duplicações substituídas e revisar documentação (Etapa 4).
5. Executar a matriz de testes e obter aceite real mobile (Etapa 5).

**Próxima ação:** fechar confirmação/retry do POST direto e checkout operacional,
auditar DTOs fora do sync e reconciliar caches antigos após mudança de acesso;
então implementar observação com sua migration. Entradas e UI
duplicadas de compra da Carteira/Dashboard já foram substituídas. Validar em
dispositivo a compra própria, retorno à Carteira e acompanhamento dos pedidos;
build e aceite real não são presumidos pelos testes de componentes.

Atualização de segurança do pull: **25 testes unitários/rota/cache em 4 arquivos
e 9 testes de integração em dois bancos temporários** passaram, além do typecheck.
Validação da entrega do pull (anterior à unificação final do carrinho):
**81 arquivos e 362 testes passaram na suíte completa**, com
lint dos arquivos alterados e typecheck aprovados. Execução completa fora do sandbox
para permitir os processos Prisma; migrations dos testes aplicadas apenas em `/tmp`.
Fixtures do teste legado agora identificam um administrador real para a leitura
global, em vez de depender de uma sessão sem perfil/identidade/permissões.
Nenhuma migration, reset ou alteração de `bible.db` foi necessária.

### Validação da entrega de autorização/replay do push — 16/10

Suíte completa: **82 arquivos e 386 testes aprovados**; typecheck e lint de todos
os arquivos TypeScript alterados/novos aprovados.
Integrações executadas com migrations existentes em bancos temporários em `/tmp`,
incluindo replay concorrente, recibo incompatível/legado, mudança de ator/conteúdo,
revogação de autorização, pagamento, estoque, débito e rollback se o recibo falhar.
Cliente cobre origem da fila, ACK incompleto, retomada de `processing`, isolamento
de donos e bloqueio de nova chave para conflitos não verificáveis.

Não houve migration, alteração de índices/versão Dexie ou acesso ao banco Bíblia.
Build e aceite Android/iOS continuam com o usuário; estes testes não concluem a
compra unificada nem o retry das rotas diretas ainda pendentes acima.
