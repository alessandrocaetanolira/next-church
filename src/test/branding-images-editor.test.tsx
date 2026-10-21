import { useState } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { BrandingImagesEditor, type BrandingImages } from '@/features/settings/components/BrandingImagesEditor';

afterEach(cleanup);

function Editor() {
  const [images, setImages] = useState<BrandingImages>({ logoLightUrl: '/branding/current.png', logoDarkUrl: '/branding/dark.png' });
  return <BrandingImagesEditor images={images} includePwa onChange={(field, value) => setImages((current) => ({ ...current, [field]: value }))} />;
}

describe('editor compartilhado de imagens', () => {
  it('mostra a imagem salva e a prévia da substituição sem alterar os outros contextos', async () => {
    render(<Editor />);
    const label = 'Topbar e login · tema claro';
    expect(screen.getByRole('img', { name: label }).getAttribute('src')).toBe('/branding/current.png');
    fireEvent.change(screen.getByLabelText(label), { target: { files: [new File(['image'], 'logo.png', { type: 'image/png' })] } });
    await waitFor(() => expect(screen.getByRole('img', { name: label }).getAttribute('src')).toMatch(/^data:image\/png;base64,/));
    expect(screen.getByRole('img', { name: 'Topbar e login · tema escuro' }).getAttribute('src')).toBe('/branding/dark.png');
  });

  it('remove a miniatura mantendo o campo de seleção disponível', () => {
    render(<Editor />);
    fireEvent.click(screen.getAllByRole('button', { name: 'Remover' })[0]);
    expect(screen.queryByRole('img', { name: 'Topbar e login · tema claro' })).toBeNull();
    expect(screen.getByLabelText('Topbar e login · tema claro')).toBeDefined();
  });

  it('rejeita um arquivo incompatível preservando a imagem atual', () => {
    render(<Editor />);
    fireEvent.change(screen.getByLabelText('Topbar e login · tema claro'), { target: { files: [new File(['text'], 'logo.txt', { type: 'text/plain' })] } });
    expect(screen.getByRole('alert').textContent).toContain('PNG, JPEG ou WebP');
    expect(screen.getByRole('img', { name: 'Topbar e login · tema claro' }).getAttribute('src')).toBe('/branding/current.png');
  });
});
