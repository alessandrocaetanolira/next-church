# TODO — Segurança do login e cadastro público

Criado em **21/10/2026**, após revisão do código e da `evidencia.png` de produção.
Este documento especifica execução e testes; **a implementação inicial de S1–S3
está aplicada, com aceite operacional ainda pendente**. A evidência mostra
tentativas de XSS armazenadas e exibidas como texto, sem comprovar execução de
JavaScript.

Regra do usuário: **a camada de segurança deve preservar os demais fluxos e os
comportamentos legítimos já validados**. Cada etapa precisa provar essa
compatibilidade antes de avançar. Os únicos comportamentos que devem passar a ser
recusados são entradas inválidas, abuso, exposição de segredos e acesso revogado.

Legenda: `[ ]` pendente; `[~]` implementado sem todos os aceites; `[x]` implementado
e validado com evidência. Uma descrição de teste não significa teste executado.

## Registro de execução — 21/10/2026

- [~] **S0:** base de roteamento, acesso, aprovação e offline exercitada; o teste
      novo com SQLite descartável reproduziu hash na resposta e acesso de sessão
      invalidada antes da correção. A caracterização em dispositivos reais falta.
- [~] **S1:** seleção explícita sem credenciais em listagem, detalhe, criação,
      atualização e perfil de membros. Testes de Request/Response e banco temporário
      preservam os campos funcionais, o hash interno e a aprovação com a mesma senha.
      Saneamento de caches legados e inventário ampliado de saídas permanecem pendentes.
- [~] **S2:** guard de API do proxy corrigido; handlers de membros e contextos
      tenant/global rejeitam `authValid: false`; admin global é revalidado por
      existência, atividade e versão. Update do cliente não ressuscita token revogado;
      alteração legítima de permissões do tenant continua funcionando sem logout.
      Testes cobrem callbacks e cookie global real, mas falta aceite publicado/mobile.
- [~] **S3:** quotas por conta/escopo e origem, HMAC, janela fixa, expiração, 429 com
      `Retry-After`, 503 em falha e admissão antes de bcrypt/INSERT/notificação.
      SQLite técnico separado em `auth-security.db`, inicialização sob demanda, sem
      migration de domínio. Quota compartilhada e persistência após restart testadas
      com dois processos reais. Headers arbitrários são ignorados sem configuração;
      nesse caso há bucket agregado, não identificação individual de IP. Validar
      proxy e volume de Wi-Fi compartilhado conforme `operations.md` antes de publicar.
- [ ] **S4–S7:** schemas Zod públicos, migração dos dois forms para RHF, validação
      completa, origem/CSRF complementar, concorrência/enumeração de cadastro,
      regressão XSS ampliada e headers ainda não foram implementados nesta primeira
      entrega. Os forms públicos continuam com estado manual; Zod/RHF existentes
      nos outros formulários não foram alterados.
- [~] **S8:** suíte existente e novos testes executados; registro final dos comandos
      abaixo. Build, navegador/PWA e homologação têm resultados separados.
- [x] **Cloudflare Tunnel — configuração local:** provedor confirmado pelo usuário;
      `npm run start:tunnel` seleciona `cf-connecting-ip` e escuta somente em
      `127.0.0.1:3001`. README e operação atualizados. `start` e `dev` preservados.
      Testes adicionais comprovam quotas por visitante, limite por conta entre IPs
      e ausência de fallback para X-Forwarded-For. Isso não comprova o túnel remoto.

Validação local registrada até aqui:

- Suíte completa naquele momento: `npm test` — **96 arquivos, 461 testes aprovados**.
- Novo endpoint de cadastro, criado após o início da suíte completa:
  `npm test -- src/test/public-register-rate-limit.test.ts` — **2 testes aprovados**.
- Após confirmar Cloudflare Tunnel, regressão direcionada de limiter, handlers
  reais de login, cadastro e roteamento — **4 arquivos, 25 testes aprovados**,
  incluindo três novos cenários Cloudflare. Typecheck de build e lint aprovados.
- `npm run start:tunnel -- --port 3108` exercitado no artefato compilado, com store
  temporário: quota separada por `CF-Connecting-IP`, 429 no mesmo IP apesar de
  X-Forwarded-For alterado, fallback agregado para header ausente/inválido e sessão
  HTTP fora do limiter. Os requests admitidos neste teste usaram CSRF inválido e
  foram recusados pelo Auth.js; HTTP 200 dessa etapa não significou autenticação.
  Servidor encerrado e fixtures removidas. Configuração remota e NAT ainda pendentes.
- `tsc --noEmit --pretty false --incremental false`, com e sem
  `-p tsconfig.build.json` — aprovados; lint dos arquivos alterados e `git diff
  --check` — aprovados. Não equivalem a aceite no navegador ou em produção.
- `npm run build` — aprovado com Turbopack. Permanecem sete avisos de tracing de
  filesystem envolvendo os clientes Prisma gerados e a factory; não foram
  alterados para ampliar o escopo desta camada de segurança.
- Smoke do artefato compilado em `127.0.0.1:3107`, com admin fictício e dois bancos
  sob `/tmp`: cinco logins criaram sessão; a sexta tentativa retornou 429 com
  `Retry-After`; a sessão válida continuou acessível. Desativar o admin temporário
  invalidou a sessão e a chamada HTTP a `/api/admin/overview` retornou 401.
  Servidor encerrado e fixtures removidas ao final.
- Observação de compatibilidade: `/auth/login` sem slug exibiu a UI 404, sem
  formulário, mas retornou **HTTP 200 em streaming**, com marcador
  `NEXT_HTTP_ERROR_FALLBACK;404`. Os testes de componente comprovam `notFound()`,
  não status HTTP 404. A documentação local do Next.js prevê 200 para respostas
  not-found transmitidas por streaming. Validar/corrigir a exigência de status
  HTTP 404 em etapa própria, sem presumir que este aceite HTTP já esteja concluído.
