import { TenantService } from '../src/lib/tenant-service';

export const createTenant = TenantService.createTenant.bind(TenantService);

if (process.argv[1] && process.argv[1].endsWith('prisma/provision.ts')) {
  createTenant('igreja-teste', 'Igreja Teste', 'admin@igreja-teste.com', '123456')
    .then(() => console.log('Provisionamento concluido.'))
    .catch((error) => {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    });
}
