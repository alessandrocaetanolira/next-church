import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BrandingService } from '@/server/branding/branding.service';
import { BrandingRepository } from '@/server/branding/branding.repository';
import { deleteTenantBrandingFile, saveTenantDataUrl, saveTenantImageDataUrl } from '@/lib/server/tenant-file-storage';

vi.mock('@/lib/server/tenant-file-storage', () => ({
  saveTenantDataUrl: vi.fn(), saveTenantImageDataUrl: vi.fn(), deleteTenantBrandingFile: vi.fn(),
}));

const oldUrl = '/api/files/church-a/branding/old.webp';
const newUrl = '/api/files/church-a/branding/new.webp';
const current = { id: 'church-id', slug: 'church-a', databaseKey: 'stable-key', name: 'Igreja A', sidebarOpenLightUrl: oldUrl };

function fixture(updated: Record<string, unknown> = { ...current, sidebarOpenLightUrl: newUrl }) {
  const repository = {
    update: vi.fn().mockResolvedValue(undefined),
    findByTenant: vi.fn().mockResolvedValue(updated),
    isImageReferenced: vi.fn().mockResolvedValue(false),
  };
  return { repository, service: new BrandingService(repository as unknown as BrandingRepository) };
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(saveTenantDataUrl).mockResolvedValue(newUrl);
  vi.mocked(saveTenantImageDataUrl).mockResolvedValue(newUrl);
});

describe('exclusão de imagens substituídas', () => {
  it('usa um único arquivo para o ícone principal e a referência de 192 px', async () => {
    const before = { ...current, mobileIconUrl: '/api/files/church-a/branding/mobile.png', icon192Url: '/api/files/church-a/branding/legacy.png' };
    const { service, repository } = fixture({ ...before, mobileIconUrl: newUrl, icon192Url: newUrl });
    await service.update(before, 'church-a', { mobileIconBase64: 'data:image/png;base64,YQ==' });
    expect(saveTenantImageDataUrl).toHaveBeenCalledExactlyOnceWith('church-a', 'branding', 'data:image/png;base64,YQ==', { width: 192, height: 192, format: 'png' });
    expect(repository.update).toHaveBeenCalledWith('church-id', expect.objectContaining({ mobileIconUrl: newUrl, icon192Url: newUrl }));
    expect(deleteTenantBrandingFile).toHaveBeenCalledWith(before.mobileIconUrl, ['church-a', 'stable-key']);
    expect(deleteTenantBrandingFile).toHaveBeenCalledWith(before.icon192Url, ['church-a', 'stable-key']);
  });

  it('limpa as duas referências ao remover o ícone principal', async () => {
    const before = { ...current, mobileIconUrl: newUrl, icon192Url: newUrl };
    const { service, repository } = fixture({ ...before, mobileIconUrl: null, icon192Url: null });
    await service.update(before, 'church-a', { mobileIconBase64: null });
    expect(repository.update).toHaveBeenCalledWith('church-id', expect.objectContaining({ mobileIconUrl: null, icon192Url: null }));
    expect(saveTenantImageDataUrl).not.toHaveBeenCalled();
    expect(deleteTenantBrandingFile).toHaveBeenCalledWith(newUrl, ['church-a', 'stable-key']);
  });

  it('exclui o upload anterior somente após persistir e consultar as referências', async () => {
    const { service, repository } = fixture();
    await service.update(current, 'church-a', { sidebarOpenLightBase64: 'data:image/png;base64,YQ==' });
    expect(repository.update).toHaveBeenCalledWith('church-id', expect.objectContaining({ sidebarOpenLightUrl: newUrl }));
    expect(repository.isImageReferenced).toHaveBeenCalledWith(oldUrl);
    expect(deleteTenantBrandingFile).toHaveBeenCalledWith(oldUrl, ['church-a', 'stable-key']);
    expect(repository.update.mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(deleteTenantBrandingFile).mock.invocationCallOrder[0]);
  });

  it('preserva uma imagem usada por outro campo da mesma igreja', async () => {
    const { service, repository } = fixture({ ...current, sidebarOpenLightUrl: newUrl, sidebarOpenDarkUrl: oldUrl });
    await service.update(current, 'church-a', { sidebarOpenLightBase64: 'data:image/png;base64,YQ==' });
    expect(repository.isImageReferenced).not.toHaveBeenCalled();
    expect(deleteTenantBrandingFile).not.toHaveBeenCalled();
  });

  it('preserva imagens que ainda têm referência em outro registro', async () => {
    const { service, repository } = fixture();
    repository.isImageReferenced.mockResolvedValue(true);
    await service.update(current, 'church-a', { sidebarOpenLightBase64: 'data:image/png;base64,YQ==' });
    expect(deleteTenantBrandingFile).not.toHaveBeenCalled();
  });

  it('preserva o arquivo antigo quando a gravação falha', async () => {
    const { service, repository } = fixture();
    repository.update.mockRejectedValue(new Error('Falha no banco'));
    await expect(service.update(current, 'church-a', { sidebarOpenLightBase64: 'data:image/png;base64,YQ==' })).rejects.toThrow('Falha no banco');
    expect(deleteTenantBrandingFile).not.toHaveBeenCalled();
  });
});