- Dependências e binários restaurados exclusivamente do cache npm local, offline.
  Clientes Prisma regenerados a partir de schemas existentes e engines locais;
  migrations de integração somente em diretórios temporários. Nenhum banco ativo
  do workspace ou de produção foi migrado, resetado ou alterado.
- Limpeza adicional solicitada pelo usuário: removidos uploads locais de `files/`
  e oito imagens de referência da raiz (16,72 MiB); preservados `.gitkeep`,
  `evidencia.png` e assets usados pelo app. Cache de compilação recriável foi limpo
  para permitir validar o build com espaço disponível.

## 1. Escopo e limites de alteração

| Superfície | Alteração autorizada neste plano | Comportamento a preservar |
| --- | --- | --- |
| Login global e de igreja | Validação de tipos/tamanhos, rate limit e erros seguros | Rotas, contexto global/tenant, credenciais existentes, destino após login |
| Cadastro público | Schema próprio, limites, proteção de origem e concorrência | Cadastro pendente, campos válidos, aprovação pastoral e acesso após aprovação |
| Membros e perfis | Retirar segredos das respostas e manter renderização textual | Campos funcionais, permissões, edição, vínculos, créditos e equipes |
| Sessões e APIs protegidas | Rejeitar sessão efetivamente revogada no servidor | Sessões válidas, atualização de permissões, logout e uso offline já permitido |
| PWA, sincronização, SSE e Push | Testes de regressão; ajustes estritamente necessários de segurança | Instalação, retomada, filas pendentes, notificações e isolamento por contexto |
| Demais formulários e módulos | Somente regressão | Não aplicar novas regras públicas ao CRUD administrativo ou a outros domínios |

- [ ] Não aplicar rate limit genérico a `/api/*`, navegação, RSC, assets, branding,
      manifesto, worker, atualização de sessão, logout, SSE, Push ou sincronização.
- [ ] Não modificar presets de perfis, planos, permissões ou regras de compra.
- [ ] Não reaproveitar o validador compartilhado de membros para endurecer todos os
      fluxos de uma vez. Criar contrato específico para cadastro público.
- [ ] Não apagar `Member.passwordHash` nesta etapa: a aprovação pastoral ainda
      precisa dele para criar `User`. Remover o campo das saídas, não da fonte
      interna de credenciais. A migração definitiva é outro trabalho.
- [ ] Não exigir confirmação de e-mail, MFA ou nova senha para usuários existentes
      como efeito colateral deste pacote. Essas evoluções estão separadas abaixo.
- [ ] Não fazer reset, limpeza ou migration de bancos como parte do diagnóstico.
      Se uma correção exigir migration, descrevê-la e testá-la primeiro em banco
      descartável; não executar automaticamente em produção. Preservar `bible.db`.
- [ ] Não baixar dependências ou ferramentas. Usar a estrutura já declarada no
      projeto; se o ambiente não as possuir, registrar a validação como pendente.

### Zod e React Hook Form: estado verificado

O `package-lock.json` registra `zod` **4.6.5**, `react-hook-form` **7.88.0** e
`@hookform/resolvers` **5.9.1**. Membros, materiais, produtos e estacionamento já
usam RHF com `zodResolver`. O detalhe de igreja no admin global também os utiliza.
Login e cadastro público ainda usam estado e verificações manuais. Neste checkout,
`node_modules` está ausente; as bibliotecas estão declaradas e travadas no lockfile,
mas não disponíveis para execução local.

- [ ] Usar essas dependências existentes para os formulários públicos, sem upgrade
      ou padronização geral dos outros formulários nesta entrega.
- [ ] Aplicar Zod no servidor independentemente de RHF. RHF e validação HTML são
      recursos de interface, não barreiras de segurança da API.
- [ ] Antes de escrever código Next.js, ler os guias relevantes da versão instalada
      em `node_modules/next/dist/docs/`, conforme `AGENTS.md`; consultar também o
      comportamento da versão instalada do Auth.js. Não presumir APIs de versões
      anteriores nem alterar o lockfile para obter documentação.

## 2. Sequência obrigatória e registro de evidências

Executar nesta ordem: **S0 → S1 → S2 → S3 → S4 → S5 → S6 → S7 → S8**.
S1, S2 e S3 são P0. S4–S7 completam a proteção pública e a defesa no navegador.
E-mail/MFA/política nova de senhas têm trilha separada; não bloqueiam o fluxo atual.

Para cada etapa:

1. Registrar contrato atual, arquivos envolvidos e quais chamadas serão afetadas.
2. Criar testes comportamentais que reproduzam a falha antes da correção. Confirmar
   que falham pela razão esperada; não aceitar falha de import/setup como reprodução.
3. Implementar a menor mudança, respeitando `route → controller → service →
   repository` onde aplicável. Segurança compartilhada fica em infraestrutura
   própria, sem misturar regras de negócio dos módulos.
4. Executar os testes da etapa e as regressões ligadas à superfície alterada.
5. Registrar resultado, commit, comando, ambiente, limitações e aceite manual.
   Não marcar `[x]` se faltar teste HTTP real ou navegador quando exigido.
6. Só avançar com o contrato legítimo preservado. Não alterar expectativas de um
   teste existente apenas para acomodar uma regressão.

Modelo de registro por etapa:

| Etapa | Commit/artefato | Reprodução antes | Testes depois | Regressões | Aceite HTTP/PWA | Pendências |
| --- | --- | --- | --- | --- | --- | --- |
| S0–S8 | preencher por etapa | comando e falha esperada | comando e resultado | comando e resultado | dispositivo/ambiente | explícitas |

