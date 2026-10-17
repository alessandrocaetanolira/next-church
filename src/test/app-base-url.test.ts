import { afterEach, describe, expect, it, vi } from 'vitest';
import { getPublicShareBaseUrl } from '@/lib/app-base-url';

afterEach(() => vi.unstubAllEnvs());

describe('origem dos links e QR Codes da igreja', () => {
  it('prioriza a URL de compartilhamento do ambiente e remove barras finais', () => {
    vi.stubEnv('NEXT_PUBLIC_SHARE_BASE_URL', ' https://igreja.example/// ');
    vi.stubEnv('NEXT_PUBLIC_APP_BASE_URL', 'https://app.example');
    expect(getPublicShareBaseUrl()).toBe('https://igreja.example');
  });

  it('usa a URL do app quando a URL de compartilhamento está vazia', () => {
    vi.stubEnv('NEXT_PUBLIC_SHARE_BASE_URL', ' ');
    vi.stubEnv('NEXT_PUBLIC_APP_BASE_URL', 'https://app.example/');
    expect(getPublicShareBaseUrl()).toBe('https://app.example');
  });

  it('não retorna um domínio fixo quando o ambiente não está configurado', () => {
    vi.stubEnv('NEXT_PUBLIC_SHARE_BASE_URL', '');
    vi.stubEnv('NEXT_PUBLIC_APP_BASE_URL', '');
    expect(getPublicShareBaseUrl()).toBe('');
  });
});
