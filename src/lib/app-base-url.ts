const PUBLIC_SHARE_BASE_URL = 'https://church.bennipersonalizados.com.br';

export function getAppBaseUrl() {
  const envUrl = process.env.NEXT_PUBLIC_APP_BASE_URL?.trim();
  if (envUrl) {
    return envUrl.replace(/\/+$/, '');
  }

  if (typeof window !== 'undefined' && window.location.origin) {
    return window.location.origin.replace(/\/+$/, '');
  }

  return '';
}

/**
 * Origem pública usada em links que serão enviados para membros.
 * Não usa window.location para evitar QR Codes apontando para localhost,
 * IP da rede local ou para um domínio administrativo diferente.
 */
export function getPublicShareBaseUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_SHARE_BASE_URL?.trim();
  return (configuredUrl || PUBLIC_SHARE_BASE_URL).replace(/\/+$/, '');
}