## S0 — Caracterizar o comportamento antes de alterar

### Execução

- [ ] Registrar commit, Node, versões do lockfile, processo de start e quantidade
      de processos do ambiente de teste; identificar onde TLS/proxy/CDN terminam.
- [ ] Inventariar entradas reais de credenciais: formulários, POST do Auth.js,
      eventuais Server Actions e chamadas diretas. O endpoint não pode ficar
      desprotegido porque a tela ou o proxy foram contornados.
- [ ] Capturar, com dados fictícios, status e estrutura das respostas e destinos
      de navegação. Não copiar senha, hash, cookie ou dados de produção para o plano.
- [x] Executar a base existente de auth, roteamento, sessão, acesso, pastoral e sync.
      Distinguir falhas preexistentes; não declarar aprovação de testes não rodados.
- [ ] Preparar global e dois tenants descartáveis, com mesmo e-mail/IDs em ambos,
      slugs diferentes das chaves físicas e contas global/tenant separadas.

### Testes de caracterização e resultados esperados

- [ ] **BASE-01:** `/admin/login` continua sendo login global; cookie antigo de
      igreja não troca seu contexto nem provoca redirecionamento para login tenant.
- [ ] **BASE-02:** login de igreja exige slug válido; ausente, inválido, ambíguo ou
      igreja indisponível mantém a UI 404 já validada, sem formulário. Conferir
      separadamente o status HTTP, considerando a observação de streaming acima.
- [ ] **BASE-03:** mesmo e-mail em duas igrejas autentica com credenciais e permissões
      próprias; a resolução usa `databaseKey`, sem criar bancos para slugs ausentes.
- [ ] **BASE-04:** cadastro legítimo cria pendência, não autentica nem cria acesso
      antecipado; aprovação cria acesso MEMBER e preserva publicação/notificações.
- [ ] **BASE-05:** falha de SSE/Push não desfaz cadastro persistido. Rejeição pastoral
      mantém seu contrato e não cria usuário ou post de boas-vindas.
- [ ] **BASE-06:** logout/expiração voltam ao login global ou ao slug correto;
      sessão antiga na tela de login não disputa com a nova autenticação.
- [ ] **BASE-07:** navegação mobile/desktop, PWA, branding, senhas já cadastradas,
      retomada offline e filas existentes funcionam antes e depois da mudança.

Arquivos de referência: `src/test/auth.test.ts`, `tenant-isolation.test.ts`,
`tenant-login-screen.test.tsx`, `login-routing.test.ts`,
`login-session-bridge.test.tsx`, `pastoral-layer.test.ts`, `offline-session.test.ts`
e `api/security.test.ts` (todos sob `src/test/`). O teste atual de auth verifica
Prisma/bcrypt; ele sozinho não prova o fluxo HTTP do Auth.js nem revogação.

## S1 — P0: impedir exposição de hashes e outros segredos

Pontos iniciais: `src/server/members/members.repository.ts`, service/controller de
membros, `/api/members`, `/api/members/[id]`, perfis, sync e caches clientes.

### Execução

- [x] Definir saídas explícitas por uso, sem espalhar registros completos do Prisma.
      Preservar todos os campos funcionais já consumidos pelos clientes.
- [x] Separar consultas internas de credenciais das consultas para apresentação.
      A aprovação e a autenticação podem ler hash no servidor; respostas, SSE,
      Push, logs, erros e cache cliente não podem recebê-lo.
- [~] Cobrir list/get/create/update e outras saídas que retornem `Member`, incluindo
      caminhos alternativos e sync. Não assumir que consertar GET cobre os demais.
- [ ] Verificar caches já populados. Se necessário, remover apenas propriedades
      sensíveis dos registros afetados; preservar dados offline, carrinho e outbox.

### Testes

- [~] **SECRET-01:** usar hash sentinela em banco descartável; percorrer respostas
      JSON reais de lista, detalhe, create/update e perfil. Nem `passwordHash` nem o
      valor sentinela podem existir em qualquer nível do retorno.
- [ ] **SECRET-02:** repetir para ADMIN, PASTOR e usuário com permissão granular;
      falta de permissão permanece 403, ausência de sessão permanece 401.
- [ ] **SECRET-03:** sync pull, notificações, logs capturados e erros não contêm
      senha/hash; preservar a seleção explícita já existente no sync de membros.
- [x] **SECRET-04:** aprovação ainda consegue ler o hash internamente e o novo
      usuário entra com a mesma senha cadastrada. Nenhuma senha é reprocessada.
- [ ] **SECRET-05:** DTO mantém vínculos, equipes, avatar, créditos, permissões e
      demais campos funcionais; edição, carteira e compra continuam funcionando.
- [ ] **SECRET-06:** eventual saneamento de cache remove o segredo, conserva filas
      pendentes e não mistura usuários/tenants. Testar também cache sem esse campo.

Aceite: segredo ausente na resposta HTTP, não apenas omitido por tipo TypeScript.

## S2 — P0: revogação efetiva de sessão nas APIs

Pontos iniciais: `src/auth.ts`, `src/proxy.ts`, guards das rotas protegidas e
`src/lib/access-control.ts`. A lib de permissão não substitui autenticação válida.

### Execução

- [~] Garantir checagem de sessão válida antes do acesso a cada API protegida.
      Corrigir a saída antecipada do proxy e proteger o handler quando invocado
      diretamente; manter APIs públicas, Auth.js e outras exceções explícitas.
- [x] Revalidar admin global ativo/existente e sua versão de autorização no servidor,
      sem depender de `useSession().update()` disparado pelo navegador.
- [~] Distinguir atualização de permissões de revogação. Preservar atualização de
      papel/permissões por SSE sem exigir novo login quando esse é o contrato atual.
      Se necessário, separar versão de credencial/revogação da versão de permissões.
