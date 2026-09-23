import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const databaseUrl = process.env.TENANT_MIGRATION_URL;

if (!databaseUrl) {
  throw new Error('Defina TENANT_MIGRATION_URL com uma URL SQLite absoluta para o banco de referência do tenant.');
}

let databasePath;
try {
  databasePath = fileURLToPath(databaseUrl);
} catch {
  throw new Error('TENANT_MIGRATION_URL deve usar uma URL SQLite absoluta, por exemplo file:/tmp/church_reference.db.');
}

if (databasePath.endsWith('/global.db')) {
  throw new Error('TENANT_MIGRATION_URL não pode apontar para global.db.');
}

execFileSync('npx', ['prisma', 'migrate', 'dev', '--schema=prisma/tenant/schema.prisma'], {
  cwd: process.cwd(),
  env: { ...process.env, DATABASE_URL: databaseUrl },
  stdio: 'inherit',
});
