import { getGlobalClient } from '../../src/lib/prisma-factory';

const INITIAL_TENANT = 'igreja-teste';
const BRANDING = {
  pwaName: 'A Mesa Church',
  pwaShortName: 'A Mesa',
  logoUrl: '/branding/a-mesa-church/header.png',
  icon192Url: '/branding/a-mesa-church/icon-192.png',
  icon512Url: '/branding/a-mesa-church/icon-512.png',
  primaryColor: '#f5b800',
  secondaryColor: '#111111',
  themeColor: '#111111',
  backgroundColor: '#111111',
};

async function main() {
  const global = getGlobalClient();
  try {
    const church = await global.church.findUnique({ where: { slug: INITIAL_TENANT } });
    if (!church) throw new Error(`Tenant inicial ausente: ${INITIAL_TENANT}`);

    await global.churchBranding.upsert({
      where: { churchId: church.id },
      update: BRANDING,
      create: { churchId: church.id, ...BRANDING },
    });
    console.log(`[branding] Identidade inicial aplicada em ${INITIAL_TENANT}.`);
  } finally {
    await global.$disconnect();
  }
}

main().catch((error) => {
  console.error('[branding] Falha:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