- [ ] Não invalidar todos os JWTs por mudança de formato sem estratégia de
      compatibilidade. Tratar tokens antigos com segurança e documentar a transição.
- [ ] Falha de revalidação não pode conceder acesso no servidor. Manter leitura
      offline já permitida sem tratá-la como autorização para novas operações online.

### Testes

- [~] **SESSION-01:** sessão ausente ou `authValid: false` retorna 401 no handler de
      membros e nas demais rotas cobertas, sem consulta/gravação de domínio.
- [ ] **SESSION-02:** entrar, desativar/excluir usuário e repetir chamada com o mesmo
      cookie. A próxima requisição protegida é recusada, inclusive fora da UI.
- [~] **SESSION-03:** repetir para igreja inativa/arquivada ou `authVersion` alterada,
      e para admin global desativado/excluído/revogado. Reativar não ressuscita uma
      sessão explicitamente revogada; novo login funciona com a conta ativa.
- [~] **SESSION-04:** mudança de permissões atualiza servidor/UI conforme o contrato
      atual, sem ampliar acesso nem forçar logout indevido de sessão legítima.
- [ ] **SESSION-05:** login/logout/CSRF do Auth.js, branding público, cadastro e
      manifesto continuam acessíveis conforme seus contratos.
- [ ] **SESSION-06:** conservar slug no logout/expiração do tenant e contexto do
      global; token antigo não causa loop ou corrida nas telas de login.
- [ ] **SESSION-07:** offline conserva somente a experiência já permitida; ao
      reconectar, sessão revogada não envia outbox nem recebe dados novos. Dados
      pendentes não são apagados nem reaplicados em outra sessão.
- [ ] **SESSION-08:** indisponibilidade do banco de revalidação não dá acesso;
      sessões válidas e rotas de leitura online continuam normais após recuperação.

Aceite: testar callback real de sessão e cookie reutilizado contra HTTP. Mockar
`authValid: false` cobre o guard, mas não prova a detecção da revogação no Auth.js.

## S3 — P0: rate limit obrigatório no servidor

### Política e arquitetura

- [x] Proteger somente tentativas de credenciais, global e tenant, e
      `POST /api/public/register`. Levantar o caminho HTTP efetivo na versão instalada
      do Auth.js e cobrir entradas alternativas sem cobrar a mesma tentativa duas vezes.
- [x] Combinar limite por IP confiável e por identidade normalizada/escopo. Login
      global usa namespace próprio; login tenant usa identidade estável da igreja,
      não chave fornecida livremente pelo cliente. Renomear slug não zera o limite.
- [x] Normalizar e-mail como o login existente. Não alterar a senha. Chaves devem
      ter tamanho limitado, TTL e identificação protegida, sem senha ou e-mail cru
      em logs/chaves administrativas. Evitar criar infinitas chaves por lixo recebido.
- [x] Contabilizar entradas malformadas/inexistentes no limite por IP antes de
      trabalho caro. Conferir admissão antes de bcrypt, gravação ou notificação.
- [x] Usar armazenamento compartilhado e operações atômicas com expiração; `Map`
      local não é garantia de produção. Documentar como funciona com dois processos,
      restart e proxy. Não introduzir Redis ou nova dependência automaticamente:
      escolher um adaptador compatível com a infraestrutura disponível. Se não
      houver infraestrutura adequada, registrar o bloqueio em vez de declarar pronto.
- [~] Confiar em cabeçalhos de IP somente quando sobrescritos pelo proxy conhecido.
      Não aceitar o primeiro `X-Forwarded-For` de origem arbitrária. Documentar cadeia
      de proxies, IPv4/IPv6 e comportamento quando não houver IP confiável.
- [x] Se o store falhar, responder 503 nas tentativas de login/cadastro, sem executar
      bcrypt/gravação e sem liberar tentativas ilimitadas. Sessões já válidas e
      outros fluxos não dependem desse store e continuam funcionando.

Parâmetros iniciais **propostos**, configuráveis no servidor e a calibrar com os
cenários abaixo antes da ativação. Não são limites já implementados ou medidos:

| Operação | Dimensão | Limite inicial | Teste de fronteira |
| --- | --- | --- | --- |
| Login | Conta normalizada + global/igreja | 5 tentativas em 15 min | A 6ª é recusada |
| Login | IP, compartilhado entre os contextos de login | 60 tentativas em 5 min | A 61ª é recusada |
| Cadastro | IP, entre igrejas | 5 tentativas em 15 min | A 6ª é recusada |
| Cadastro | E-mail normalizado + igreja | 3 tentativas em 1 h | A 4ª é recusada |

Todos os limites aplicáveis precisam permitir a operação. Não criar teto baixo por
igreja que bloqueie todos os membros por causa de um atacante. Validar também
cadastro coletivo/login após culto: várias pessoas podem compartilhar o mesmo IP.
Calibrar o limite por IP sem remover o limite por conta nem criar bloqueio permanente.
Login bem-sucedido, logout ou troca de slug não devem apagar contadores de IP.

### Contrato HTTP e interface

- [x] Excesso retorna **429**, `Retry-After` válido e mensagem genérica, sem revelar
      existência da conta ou regra interna. Indisponibilidade do store retorna 503.
- [x] Não basta lançar uma exceção em `authorize`: comprovar o status no transporte
      real do Auth.js. Preservar CSRF, cookies, redirects e tratamento de credenciais.
- [~] Formulários exibem espera/erro recuperável e preservam os valores apropriados.
      Não guardar senha em storage/logs, não repetir POST automaticamente e não
      transformar 429 em mensagem de senha incorreta. A espera exibida não é o guard.
