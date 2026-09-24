# TODO — Jogos Bíblicos

Este documento cobre os dois fluxos atuais:

- `/games`: jogos legados com tentativas persistidas na API de Quiz e fallback local;
- `/jogos-novos`: catálogo novo com jogos executados localmente e nickname salvo no navegador.

## Arquitetura

- [x] Separar a persistência de tentativas do Quiz em `src/services/quiz/quiz-api.ts`.
- [x] Reutilizar o service de tentativas no fluxo `/games`.
- [ ] Criar um service único de resultados para jogos legados e novos.
- [ ] Definir um contrato comum de resultado (`gameId`, pontuação, duração, acertos e data).
- [ ] Manter a lógica de cada jogo independente da API e do Dexie.
- [ ] Criar um hook comum para persistência e sincronização de resultados.

## `/games` — fluxo legado

- [x] Persistir tentativas online no endpoint de Quiz.
- [x] Usar fallback local quando a API estiver indisponível.
- [ ] Garantir idempotência ao reenviar uma tentativa após reconexão.
- [ ] Sincronizar `db.quizAttempts` com o servidor.
- [ ] Exibir estado de envio, pendência e erro ao usuário.
- [ ] Adicionar testes para persistência online, offline e retry.

## `/jogos-novos` — catálogo novo

- [x] Executar os jogos sem dependência de API para iniciar uma partida.
- [x] Manter nickname localmente no navegador.
- [ ] Persistir resultados concluídos no Dexie por tenant e usuário.
- [ ] Criar fila de resultados pendentes de sincronização.
- [ ] Enviar resultados ao reconectar, com chave de idempotência.
- [ ] Permitir continuar uma partida interrompida quando aplicável.
- [ ] Definir quais jogos podem funcionar totalmente offline.
- [ ] Evitar armazenar dados privados no Cache Storage.

## Ranking e perfil

- [ ] Definir se o ranking será por jogo, período, tenant ou global.
- [ ] Criar endpoint autenticado para ranking.
- [ ] Validar que o resultado pertence ao tenant e usuário da sessão.
- [ ] Impedir pontuação duplicada ou adulterada no servidor.
- [ ] Exibir histórico de partidas e melhores pontuações.
- [ ] Integrar pontos dos jogos ao módulo de engajamento, se aprovado.

## Testes e aceite

- [ ] Testar todos os jogos sem rede.
- [ ] Testar fechamento e reabertura durante uma partida.
- [ ] Testar fila offline e retry após reconexão.
- [ ] Testar ausência de duplicidades no servidor.
- [ ] Testar isolamento entre tenants e usuários.
- [ ] Testar ranking com resultados concorrentes.
- [ ] Validar experiência em desktop e dispositivo móvel.

## Próximo incremento recomendado

Criar o contrato comum de resultado e a tabela/fila local no Dexie antes de
implementar ranking. Assim os jogos novos podem continuar locais sem acoplar cada
componente a uma API específica.
