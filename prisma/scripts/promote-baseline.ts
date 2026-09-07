import crypto from 'crypto';
import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

function getOption(name: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function sha256(filePath: string) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function isSQLite(filePath: string) {
  const handle = fs.openSync(filePath, 'r');
  const header = Buffer.alloc(16);
  try {
    return fs.readSync(handle, header, 0, 16, 0) === 16 && header.toString() === 'SQLite format 3\u0000';
  } finally {
    fs.closeSync(handle);
  }
}

function assertIntegrity(filePath: string) {
  const result = execFileSync('sqlite3', [filePath, 'PRAGMA integrity_check;'], { encoding: 'utf8' }).trim();
  if (result !== 'ok') throw new Error(`Integridade invalida em ${filePath}: ${result}`);
}

function backupFile(sourcePath: string, destinationPath: string) {
  if (isSQLite(sourcePath)) {
    execFileSync('sqlite3', [sourcePath, `.backup '${destinationPath.replace(/'/g, "''")}'`], { stdio: 'pipe' });
  } else {
    fs.copyFileSync(sourcePath, destinationPath);
  }
}

function fileNames(tenants: string[]) {
  return ['global.db', ...tenants.map((tenant) => `church_${tenant}.db`)]
    .filter((file, index, list) => list.indexOf(file) === index);
}

function main() {
  const sourceDirectory = path.resolve(getOption('--source') ?? '');
  const targetDirectory = path.resolve(getOption('--target') ?? path.join(process.cwd(), 'prisma/databases'));
  const backupDirectory = path.resolve(getOption('--backup') ?? '');
  const tenants = (getOption('--tenants') ?? '').split(',').map((value) => value.trim()).filter(Boolean);

  if (!sourceDirectory || !backupDirectory || tenants.length === 0) {
    throw new Error('Informe --source, --backup e --tenants.');
  }
  if (!fs.existsSync(sourceDirectory) || !fs.existsSync(targetDirectory)) {
    throw new Error('Diretorio de origem ou destino nao encontrado.');
  }
  if (sourceDirectory === targetDirectory || targetDirectory === backupDirectory || fs.existsSync(backupDirectory)) {
    throw new Error('Diretorios de source, target e backup devem ser diferentes; backup deve ser novo.');
  }

  const files = fileNames(tenants);
  for (const file of files) {
    const sourcePath = path.join(sourceDirectory, file);
    const targetPath = path.join(targetDirectory, file);
    if (!fs.existsSync(sourcePath)) throw new Error(`Arquivo da baseline ausente: ${sourcePath}`);
    if (!fs.existsSync(targetPath)) throw new Error(`Arquivo atual ausente: ${targetPath}`);
    if (!isSQLite(sourcePath) || !isSQLite(targetPath)) throw new Error(`Arquivo nao e SQLite valido: ${file}`);
    assertIntegrity(sourcePath);
    assertIntegrity(targetPath);
  }

  fs.mkdirSync(backupDirectory, { recursive: true });
  const stagingDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'church-baseline-staging-'));
  const manifest: Array<Record<string, string | number>> = [];

  try {
    for (const file of files) {
      const sourcePath = path.join(sourceDirectory, file);
      const targetPath = path.join(targetDirectory, file);
      const backupPath = path.join(backupDirectory, file);
      const stagedPath = path.join(stagingDirectory, file);
      backupFile(targetPath, backupPath);
      fs.copyFileSync(sourcePath, stagedPath);
      manifest.push({
        file,
        sourceSha256: sha256(sourcePath),
        currentSha256: sha256(targetPath),
        backupSha256: sha256(backupPath),
        stagedSha256: sha256(stagedPath),
      });
    }

    for (const file of files) {
      fs.renameSync(path.join(stagingDirectory, file), path.join(targetDirectory, file));
    }

    for (const file of files) assertIntegrity(path.join(targetDirectory, file));
    fs.writeFileSync(path.join(backupDirectory, 'promotion-manifest.json'), `${JSON.stringify({
      promotedAt: new Date().toISOString(),
      sourceDirectory,
      targetDirectory,
      backupDirectory,
      files: manifest,
    }, null, 2)}\n`, 'utf8');
    console.log(`Promocao concluida: ${files.join(', ')}`);
  } catch (error) {
    for (const file of files) {
      const backupPath = path.join(backupDirectory, file);
      if (fs.existsSync(backupPath)) fs.copyFileSync(backupPath, path.join(targetDirectory, file));
    }
    throw error;
  } finally {
    fs.rmSync(stagingDirectory, { recursive: true, force: true });
  }
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