- [x] APIs clientes de outros domínios não mudam de contrato por causa desse erro.

### Testes unitários, concorrentes e HTTP

- [~] **RATE-01:** para cada linha da tabela, liberar até N, negar N+1 e liberar
      depois da janela; testar instante anterior/no limite e `Retry-After` positivo.
      Usar relógio controlado, sem esperas reais longas.
- [x] **RATE-02:** executar requisições simultâneas no mesmo bucket: exatamente N
      admissões; demais 429. Duas instâncias devem compartilhar o mesmo contador.
- [~] **RATE-03:** reiniciar processo não zera limite ativo; buckets expiram, são
      limpos e não crescem indefinidamente. Não usar reset de store real nos testes.
- [x] **RATE-04:** variações de maiúsculas/espaços de e-mail contam para a mesma
      conta. Mesmo e-mail em igrejas diferentes não compartilha limite de conta;
      limite agregado de IP ainda se aplica. Global permanece em namespace próprio.
- [x] **RATE-05:** trocar IP não contorna o limite por conta; trocar e-mail/slug não
      contorna o de IP. IPv4/IPv6 equivalentes seguem a normalização documentada.
- [~] **RATE-06:** falsificar `X-Forwarded-For`, `X-Real-IP` e headers do CDN não
      reinicia buckets. Testar a cadeia real do proxy em homologação.
- [ ] **RATE-07:** payload inválido, conta/igreja inexistente e senha errada não são
      bypass. Resposta e tratamento de limite não revelam se a conta existe.
- [x] **RATE-08:** resposta bloqueada não chama bcrypt, INSERT, aprovação, e-mail,
      SSE ou Push. Store indisponível produz 503 e zero desses efeitos.
- [x] **RATE-09:** POST direto no Auth.js e no cadastro, sem formulário, também é
      limitado. Fluxo real do `signIn` exibe o erro correto e funciona após expiração.
- [x] **RATE-10:** login/logout corretos não apagam o limite agregado; tentativas
      bloqueadas não prolongam indefinidamente uma janela de bloqueio fixa.
- [ ] **RATE-11:** cenário de vários usuários no mesmo Wi-Fi comporta o volume
      legítimo definido em homologação. Documentar quantidade, janela e parâmetros.
- [~] **RATE-12:** enquanto uma conta/IP está bloqueada, sessões válidas continuam
      usando dashboard, membros, Cantina, refresh, sync, SSE, Push, logout e PWA;
      outra conta/igreja elegível continua entrando sob seus próprios limites.

Aceite: testes de unidade, store real descartável, concorrência em dois processos
e HTTP no artefato de produção. Mock em memória sozinho não atende este requisito.

## S4 — Validação de entrada, senha e formulários públicos

### Execução

- [ ] Criar schema Zod próprio do cadastro público e outro de entrada do login.
      Compartilhar regras puras frontend/servidor, sem importar bcrypt, Prisma,
      segredos ou código server-only no bundle cliente.
- [ ] No login, validar tipo e tamanho defensivo sem exigir uma política nova de
      senha mínima: senhas existentes continuam válidas. Não aplicar `.trim()` à senha.
- [ ] No cadastro, validar nome/e-mail/telefone, enums, datas, campos opcionais e
      limites máximos. Preservar Unicode, acentos, apóstrofos e a máscara de telefone;
      campos opcionais vazios do formulário continuam aceitos como ausência.
- [ ] Limitar corpo antes de carregar JSON inteiro; estabelecer valor inicial de
      16 KiB para o cadastro e verificar que comporta todos os campos permitidos.
      Não confiar apenas em `Content-Length`. Limitar tamanho de senha em bytes para
      não permitir truncamento silencioso do bcrypt em novos cadastros; alinhar
      cliente e servidor. Não aplicar esse teto novo ao login de contas legadas:
      o teto defensivo do request não pode impedir sua autenticação já suportada.
- [ ] Não cortar nem reescrever senha. Manter mínimo atual nesta entrega para não
      mudar a política já validada; tratar aumento de mínimo como evolução separada.
- [ ] Rejeitar JSON inválido, `null`, array ou tipos errados com 400; tipo de mídia
      incorreto com 415; corpo acima do teto com 413, sem erro interno ou gravação.
- [ ] Ignorar/rejeitar explicitamente campos não públicos: `role`, `permissions`,
      `approved`, `active`, créditos, ID físico de banco e credencial já calculada.
      O servidor mantém aprovação falsa, igreja resolvida e papel de acesso padrão.
- [ ] Adotar RHF + `zodResolver` nos dois forms públicos em mudança isolada,
      preservando JSX/layout, máscaras, foco, mostrar senha, autocomplete, confirmação,
      estado de envio, branding, links e feedback. Não refatorar os outros forms.
- [ ] Diferenciar erro de campo, credencial incorreta, 429, rede e 503, sem revelar
      dados internos. Não alterar globalmente o cliente HTTP dos outros módulos.

Contrato inicial do cadastro público, a verificar com as fixtures de compatibilidade
antes de adotar. Estes limites não são uma alteração dos schemas administrativos:

