type LoginContext = {
  pathname?: string;
  isPlatformAdmin?: boolean;
  tenantSlug?: string | null;
};

export function isLoginRoute(pathname: string) {
  return pathname === '/admin/login' || pathname.startsWith('/admin/login/')
    || pathname === '/auth/login' || pathname.startsWith('/auth/login/');
}

export function getLoginUrl({ pathname = '', isPlatformAdmin = false, tenantSlug }: LoginContext) {
  if (isPlatformAdmin || pathname === '/admin' || pathname.startsWith('/admin/')) return '/admin/login';
  const slug = tenantSlug?.trim().toLowerCase();
  return slug ? `/auth/login?igreja=${encodeURIComponent(slug)}` : '/auth/login';
}
