/**
 * Endpoint antigo sem consumidores no frontend atual. Seus upserts brutos
 * contornavam autorização de pedido, abertura, estoque e políticas de cada módulo.
 * Não redirecionar POST: o contrato novo exige operações explícitas e idempotência.
 */
export function getRetiredSyncResponse() {
  return {
    error: 'Este endpoint de sincronização foi desativado. Atualize o aplicativo.',
    code: 'LEGACY_SYNC_RETIRED',
    endpoints: { pull: '/api/sync/pull', push: '/api/sync/push' },
  };
}