| Campo | Regra proposta | Compatibilidade obrigatória |
| --- | --- | --- |
| Nome | Texto após trim, 2–120 caracteres | Unicode, acentos e apóstrofos válidos |
| E-mail | Formato validado, trim/lowercase, máximo 254 caracteres | Mesma normalização de identidade do login |
| Telefone | Máximo 32 caracteres recebidos; 8–15 dígitos para validar | Máscara atual aceita; não mudar formato de saída incidentalmente |
| Telefone do responsável | Mesma regra, opcional | Vazio/ausente continua permitido |
| Igreja anterior | Texto simples, máximo 160 caracteres, opcional | Vazio continua permitido |
| Sobre mim | Texto simples, máximo 2.000 caracteres, opcional | Quebras de linha e caracteres legítimos preservados |
| Estado civil | `single`, `married`, `divorced`, `widowed` | Preservar valor inicial e labels atuais |
| Datas | Data de calendário válida no formato enviado pelo form, opcional | Vazio continua permitido; não inventar regra de idade/data de negócio |
| Senha nova | Mínimo atual de 6 caracteres e máximo 72 bytes UTF-8 | Sem trim, corte ou alteração; login legado não recebe a regra nova |
| Confirmação de senha | Igualdade exata no form | Não persistir nem registrar; não é mecanismo de autorização |
| Igreja | Slug válido resolvido no global, ativo/disponível | Cliente nunca escolhe arquivo físico do banco |

Antes de encerrar esta etapa, registrar os valores finais adotados e comparar com
as entradas legítimas da BASE. Uma flexibilização necessária precisa manter teto
finito e testes de fronteira; não importar regras novas para outros formulários.

### Testes

- [ ] **INPUT-01:** tabela de entradas válidas e inválidas executada diretamente
      no schema e por POST sem navegador. E-mail arbitrário, telefone impossível,
      enum desconhecido e datas inválidas não geram registro/notificação.
- [ ] **INPUT-02:** campos opcionais vazios/ausentes, nomes como `João D'Ávila`,
      caracteres Unicode e telefone mascarado legítimo preservam o resultado atual.
- [ ] **INPUT-03:** testar cada limite em N−1/N/N+1, bytes UTF-8 de senha e corpo
      com/sem `Content-Length`, chunked ou tamanho declarado incorretamente.
- [ ] **INPUT-04:** senha com espaços e Unicode é preservada no novo cadastro e
      autentica após aprovação. Senhas antigas, inclusive com seis caracteres,
      continuam autenticando; não tentar alterar hashes existentes automaticamente.
- [ ] **INPUT-05:** `null`, arrays, objetos aninhados, strings no lugar de boolean,
      JSON malformado e campos extras não causam 500 ou elevação de privilégio.
- [ ] **INPUT-06:** enviar `approved: true`, `role: ADMIN`, permissões e chave de
      banco alheio nunca concede acesso ou grava fora da igreja resolvida.
- [ ] **FORM-01:** RHF mostra erro junto ao campo, não envia inválidos e mantém
      todos os campos/valores padrão e a confirmação de senha do cadastro atual.
- [ ] **FORM-02:** Enter, clique duplo, senha visível/oculta, foco com teclado mobile,
      loading, falha de rede e reenvio manual não perdem dados ou duplicam cadastro.
- [ ] **FORM-03:** login global e tenant preservam destinos, slug bloqueado, branding
      e retorno após logout. 429 não causa loop, novo POST ou limpeza de outros caches.
- [ ] **FORM-04:** cadastro/edição administrativa de membros, materiais, produtos,
      estacionamento e configurações mantêm regras e resultados anteriores.

Aceite: schema de servidor funciona mesmo com RHF/HTML completamente contornados.

## S5 — Origem, tipo de conteúdo e CSRF

### Execução

- [ ] Exigir JSON no cadastro, aceitando `application/json; charset=utf-8` e
      rejeitando tipos simples como `text/plain`, form-urlencoded e multipart.
- [ ] Validar `Origin` contra origens confiáveis configuradas, considerando o proxy
      de produção; não construir allowlist a partir de Host arbitrário do cliente.
      Para ausência de Origin, documentar e testar fallback confiável de Referer ou
      recusa 403. Formulários oficiais não dependem dessa ausência.
- [ ] Usar Fetch Metadata como camada complementar; sua ausência em navegador
      suportado não pode ser tratada sem a política de compatibilidade documentada.
- [ ] Manter CSRF/cookies do Auth.js. Não desativar proteção para acomodar o limiter
      ou criar um endpoint paralelo que receba credenciais sem ela.
- [ ] Tratar rejeições antes de efeitos e não aplicar middleware de origem genérico
      em webhooks, SSE, Push, sync, leitura pública ou outros módulos nesta entrega.

### Testes

- [ ] **ORIGIN-01:** cadastro legítimo desktop, Android e PWA iOS/standalone passa
      com headers reais e segue para aprovação; proxy não causa falso 403.
- [ ] **ORIGIN-02:** JSON enviado de origem externa, inclusive como `text/plain`,
      é recusado (403 ou 415 conforme a ordem definida), sem INSERT ou notificação.
- [ ] **ORIGIN-03:** origem ausente, `null`, malformada, subdomínio parecido e
      Host/Forwarded falsificado seguem a política; comparação não usa `startsWith`.
- [ ] **ORIGIN-04:** callback de login/logout do Auth.js com CSRF válido continua
      funcionando; token ausente, incorreto ou sem cookie não cria sessão.
- [ ] **ORIGIN-05:** preflight/origem recusada não libera escrita. Requests same-origin
      com charset passam; Content-Type duplicado/ambíguo segue contrato explícito.
- [ ] **ORIGIN-06:** notificações, stream, sync e demais chamadas legítimas conservam
      seus contratos; nenhum guard novo foi aplicado globalmente por conveniência.

## S6 — XSS, SQL e integridade do cadastro

### Execução

- [ ] Manter dados de nome/descrição/igreja anterior como texto em todos os destinos:
      pendências, detalhes, perfil, Feed de boas-vindas, notificações e eventuais exports.
      Não introduzir `dangerouslySetInnerHTML`, HTML concatenado ou avaliação de código.
- [ ] Validar campos por seu significado; não considerar regex de remoção de tags
      uma defesa suficiente. Se HTML rico vier a ser requisito, tratar sanitização
      por contexto em outra mudança. Não pré-escapar texto no banco e gerar escape duplo.
