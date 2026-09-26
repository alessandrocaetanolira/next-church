/**
 * Ponto de entrada compartilhado para tabelas do template Web.
 * Mantém o DataTable legado compatível enquanto os módulos são migrados.
 */
export { DataTable, DataTable as WebDataTable } from '@/components/DataTable';
export type { Column } from '@/components/DataTable';
