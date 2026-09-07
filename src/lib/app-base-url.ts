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
