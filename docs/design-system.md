# Design System

## Base

O app usa Tailwind CSS com tokens em `src/app/globals.css` e componentes shadcn/Radix em `src/components/ui`.

Diretrizes:

- Nao hardcodar cores quando houver token: use `bg-primary`, `text-muted-foreground`, `border-border`, `bg-card`.
- Preservar suporte a modo claro/escuro.
- Manter UI mobile-first.
- Usar `lucide-react` para icones de acoes comuns.
- Preferir drawers em fluxos mobile e dialogs quando a interacao for modal.

## Primitives

Sempre reutilizar:

- `Button` para acoes.
- `Input`, `Textarea`, `Select`, `Switch`, `Label` para formularios.
- `Card` para itens, paineis e secoes compactas.
- `Badge` para status, filtros e permissao.
- `Table` ou `DataTable` para listagens tabulares.
- `Dialog`, `Drawer`, `Sheet`, `AlertDialog` para overlays.
- `Tooltip` para icones pouco obvios.

## Componentes Compartilhados Recomendados

Criar em `src/components/common`:

- `PageShell`
- `PageHeader`
- `EmptyState`
- `LoadingState`
- `ErrorState`
- `SearchField`
- `FilterChips`
- `ActionMenu`
- `ConfirmDeleteDialog`
- `AppImage`
- `EntityCard`

Esses componentes devem reduzir repeticao nas paginas grandes e manter consistencia visual.

## Regra De Organizacao

Uma pagina em `src/app/**/page.tsx` deve orquestrar a tela. Ela nao deve concentrar regra de negocio extensa, fetch, formularios longos e markup repetido. Quando passar de aproximadamente 250 linhas, considerar extrair componentes e hooks.
