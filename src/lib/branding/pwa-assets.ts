export function getTenantPwaIconUrl(slug: string, size: 192 | 512, version?: number) {
  const params = new URLSearchParams({ igreja: slug, size: String(size) });
  if (version) params.set('v', String(version));
  return `/api/public/branding-icon?${params.toString()}`;
}