- [ ] Preservar consultas parametrizadas, inclusive nas chamadas RawUnsafe atuais.
      Não interpolar dados do formulário na string SQL.
- [ ] Tornar criação de pendência atômica por e-mail normalizado/igreja. Avaliar
      duplicatas preexistentes em leitura antes de qualquer índice/migration; não
      mesclar, excluir ou vincular automaticamente membros/usuários existentes.
- [ ] Evitar enumerar e-mails pela resposta pública de duplicidade. Definir resposta
      neutra compatível com a tela atual: nenhuma duplicata, novo acesso, alteração
      de senha ou notificação repetida. Se for necessário mudar status/DTO, documentar
      o contrato e atualizar apenas o consumidor público na mesma etapa.

### Testes

- [ ] **XSS-01:** fixtures de `<script>`, script externo, `<svg onload>`, evento em
      imagem e entidades percorrem todos os destinos. Validar em DOM como texto;
      testar também fixture legada gravada diretamente no banco descartável, para
      não depender da nova validação de entrada.
- [ ] **XSS-02:** no navegador real, nenhum marcador JS executa e nenhuma requisição
      de script é enviada para origem controlada de teste. Não usar domínio malicioso
      real da evidência. jsdom sozinho não demonstra ausência de execução no browser.
- [ ] **XSS-03:** acentos, apóstrofos, `<`/`>` em textos permitidos e quebras de linha
      não recebem escape duplo nem desaparecem; registro malicioso não é aprovado
      automaticamente nem executado pelo painel ao ser listado.
- [ ] **SQL-01:** apóstrofos e strings de tentativa de SQL injection são dados ou
      entradas recusadas; nunca mudam consulta, aprovação, tabela ou outro tenant.
- [ ] **REGISTER-01:** cadastros simultâneos com mesmo e-mail/igreja criam no máximo
      uma pendência e os efeitos correspondentes uma vez; outro tenant é independente.
- [ ] **REGISTER-02:** e-mail novo/duplicado têm contrato público neutro, sem expor ID
      de membro existente; senha, dados e acesso existentes não são sobrescritos.
- [ ] **REGISTER-03:** falha/timeout após persistência e retry não duplicam pendência,
      usuário ou efeitos. Falha de notificação mantém o cadastro já confirmado.
- [ ] **REGISTER-04:** verificar comportamento de registro arquivado/excluído antes
      de escolher a restrição de unicidade; preservar recadastro legítimo suportado.

## S7 — Cabeçalhos e defesa no navegador

### Execução

- [ ] Primeiro inspecionar headers do artefato e do proxy/CDN em homologação.
      Ausência no `next.config.ts` não comprova ausência em produção.
- [ ] Inventariar scripts, estilos, imagens, fontes, conexões, workers e manifesto.
      Definir CSP compatível com a versão instalada do Next.js, começar em
      Report-Only e avaliar violações legítimas antes de enforcement.
- [ ] Impedir framing indevido e definir `nosniff`; configurar HSTS somente no
      ponto HTTPS correto, sem ampliar para subdomínios que não foram verificados.
- [ ] Se CSP atingir rotas além dos forms, essa mudança exige a regressão ampliada
      abaixo antes da ativação. Não enfraquecer política com curingas para fazê-la passar.

### Testes

- [ ] **HEADERS-01:** conferir headers reais via HTTP no host publicado de homologação,
      incluindo respostas de erro, sem políticas conflitantes entre app e CDN.
- [ ] **HEADERS-02:** página de teste externa não consegue enquadrar login/admin
      quando enforcement estiver ativo; app legítimo abre normalmente.
- [ ] **HEADERS-03:** login, cadastro, hidratação, mudança de tema, menus, imagens
      de branding, fontes e navegação continuam funcionando sem violações legítimas.
- [ ] **HEADERS-04:** validar instalação/atualização PWA, manifesto/ícones, worker,
      offline, SSE/Push e sync em Android/iOS/desktop no artefato de produção.
- [ ] **HEADERS-05:** Report-Only registra o que deve e não bloqueia a aplicação;
      enforcement só é aceito depois dos testes. Relatórios não expõem segredos.

## Evoluções separadas — não mudar o cadastro atual neste pacote

- [ ] **EMAIL:** planejar comprovação de propriedade conforme `email-todo.md`.
      Provider ainda não existe. Não incluir flag de verificação obrigatória que
      impeça cadastro/aprovação/login atuais antes de infraestrutura e migração.
- [ ] Antes de ativar e-mail, testar sender fake, token expirado/único vinculado a
      usuário/igreja, resend limitado, retry idempotente, falha de envio e interação
      com aprovação pastoral. Token não pode autenticar ou aprovar por si só.
- [ ] **PASSWORD/MFA:** planejar política de senhas novas e MFA do global em release
      próprio, com recuperação e compatibilidade das contas existentes. Não tratar
      instalação de RHF/Zod como alteração de política de senha.
- [ ] Não registrar essas evoluções como concluídas nem ativá-las implicitamente
      durante as correções P0. Seus critérios de aceite não autorizam mudança de fluxo.

## S8 — Regressão, liberação gradual e rollback

### Organização dos testes a criar

Nomes propostos; podem ser ajustados mantendo a rastreabilidade dos IDs acima:

| Suíte | Cobertura mínima |
| --- | --- |
| `members-sensitive-output.test.ts` | SECRET: DTO/handler e dados legados/cache |
| `auth-session-revocation.test.ts` + `api/security.test.ts` | SESSION: callback, guards e permissões |
| `public-auth-rate-limit.test.ts` | RATE: clock, chaves, fronteiras e falhas |
| `public-auth-rate-limit.integration.test.ts` | Store real descartável, concorrência e dois processos |
| `public-registration-contract.test.ts` | INPUT/ORIGIN/REGISTER via handler e banco temporário |
| `public-auth-forms.test.tsx` | FORM: RHF, mensagens e contratos de interface |
| `public-member-xss.test.tsx` | XSS: DOM de todos os destinos e dados legados |
| Aceite HTTP/browser do build | Auth.js/cookies, CSP, PWA e regressões de ponta a ponta |

