'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getAdminTenant, getAdminTenantBranding, updateAdminTenantBranding } from '@/services/admin/tenants-api';

type Tenant = { id: string; name: string; slug: string; databaseKey?: string | null; plan: string; status?: string; active: boolean; createdAt: string };
type Branding = { pwaName: string; pwaShortName: string; primaryColor: string; secondaryColor: string; themeColor: string; backgroundColor: string; logoUrl?: string | null; icon192Url?: string | null; icon512Url?: string | null };
const brandingSchema = z.object({
  pwaName: z.string().trim().max(80, 'Máximo de 80 caracteres'),
  pwaShortName: z.string().trim().max(30, 'Máximo de 30 caracteres'),
  primaryColor: z.string().regex(/^$|^(#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})|transparent)$/, 'Cor inválida'),
  secondaryColor: z.string().regex(/^$|^(#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})|transparent)$/, 'Cor inválida'),
  themeColor: z.string().regex(/^$|^(#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})|transparent)$/, 'Cor inválida'),
  backgroundColor: z.string().regex(/^$|^(#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})|transparent)$/, 'Cor inválida'),
});
type BrandingForm = z.infer<typeof brandingSchema>;

export default function TenantDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [branding, setBranding] = useState<Branding>({ pwaName: '', pwaShortName: '', primaryColor: '', secondaryColor: '', themeColor: '', backgroundColor: '' });
  const [saving, setSaving] = useState(false);
  const [logoFiles, setLogoFiles] = useState<{ logoBase64?: File; icon192Base64?: File; icon512Base64?: File }>({});
  const [savingLogos, setSavingLogos] = useState(false);
  const form = useForm<BrandingForm>({ resolver: zodResolver(brandingSchema), defaultValues: branding });
  useEffect(() => { void getAdminTenant<Tenant>(id).then(setTenant).catch(() => setTenant(null)); }, [id]);
  useEffect(() => { void getAdminTenantBranding<Branding>(id).then((value) => { setBranding((current) => ({ ...current, ...value })); form.reset({ pwaName: value.pwaName ?? '', pwaShortName: value.pwaShortName ?? '', primaryColor: value.primaryColor ?? '', secondaryColor: value.secondaryColor ?? '', themeColor: value.themeColor ?? '', backgroundColor: value.backgroundColor ?? '' }); }).catch(() => undefined); }, [id, form]);

  const readImage = (file: File) => new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(file); });
  async function saveBranding(values: BrandingForm) {
    setSaving(true);
    try {
      const saved = await updateAdminTenantBranding<Branding>(id, values);
      setBranding((current) => ({ ...current, ...saved }));
      form.reset(values);
    } finally { setSaving(false); }
  }
  async function saveLogos(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const entries = Object.entries(logoFiles) as Array<[keyof typeof logoFiles, File | undefined]>;
    if (!entries.some(([, file]) => file)) return;
    setSavingLogos(true);
    try {
      const body: Record<string, string> = {};
      for (const [field, file] of entries) {
        if (file) body[field] = await readImage(file);
      }
      const saved = await updateAdminTenantBranding<Branding>(id, body);
      setBranding((current) => ({ ...current, ...saved }));
      setLogoFiles({});
      event.currentTarget.reset();
    } finally {
      setSavingLogos(false);
    }
  }

  if (!tenant) return <div className="p-6 text-center">Carregando tenant...</div>;
  return <main className="mx-auto max-w-4xl space-y-4 p-4">
    <Button asChild variant="ghost"><Link href="/admin/tenants"><ArrowLeft className="mr-2 h-4 w-4" />Voltar para tenants</Link></Button>
    <Card><CardHeader><CardTitle>{tenant.name}</CardTitle><CardDescription>{tenant.slug} · {tenant.databaseKey ?? 'database não definido'}</CardDescription></CardHeader><CardContent>
      <Tabs defaultValue="branding">
        <TabsList className="grid h-auto w-full grid-cols-4"><TabsTrigger value="branding">Brand</TabsTrigger><TabsTrigger value="logos">Logos</TabsTrigger><TabsTrigger value="users">Usuários</TabsTrigger><TabsTrigger value="plan">Plano</TabsTrigger></TabsList>
        <TabsContent value="branding" className="space-y-4 pt-4"><form onSubmit={form.handleSubmit(saveBranding)}><div className="grid gap-4 sm:grid-cols-2">{([['pwaName', 'Nome do PWA'], ['pwaShortName', 'Nome curto'], ['primaryColor', 'Cor primária'], ['secondaryColor', 'Cor secundária'], ['themeColor', 'Cor do tema'], ['backgroundColor', 'Cor de fundo']] as const).map(([name, label]) => <div key={name}><Label htmlFor={name}>{label}</Label><Input id={name} {...form.register(name)} placeholder={name.includes('Color') ? '#123456' : undefined} />{form.formState.errors[name] && <p className="mt-1 text-xs text-destructive">{form.formState.errors[name]?.message}</p>}</div>)}</div><Button type="submit" className="mt-4" disabled={saving}>{saving ? 'Salvando...' : 'Salvar branding'}</Button></form></TabsContent>
        <TabsContent value="logos" className="space-y-4 pt-4"><p className="text-sm text-muted-foreground">Selecione os arquivos e clique em <strong>Salvar logos</strong>. O envio é feito como Base64 e o banco armazena apenas a URL.</p><form onSubmit={saveLogos}><div className="grid gap-4 sm:grid-cols-3">{([['logoBase64', 'Logo'], ['icon192Base64', 'Ícone 192x192'], ['icon512Base64', 'Ícone 512x512']] as const).map(([field, label]) => <div key={field}><Label htmlFor={field}>{label}</Label><Input id={field} type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => setLogoFiles((current) => ({ ...current, [field]: event.target.files?.[0] }))} /></div>)}</div><Button type="submit" className="mt-4" disabled={savingLogos}>{savingLogos ? 'Salvando logos...' : 'Salvar logos'}</Button></form></TabsContent>
        <TabsContent value="users"><p className="text-sm text-muted-foreground">Usuários e administradores vinculados ao tenant.</p></TabsContent>
        <TabsContent value="plan"><p className="text-sm text-muted-foreground">Plano atual: <strong>{tenant.plan}</strong>.</p></TabsContent>
      </Tabs>
    </CardContent></Card>
  </main>;
}
