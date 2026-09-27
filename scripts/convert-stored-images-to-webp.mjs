import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';

const root = process.cwd();
const filesRoot = path.join(root, 'files');
const databasesRoot = path.join(root, 'prisma', 'databases');
const sourceExtensions = new Set(['.png', '.jpg', '.jpeg']);
const globalUpdates = [
  ['Church', 'logoUrl'],
  ['ChurchBranding', 'logoUrl'],
  ['ChurchBranding', 'logoLightUrl'],
  ['ChurchBranding', 'logoDarkUrl'],
  ['ChurchBranding', 'mobileIconUrl'],
  ['ChurchBranding', 'sidebarLogoUrl'],
  ['ChurchBranding', 'sidebarOpenLightUrl'],
  ['ChurchBranding', 'sidebarOpenDarkUrl'],
  ['ChurchBranding', 'sidebarCollapsedLightUrl'],
  ['ChurchBranding', 'sidebarCollapsedDarkUrl'],
];
const tenantUpdates = [
  ['Product', 'imageUrl'],
  ['FeedPost', 'mediaUrl'],
];

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const result = [];
  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await listFiles(entryPath));
    else result.push(entryPath);
  }
  return result;
}

function sqlString(value) {
  return `'${value.replaceAll("'", "''")}'`;
}

function updateDatabase(databasePath, updates, mapping) {
  const statements = [];
  for (const [table, column] of updates) {
    for (const [oldUrl, newUrl] of mapping) {
      statements.push(`UPDATE "${table}" SET "${column}" = ${sqlString(newUrl)} WHERE "${column}" = ${sqlString(oldUrl)};`);
    }
  }
  if (statements.length > 0) {
    execFileSync('sqlite3', [databasePath, `BEGIN;${statements.join('')}COMMIT;`], { stdio: 'pipe' });
  }
}

const allFiles = await listFiles(filesRoot);
const mapping = [];
for (const sourcePath of allFiles) {
  const extension = path.extname(sourcePath).toLowerCase();
  if (!sourceExtensions.has(extension)) continue;

  const targetPath = sourcePath.slice(0, -extension.length) + '.webp';
  const relativeSource = path.relative(filesRoot, sourcePath).split(path.sep).join('/');
  const relativeTarget = path.relative(filesRoot, targetPath).split(path.sep).join('/');
  const sourceUrl = `/api/files/${relativeSource}`;
  const targetUrl = `/api/files/${relativeTarget}`;
  const targetExists = await stat(targetPath).then(() => true).catch(() => false);

  if (!targetExists) {
    await sharp(sourcePath, { limitInputPixels: 40_000_000 })
      .rotate()
      .webp({ quality: 82, alphaQuality: 90 })
      .toFile(targetPath);
  }
  mapping.push([sourceUrl, targetUrl]);
}

const databaseFiles = (await readdir(databasesRoot))
  .filter((name) => name.endsWith('.db') && name !== 'bible.db')
  .map((name) => path.join(databasesRoot, name));

for (const databasePath of databaseFiles) {
  const updates = path.basename(databasePath) === 'global.db' ? globalUpdates : tenantUpdates;
  updateDatabase(databasePath, updates, mapping);
}

console.log(`Convertidas/verificadas ${mapping.length} imagens para WebP.`);
console.log(`Atualizados ${databaseFiles.length} bancos, preservando bible.db.`);
