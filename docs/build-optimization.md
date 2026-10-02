# Otimização do build

## Etapa 1 — typecheck separado

O Next usa `tsconfig.build.json` durante `next build`. Essa configuração inclui o
código de produção (`src/app`, componentes, serviços, servidor e infraestrutura)
e não inclui testes ou scripts operacionais do Prisma.

O `tsconfig.json` continua sendo a configuração completa do projeto. Use:

```bash
npm run typecheck
```

para validar todo o código, incluindo testes e scripts, e:

```bash
npm run typecheck:build
```

para validar exatamente o escopo usado pelo build.

## Estado da validação

- `npm run typecheck`: aprovado.
- `npm run typecheck:build`: aprovado.
- O build não concluiu neste ambiente porque o Turbopack falhou ao criar um
  processo auxiliar e vincular uma porta (`Operation not permitted`) durante o
  processamento de `src/app/globals.css`. Esse erro ocorreu antes do typecheck
  do Next e não apontou erro de TypeScript.

## Próximas etapas

1. Medir novamente o build em um ambiente que permita os processos auxiliares do
   Turbopack.
2. Separar os factories Prisma por domínio (global, tenant e Bíblia).
3. Remover Prisma do caminho importado pelo `proxy`.
4. Medir o tracing e o tamanho dos artefatos antes e depois da separação.
5. Revisar o precache do Serwist sem incluir dados bíblicos do Dexie ou dados
   autenticados.
