import crypto from 'crypto';
import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';

function getOption(name: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function sha256(filePath: string) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function hasSQLiteHeader(filePath: string) {
  const handle = fs.openSync(filePath, 'r');
  const header = Buffer.alloc(16);
  try {
    return fs.readSync(handle, header, 0, 16, 0) === 16 && header.toString() === 'SQLite format 3\u0000';
  } finally {
    fs.closeSync(handle);
  }
}

function escapeSqlitePath(filePath: string) {
  return filePath.replace(/'/g, "''");
}

function main() {
  const sourceDirectory = path.resolve(
    getOption('--source') ??
      process.env.CHURCH_DATABASE_DIR ??
      path.join(process.cwd(), 'prisma/databases')
  );
  const destinationOption = getOption('--destination');

  if (!destinationOption) {
    throw new Error('Informe --destination para evitar sobrescrever um backup existente.');
  }

  const destinationDirectory = path.resolve(destinationOption);
  if (!fs.existsSync(sourceDirectory)) {
    throw new Error(`Diretorio de origem nao encontrado: ${sourceDirectory}`);
  }
  if (fs.existsSync(destinationDirectory)) {
    throw new Error(`Destino ja existe; escolha um diretorio novo: ${destinationDirectory}`);
  }

  fs.mkdirSync(destinationDirectory, { recursive: true });
  const databases = fs.readdirSync(sourceDirectory).filter((file) => file.endsWith('.db')).sort();
  const entries: Array<Record<string, unknown>> = [];

  for (const file of databases) {
    const sourcePath = path.join(sourceDirectory, file);
    const destinationPath = path.join(destinationDirectory, file);
    const validSQLite = hasSQLiteHeader(sourcePath);

    if (validSQLite) {
      execFileSync('sqlite3', [sourcePath, `.backup '${escapeSqlitePath(destinationPath)}'`], {
        stdio: 'pipe',
      });
    } else {
      // Preserve invalid legacy artifacts for diagnosis; do not silently fix them.
      fs.copyFileSync(sourcePath, destinationPath);
    }

    entries.push({
      file,
      sourceBytes: fs.statSync(sourcePath).size,
      backupBytes: fs.statSync(destinationPath).size,
      sourceSha256: sha256(sourcePath),
      backupSha256: sha256(destinationPath),
      validSQLite,
    });
  }

  const manifest = {
    createdAt: new Date().toISOString(),
    sourceDirectory,
    destinationDirectory,
    databases: entries,
  };
  fs.writeFileSync(
    path.join(destinationDirectory, 'manifest.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
    'utf8'
  );
  console.log(`Backup concluido: ${destinationDirectory}`);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
