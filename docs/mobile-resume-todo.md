# TODO — Retorno do PWA mobile após suspensão

Atualizado em **14/10/2026**. Plano para corrigir faixa branca, geometria incorreta
e opções ausentes no menu depois de voltar ao app. A implementação foi aplicada em
14/10/2026; o aceite visual em dispositivo real permanece pendente. `[x]` abaixo
indica implementação/verificação local, não aceite final do incidente.

## Diagnóstico e limites da evidência

Achados confirmados por inspeção do código e da versão instalada das bibliotecas:

- `SessionCacheBridge` chama `useSession().update()` ao retornar via
  `visibilitychange`/`pageshow`. O Auth.js coloca o status em `loading` durante a
  consulta, mesmo mantendo a sessão anterior em memória.
- `LayoutWrapper` substitui o `AppLayout` durante esse loading. Isso desmonta o
  shell, a navegação e o `NotificationsProvider`; após 2,5s, pode renderizar o
  conteúdo sem o shell enquanto a sessão ainda está carregando.
- `AppLayout` mede o viewport também quando o documento fica oculto e considera
  redução superior a 120px como teclado, sem confirmar foco em campo editável.
  A medida em pixels substitui o fallback CSS `100dvh`.
- `DrawerProvider` e Vaul alteram a geometria do mesmo drawer. O provider controla
  `bottom`/`maxHeight`; Vaul controla `bottom`/`height`, guarda uma altura inicial
  em referência e aplica estilos no body no Safari. O root compartilhado persiste
  entre aberturas com conteúdos diferentes.
- `BottomNav` envia JSX já calculado para `openDrawer`. O conteúdo aberto não
  recalcula as opções quando o estado de autenticação muda.
- `useAuth` prioriza acesso da store quando existe `accessUpdatedAt`, sem comparar
  versão com a sessão. Esse marcador não é persistido entre aberturas completas.
- O helper atual retorna todos os 16 módulos para `ADMIN`. Opções invisíveis podem
  estar removidas da lista, recortadas pelo layout ou ocultas por animação; é preciso
  distinguir esses casos no dispositivo.

As imagens locais de evidência ilustram os sintomas, mas não são uma captura do
estado interno da ocorrência atual. A causa visual exata ainda exige reprodução.

Arquivos principais: `LayoutWrapper.tsx`, `AppLayout.tsx`, `BottomNav.tsx`,
`DrawerProvider.tsx`, `ui/drawer.tsx`, `AuthProvider.tsx`, `useAuth.ts`, auth store,
`NotificationsProvider.tsx` e `globals.css`.

## Etapa 0 — Registrar reprodução e referência

- [ ] Registrar dispositivo, SO, browser, modo instalado/browser, tema e rota.
- [ ] Reproduzir retorno com menu fechado e aberto, após uso do teclado, com rede
      lenta, offline e após rotação.
- [~] Capturar temporariamente status da sessão, identidade, role, versão de acesso,
      quantidade de opções calculadas/renderizadas e origem do acesso usado na UI.
- [~] Capturar `innerHeight`, `visualViewport.height/offsetTop`, altura do shell,
      variável CSS, foco atual e retângulos do drawer/NavBottom.
- [ ] Inspecionar estilos inline de body/drawer e distinguir opções inexistentes no
      DOM de opções recortadas ou com opacity/transform de animação.
- [ ] Comparar a ocorrência com o mesmo app imediatamente após abertura completa.

Aceite: evidência associa o sintoma ao estado de sessão e às medidas de layout,
sem registrar cookies, tokens ou outros segredos. Falta de reprodução imediata não
impede corrigir os defeitos determinísticos já identificados.

## Etapa 1 — Preservar o shell durante revalidação

- [x] Distinguir carregamento inicial de revalidação de uma sessão já estabelecida.
- [x] Manter shell mobile, conteúdo, scroll e navegação montados durante a consulta
      de atualização da mesma sessão.
- [x] Impedir que o timeout de 2,5s troque o shell por um layout diferente durante
      revalidação lenta.
- [x] Preservar bloqueio/logout quando o servidor confirmar sessão inválida, usuário
      revogado ou tenant desativado; tratar falha de rede separadamente.
- [x] Garantir que revalidação não reinicie o SSE apenas pela alternância de loading.

Aceite: consulta lenta não desmonta/recria o shell nem perde scroll; revogação real
continua retirando acesso. Não usar sessão persistida como autorização das APIs.

## Etapa 2 — Reconciliar acesso sem disputa entre sessão, store e SSE

- [x] Definir a precedência entre sessão validada, evento SSE e snapshot offline,
      usando identidade e versão do acesso; não usar apenas timestamp local.
- [x] Serializar/coalescer revalidações simultâneas de retorno e SSE.
- [x] Descartar resposta antiga ou de outra identidade após troca de usuário/tenant.
- [x] Evitar que campos `undefined` de payload parcial apaguem role, permissões,
      equipes ou recursos do plano já conhecidos.
- [x] Atualizar role, permissões e módulos derivados de forma consistente.
- [x] Manter o acesso offline no contrato existente, reconciliando com o servidor ao
      voltar online e respeitando revogação confirmada.

Aceite: MEMBER → ADMIN → MEMBER funciona sem logout; resposta antiga não desfaz
uma alteração mais recente e não há mistura de acesso entre usuários/tenants.

## Etapa 3 — Tornar o menu do drawer reativo

- [x] Extrair o conteúdo do menu para componente que acompanha o estado atual de
      acesso e rota enquanto estiver aberto.
- [x] Preservar `useDrawer` como infraestrutura; regras de navegação ficam na camada
      de navegação e autorização continua no helper/backend.
