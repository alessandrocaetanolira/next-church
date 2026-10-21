'use client';

import { useId, useState } from 'react';
import { AppImage } from '@/components/shared/AppImage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const imageFields = [
  ['logoLightUrl', 'Topbar e login · tema claro', 'Logo do cabeçalho e da tela de login sobre fundo claro. Ajusta-se ao espaço disponível.'],
  ['logoDarkUrl', 'Topbar e login · tema escuro', 'Logo do cabeçalho e da tela de login sobre fundo escuro. Ajusta-se ao espaço disponível.'],
  ['mobileIconUrl', 'Ícone do aplicativo e navegador · 192 × 192', 'Usado no aplicativo instalado (PWA), nos atalhos e na aba do navegador (favicon). A imagem enviada é ajustada automaticamente para 192 × 192.'],
  ['sidebarOpenLightUrl', 'Sidebar aberta · tema claro', 'Logo da barra lateral expandida no tema claro.'],
  ['sidebarOpenDarkUrl', 'Sidebar aberta · tema escuro', 'Logo da barra lateral expandida no tema escuro.'],
  ['sidebarCollapsedLightUrl', 'Sidebar recolhida · tema claro', 'Ícone da barra lateral recolhida no tema claro.'],
  ['sidebarCollapsedDarkUrl', 'Sidebar recolhida · tema escuro', 'Ícone da barra lateral recolhida no tema escuro.'],
] as const;
const pwaFields = [
  ['icon512Url', 'Ícone de alta resolução · 512 × 512', 'Ícone de alta resolução do aplicativo instalado.'],
] as const;

export type BrandingImageField = (typeof imageFields)[number][0] | (typeof pwaFields)[number][0];
export type BrandingImages = Partial<Record<BrandingImageField, string | null>>;

export function BrandingImagesEditor({ images, onChange, disabled = false, includePwa = false }: {
  images: BrandingImages;
  onChange: (field: BrandingImageField, value: string) => void;
  disabled?: boolean;
  includePwa?: boolean;
}) {
  const id = useId();
  const [error, setError] = useState<string | null>(null);
  const fields = includePwa ? [...imageFields, ...pwaFields] : imageFields;
  return <div className="space-y-3">
    <p className="text-sm text-muted-foreground">Escolha as imagens para cada local do aplicativo. Os logos se ajustam ao espaço disponível, preservando a proporção. Confira as miniaturas e salve para aplicar as alterações.</p>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <div className="grid gap-4 sm:grid-cols-2">
      {fields.map(([field, label, hint]) => {
        const source = images[field];
        const square = field === 'mobileIconUrl' || field.startsWith('icon') || field.startsWith('sidebarCollapsed');
        return <div key={field} className="space-y-2 rounded-lg border border-border p-3">
          <Label htmlFor={`${id}-${field}`}>{label}</Label>
          <p className="text-xs text-muted-foreground">{hint}</p>
          <Input id={`${id}-${field}`} type="file" disabled={disabled} accept="image/png,image/jpeg,image/webp" onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (!file) return;
            setError(null);
            if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
              setError('Selecione uma imagem PNG, JPEG ou WebP de até 5 MB.');
              return;
            }
            const reader = new FileReader();
            reader.onload = () => { if (typeof reader.result === 'string') onChange(field, reader.result); };
            reader.onerror = () => setError('Não foi possível ler a imagem selecionada.');
            reader.readAsDataURL(file);
          }} />
          <div className={`flex min-h-24 items-center justify-center rounded-md border p-2 ${field.includes('Dark') ? 'bg-slate-900' : 'bg-white'}`}>
            {source ? <AppImage src={source} alt={label} width={320} height={160} className={square ? 'h-20 w-20 object-contain' : 'h-20 w-full object-contain'} /> : <span className="text-xs text-slate-500">Sem imagem</span>}
          </div>
          {source && <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => onChange(field, '')}>Remover</Button>}
        </div>;
      })}
    </div>
  </div>;
}
