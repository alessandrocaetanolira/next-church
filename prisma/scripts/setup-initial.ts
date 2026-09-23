import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const databases = path.resolve(root, process.env.CHURCH_DATABASE_DIR ?? 'prisma/databases');
const tenantFile = path.join(databases, 'church_igreja-teste.db');

function run(command: string, args: string[]) {
  console.log(`[setup] ${command} ${args.join(' ')}`);
  execFileSync(command, args, { cwd: root, stdio: 'inherit', env: process.env });
}

function main() {
  fs.mkdirSync(databases, { recursive: true });
  run('npm', ['run', 'prisma:generate']);
  run('npm', ['run', 'db:global:migrate:deploy']);
  run('npm', ['run', 'db:seed:plans']);
  run('npm', ['run', 'db:seed:platform-admin']);
  run('npm', ['run', 'db:bible:migrate:deploy']);
  run('npm', ['run', 'db:import:bible']);
  if (fs.existsSync(tenantFile)) console.log('[setup] Tenant igreja-teste já existe; provisionamento ignorado.');
  else run('npx', ['tsx', 'prisma/provision.ts']);
  console.log('[setup] Ambiente inicial pronto.');
}

try { main(); } catch (error) {
  console.error('[setup] Falha:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
}