- [x] Verificar animações dos itens ao retomar, evitando itens permanentemente
      invisíveis mesmo quando presentes no DOM.
- [~] Garantir que todas as opções caibam ou sejam alcançáveis por scroll, sem área
      vazia artificial no rodapé.

Aceite: com o menu aberto, uma alteração de perfil atualiza os itens; retorno do
app mantém as opções corretas para ADMIN e MEMBER.

## Etapa 4 — Unificar viewport e geometria do drawer

- [x] Definir um único responsável por reposicionar/redimensionar o drawer para o
      teclado, evitando controles concorrentes entre provider e Vaul.
- [x] Medir o viewport somente em estado visível e reconciliar a medida após retorno
      e rotação, aguardando estabilização do navegador quando necessário.
- [x] Distinguir teclado de mudança de viewport com foco editável e medidas válidas;
      o menu sem inputs não deve ser elevado como se houvesse teclado.
- [x] Aplicar limites de altura e safe-area coerentes, com fallback CSS funcional.
- [x] Impedir que altura, offsets e referências de teclado de um formulário sejam
      reutilizados pelo menu ou outro conteúdo do drawer compartilhado.
- [ ] Verificar restauração de estilos inline do body/drawer após fechamento e
      suspensão, conforme o ciclo de vida da biblioteca instalada.
- [~] Preservar NavBottom ancorada e um único contêiner de scroll mobile.

Aceite: menu → formulário com teclado → menu não deixa vão; suspensão/retorno não
eleva a navegação, não recorta opções e não expõe uma faixa vazia.

## Etapa 5 — Tornar recuperação de overlays explícita

- [x] Revisar o Escape sintético global disparado ao retornar ao app.
- [x] Definir quais overlays fecham e quais continuam ao suspender/retomar, mantendo
      estado React, foco e scroll lock consistentes.
- [x] Evitar limpeza genérica de estilos pertencentes a um overlay ainda aberto.

Aceite: não há overlay invisível bloqueando cliques; drawers/modais continuam
abrindo, arrastando e fechando corretamente após o retorno.

## Etapa 6 — Verificação e aceite

- [x] Cobrir carregamento inicial versus revalidação sem desmontar o shell.
- [x] Cobrir transições de acesso, respostas fora de ordem e troca de identidade.
- [x] Cobrir atualização do menu aberto e reconciliação de viewport/teclado.
- [x] Executar typecheck, lint e testes direcionados; registrar resultado.
- [ ] Gerar build novo e iniciar via `npm run start` no host de validação.
- [ ] Validar em iPhone e Android, claro/escuro, app instalado e browser, após
      suspensões curtas e longas; incluir retomadas repetidas, teclado e rede lenta.
- [ ] Revalidar revogação de acesso, troca de perfil via SSE e retomada offline.
- [ ] Remover instrumentação temporária e registrar dispositivo/versão/commit do
      aceite, mantendo somente logs necessários.

Não marcar o incidente como concluído apenas por build/typecheck aprovados.

## Próxima ação

Gerar build novo no host de validação e executar os cenários da Etapa 6 em iPhone e
Android. Confirmar menu completo/rolável, ausência de faixa branca, posição da
NavBottom e restauração de estilos/foco ao suspender e voltar.

## Registro da implementação — 14/10/2026

- `useAuth` distingue loading inicial de revalidação; o shell e SSE permanecem
  montados enquanto uma sessão existente é atualizada. Sessão confirmada inválida
  limpa o cache e encerra o acesso.
- `SessionRefreshProvider` coordena retorno/online/SSE. Eventos de acesso durante
  consulta em andamento solicitam uma leitura adicional; resultados de outra
  identidade são descartados.
- SSE de gestão de acesso transporta `User.version`, userId e tenantId. Store e hook
  reconciliam por identidade/versão; evento legado sem versão pede leitura do servidor.
- Conteúdos dos menus principal e de usuário são componentes reativos. Itens do menu
  não dependem mais de animação de entrada. Menus fecham na suspensão; formulários
  mantêm o estado. O Escape global foi removido.
- `useMobileViewport` mede somente com documento visível, estabiliza medidas na
  retomada e recalibra orientação, verificando foco em editor para detectar teclado.
  O shell desconta a safe-area superior já aplicada no body e contém o scroll.
- Vaul é o único responsável pelo teclado no drawer; controles manuais de
  bottom/maxHeight foram retirados. Cada abertura tem referências próprias e menus
  sem campos não usam reposicionamento de inputs.
- Diagnóstico opcional no console do navegador: executar
  `localStorage.setItem('church-debug-mobile-resume', '1')` e repetir o cenário.
  Remover com `localStorage.removeItem('church-debug-mobile-resume')` após a captura.
  O diagnóstico fica desativado por padrão e não registra tokens/cookies.
- Verificação local inicial: **40 testes em 9 arquivos aprovados**, typecheck completo
  e lint dos arquivos alterados aprovados.
- Verificação ampliada: **195 testes em 56 arquivos validados entre execuções**.
  A execução no sandbox aprovou 52 arquivos/186 testes; quatro suítes ficaram
  bloqueadas por `spawnSync EPERM`. Ao repetir fora do sandbox, três suítes/6 testes
  passaram. Os 3 testes de provisionamento passaram em execução isolada com
  `--testTimeout=60000`, pois migrations reais excederam os 5s padrão nesta máquina.
  As asserções existentes não foram flexibilizadas; `npm test` com o prazo padrão
  ainda pode apresentar esse timeout ambiental.
- Build de produção e aceite visual Android/iOS permanecem pendentes; não foram
  necessárias migrations novas nem alterações nos bancos da aplicação. As migrations
  das suítes de integração foram aplicadas exclusivamente em bancos temporários.