Não instalar runner de navegador nesta etapa automaticamente. Usar ferramenta já
disponível ou roteiro manual documentado. Teste de componente não substitui teste
real do navegador, nem teste de repository substitui a API de produção.

### Execução local/CI

- [ ] Usar somente dados/serviços descartáveis; migrations de integração apontam
      explicitamente para diretório temporário e nunca para bancos do workspace.
- [ ] Usar Prisma instalado diretamente, sem `npx` que possa baixar pacote ausente.
      Ler os testes existentes antes de executá-los neste checkout sem dependências.
- [ ] Isolar relógio, variáveis, clientes e store entre testes. Manter a configuração
      de integração serial do Vitest; concorrência intencional ocorre dentro do caso.
- [ ] Executar primeiro a suíte específica, depois o grupo de regressão afetado.
      No fechamento do pacote, executar os comandos abaixo com ferramentas existentes:

```bash
npm run prisma:generate
npm run typecheck
npm run typecheck:build
npm run lint
npm test
npm run build
```

Build deve ser seguido por `npm run start` no mesmo artefato com configuração e
bancos descartáveis de homologação. Registrar se algum comando não pôde rodar;
neste documento nenhum desses resultados está sendo antecipado como aprovado.

### Matriz obrigatória de não regressão

| Fluxo | Como validar | Resultado obrigatório |
| --- | --- | --- |
| Global | Entrar/sair, cookie tenant antigo, visão geral, igrejas, planos e usuários | Rotas e acesso global preservados |
| Tenant | Entrar/sair em duas igrejas com mesmo e-mail, slug e `databaseKey` distintos | Nenhum cruzamento de dados/credenciais/contexto |
| Cadastro/pastoral | Cadastrar, aguardar, aprovar/rejeitar, entrar após aprovação | Sem autoaprovação; mesmo fluxo e senha; efeitos corretos |
| Permissões | ADMIN, PASTOR, MEMBER e permissões granulares; mudar acesso por SSE | Mesmo acesso legítimo; revogação efetiva na API |
| CRUD existente | Criar/editar membro, material, produto, estacionamento e configuração | Novas regras públicas não alcançam esses forms |
| Cantina/carteira | Comprar, operar sob perfis permitidos, retry e sync | Sem alteração de vínculos, créditos, totais, estoque ou duplicação |
| Feed/notificações | Aprovação, post de apresentação, SSE e Push fallback | Sem bloqueio pelo limiter e sem exposição de segredo |
| PWA/mobile | Android/iOS/desktop, instalar, abrir, suspender/retomar e atualizar | Mesmo shell, topbar, branding e navegação |
| Offline | Leitura já permitida, pendências, reconectar e trocar usuário/tenant | Sem perda de outbox; sem envio sob sessão revogada ou contexto alheio |
| Segurança | Repetir ataques controlados e limites no build | Recusa comprovada fora da interface |

Reutilizar suites existentes de acesso/permissões, `member-access-service`, sync,
compra da Cantina, Feed, notificações, `admin-pwa`, offline e branding. Não duplicar
asserts triviais nem substituir esses testes por buscas de strings no código.

### Homologação e ativação

- [ ] Registrar parâmetros, store, topologia/IP confiável e latência antes/depois.
      Medir fluxo legítimo: bloqueios não podem resultar de IP do proxy compartilhado.
- [ ] Validar HTTPS e build de produção com duas igrejas de teste e admin global;
      repetir cookie revogado e rate limit por chamadas diretas controladas.
- [ ] Ativar limiter somente depois de store, headers, 429/503 e cenários de NAT
      comprovados. Report-Only do CSP não autoriza ativar enforcement sem aceite.
- [ ] Revisar diff para confirmar que outras regras de negócio, dependências,
      layouts, fluxos e bancos não foram alterados incidentalmente.
- [ ] Registrar aceite separado por plataforma. Ausência de iOS/Android disponível
      permanece pendência explícita, não sucesso presumido.
- [ ] Depois do deploy, fazer apenas smoke de baixo volume e acompanhar erros,
      decisões de limite e latência sanitizados. Não executar carga/ataques contra
      produção para demonstrar o limiter.

### Rollback e definição de pronto

- [ ] Separar mudanças em etapas revisáveis, com versão/configuração anterior
      documentada; evitar migration destrutiva e alteração de `AUTH_SECRET`.
- [ ] Se houver regressão legítima, identificar o componente: ajustar parâmetros/IP,
      retornar CSP a Report-Only ou reverter o componente de UI, preservando as
      correções de segredo e de sessão. Não usar liberação irrestrita como fallback.
- [ ] Se uma proteção essencial precisar ser retirada, restringir temporariamente
      apenas login/cadastro afetado e corrigir/avançar; sessões válidas e outros
      fluxos não devem ser indisponibilizados pelo mecanismo de rate limit.
- [ ] Pronto somente com: SECRET/SESSION/RATE/INPUT/FORM/ORIGIN/XSS/SQL/REGISTER
      aprovados, headers compatíveis, matriz de regressão aprovada e evidências
      registradas. Nenhum hash exposto, bypass por chamada direta, teste ignorado
      ou aceite obrigatório pendente pode ser mascarado por checkbox concluído.

Referências de prevenção: [OWASP XSS](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html),
[OWASP autenticação](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
e [OWASP CSRF](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html).
