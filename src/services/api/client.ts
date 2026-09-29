// Compatibilidade para os serviços existentes. Novos domínios devem importar
// diretamente de `@/lib/api`.
export { ApiRequestError, apiRequest, isNetworkError } from '@/lib/api';
