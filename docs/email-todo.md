# TODO — E-mail transacional

## Estado atual

- [x] E-mail é usado como identificador de usuário e destinatário interno.
- [x] Notificações internas, SSE e Web Push estão disponíveis.
- [ ] Não existe provider SMTP/API nem envio de e-mail transacional.

## Implementação planejada

- [ ] Definir o provider de produção (SMTP, Resend ou serviço equivalente).
- [ ] Criar uma porta `EmailSender` na infraestrutura, sem chamadas de provider em rotas.
- [ ] Criar service de e-mail com templates versionados e dados tipados.
- [ ] Adicionar fila/outbox para retry, idempotência e processamento assíncrono.
- [ ] Registrar status de envio, tentativas, erro e `sentAt`.
- [ ] Criar preferências de comunicação por usuário/tenant.
- [ ] Implementar confirmação de cadastro e recuperação de senha.
- [ ] Implementar avisos de cantina quando pedido estiver pronto ou houver cobrança.
- [ ] Implementar convites e avisos administrativos.
- [ ] Evitar envio duplicado quando a mesma notificação já foi entregue por SSE/Push.
- [ ] Adicionar testes com sender fake, sem disparar e-mails reais.
- [ ] Configurar domínio, remetente, SPF, DKIM e DMARC antes de produção.

## Regra arquitetural

```text
route -> controller -> service -> email sender/infrastructure
```

O domínio decide quando enviar e-mail; a infraestrutura conhece o provider. Segredos
devem ficar somente em variáveis de ambiente e nunca no banco ou no frontend.
