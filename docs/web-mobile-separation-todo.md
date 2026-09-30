# TODO — Separação Web e Mobile

## Objetivo

Separar a composição visual Web e Mobile sem duplicar regras de negócio, APIs,
permissões, sincronização offline ou stores de domínio.

## Regras

- `app/<rota>/page.tsx` coordena a rota e não concentra JSX de Web e Mobile.
- `Screen` controla dados, ações e permissões.
- `WebView` e `MobileView` controlam apenas composição visual.
- Hooks, services, schemas e stores são compartilhados quando o comportamento for
  igual nas duas plataformas.
- Não adicionar novos blocos `hidden md:block`/`md:hidden` em páginas monolíticas.
- Cada etapa deve preservar o contrato atual das APIs.

## Execução

- [x] Mapear shells e páginas grandes.
- [x] Extrair `SettingsSection` da página de Configurações.
- [x] Extrair opções de tema e modos claro/escuro para componente de UI próprio.
- [x] Extrair carregamento, upload Base64 e persistência do branding para `useSettingsBranding`.
- [x] Extrair estado de abas e ações de limpeza offline para `useSettingsController`.
- [x] Criar o shell `SettingsScreen` para centralizar layout e navegação de abas.
- [x] Separar `SettingsWebView`/`SettingsMobileView` dentro do shell.
- [x] Controlar seções pelo modo da View (`web`/`mobile`) em vez de detectar o viewport em cada componente.
- [ ] Separar Cantina em Web/Mobile Views sem duplicar sync, permissões e services.
- [ ] Separar Membros em Web/Mobile Views.
- [ ] Separar Feed em Web/Mobile Views.
- [ ] Separar Grupos e detalhe de Grupo.
- [ ] Separar Bíblia preservando Dexie e drawers mobile.
- [ ] Separar Dashboard e Minha Conta.
- [ ] Extrair `PageState`, `ErrorState`, `EmptyState`, `FilterBar` e `ActionMenu` comuns.
- [ ] Remover containers Web duplicados das páginas já envolvidas pelo `WebTemplate`.
- [ ] Validar cada módulo com typecheck, lint, testes e revisão visual Web/Mobile.

## Ordem prioritária

1. Configurações.
2. Cantina.
3. Membros.
4. Feed.
5. Grupos.
6. Bíblia.
7. Dashboard e Minha Conta.
