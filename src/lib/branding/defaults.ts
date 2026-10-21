export const PLATFORM_ADMIN_LOGO = '/branding/church-admin/header.svg';
export const PLATFORM_ADMIN_MANIFEST = '/api/public/admin-manifest';

export function getPlatformAdminIconUrl(size: 192 | 512) {
  return `/api/public/admin-icon?size=${size}&v=1`;
}
