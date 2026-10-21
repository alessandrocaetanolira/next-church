'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getAdminTenant, getAdminTenantBranding, updateAdminTenant, updateAdminTenantBranding, type AdminTenant } from '@/services/admin/tenants-api';
import { listAdminPlans, type AdminPlan } from '@/services/admin/plans-api';
import { toast } from 'sonner';
import { BrandingImagesEditor, type BrandingImages } from '@/features/settings/components/BrandingImagesEditor';
import { WebPageContainer } from '@/components/shared/web';

type Tenant = AdminTenant;
type Branding = BrandingImages & { pwaName: string; pwaShortName: string; primaryColor: string; secondaryColor: string; themeColor: string; backgroundColor: string; logoUrl?: string | null; icon192Url?: string | null; icon512Url?: string | null };
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
  const [imageChanges, setImageChanges] = useState<BrandingImages>({});
  const [savingLogos, setSavingLogos] = useState(false);
  const [savingTenant, setSavingTenant] = useState(false);
  const [plans, setPlans] = useState<AdminPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState('');
  const [savingPlan, setSavingPlan] = useState(false);
  const [tenantForm, setTenantForm] = useState({ name: '', slug: '' });
  const [loading, setLoading] = useState(true);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const form = useForm<BrandingForm>({ resolver: zodResolver(brandingSchema), defaultValues: branding });
  const loadTenant = useCallback(async () => {
    setLoading(true);
    setLoadingError(null);
    try {
      const value = await getAdminTenant<Tenant>(id);
      setTenant(value);
      setTenantForm({ name: value.name, slug: value.slug });
      setSelectedPlan(value.plan);
    } catch (error) {
      setTenant(null);
      setLoadingError(error instanceof Error ? error.message : 'Não foi possível carregar o tenant.');
    } finally {
      setLoading(false);
    }
  }, [id]);
  useEffect(() => {
    void loadTenant();
    void listAdminPlans().then(setPlans).catch(() => setPlans([]));
  }, [id, loadTenant]);
  useEffect(() => { void getAdminTenantBranding<Branding>(id).then((value) => { setBranding((current) => ({ ...current, ...value })); form.reset({ pwaName: value.pwaName ?? '', pwaShortName: value.pwaShortName ?? '', primaryColor: value.primaryColor ?? '', secondaryColor: value.secondaryColor ?? '', themeColor: value.themeColor ?? '', backgroundColor: value.backgroundColor ?? '' }); }).catch(() => undefined); }, [id, form]);

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
    if (!Object.keys(imageChanges).length) return;
    setSavingLogos(true);
    try {
      const body = Object.fromEntries(Object.entries(imageChanges).map(([field, value]) => [field.replace(/Url$/, 'Base64'), value || null]));
      const saved = await updateAdminTenantBranding<Branding>(id, body);
      setBranding((current) => ({ ...current, ...saved }));
      setImageChanges({});
      toast.success('Logos atualizados.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível salvar os logos.');
    } finally {
      setSavingLogos(false);
    }
  }

  async function saveTenantDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingTenant(true);
    try {
      const saved = await updateAdminTenant(id, tenantForm);
      setTenant((current) => current ? { ...current, ...saved } : saved);
      setTenantForm({ name: saved.name, slug: saved.slug });
      toast.success('Dados do tenant atualizados.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível atualizar o tenant.');
    } finally {
      setSavingTenant(false);
    }
  }

  async function savePlan() {
    if (!tenant || !selectedPlan || selectedPlan === tenant.plan) return;
    setSavingPlan(true);
    try {
      const saved = await updateAdminTenant(id, { plan: selectedPlan });
      setTenant((current) => current ? { ...current, ...saved } : saved);
      setSelectedPlan(saved.plan);
      toast.success(`Plano alterado para ${saved.plan}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível alterar o plano.');
    } finally {
      setSavingPlan(false);
    }
  }

  async function toggleTenantStatus() {
    if (!tenant) return;
    setSavingTenant(true);
    try {
      const saved = await updateAdminTenant(id, { active: !tenant.active });
      setTenant((current) => current ? { ...current, ...saved } : saved);
      toast.success(saved.active ? 'Tenant ativado.' : 'Tenant desativado.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível alterar o status.');
    } finally {
      setSavingTenant(false);
    }
  }

  if (loading) return <WebPageContainer size="narrow" className="text-center">Carregando tenant...</WebPageContainer>;
  if (!tenant) return <WebPageContainer size="narrow" className="space-y-3 text-center"><p>{loadingError ?? 'Tenant não encontrado.'}</p><Button type="button" variant="outline" onClick={() => void loadTenant()}><RefreshCw className="mr-2 h-4 w-4" />Tentar novamente</Button></WebPageContainer>;
  const currentPlan = plans.find((plan) => plan.code === tenant.plan);
  const usage = tenant.userUsage;
  const maxUsers = currentPlan?.maxUsers;
  const remainingUsers = usage && typeof maxUsers === 'number' ? Math.max(0, maxUsers - usage.total) : null;
  return <WebPageContainer size="narrow" className="space-y-4">
    <Button asChild variant="ghost" className="hidden min-[1025px]:inline-flex"><Link href="/admin/tenants"><ArrowLeft className="mr-2 h-4 w-4" />Voltar para tenants</Link></Button>
    <Card className="border-0 bg-transparent shadow-none min-[1025px]:border min-[1025px]:bg-card min-[1025px]:shadow-sm"><CardHeader className="px-0 pt-0 min-[1025px]:p-6"><div className="flex items-start justify-between gap-3"><div className="min-w-0 flex-1"><CardTitle className="break-words">{tenant.name}</CardTitle><CardDescription className="break-words">{tenant.slug} · {tenant.databaseKey ?? 'database não definido'}</CardDescription></div><Button type="button" variant="outline" size="sm" className="shrink-0" onClick={() => void loadTenant()}><RefreshCw className="mr-2 h-4 w-4" />Atualizar</Button></div></CardHeader><CardContent className="px-0 pb-0 min-[1025px]:px-6 min-[1025px]:pb-6">
      <Tabs defaultValue="tenant">
        <TabsList className="flex h-auto w-full justify-start gap-1 overflow-x-auto"><TabsTrigger className="shrink-0" value="tenant">Tenant</TabsTrigger><TabsTrigger className="shrink-0" value="branding">Brand</TabsTrigger><TabsTrigger className="shrink-0" value="logos">Logos</TabsTrigger><TabsTrigger className="shrink-0" value="users">Usuários</TabsTrigger><TabsTrigger className="shrink-0" value="plan">Plano</TabsTrigger></TabsList>
        <TabsContent value="tenant" className="space-y-4 pt-4">
          <form onSubmit={saveTenantDetails} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div><Label htmlFor="tenant-name">Nome da igreja</Label><Input id="tenant-name" value={tenantForm.name} onChange={(event) => setTenantForm((current) => ({ ...current, name: event.target.value }))} required /></div>
              <div><Label htmlFor="tenant-slug">Slug da rota de login</Label><Input id="tenant-slug" value={tenantForm.slug} onChange={(event) => setTenantForm((current) => ({ ...current, slug: event.target.value.toLowerCase() }))} pattern="[a-z0-9-]+" required /><p className="mt-1 text-xs text-muted-foreground">O database key permanece estável para preservar o banco do tenant.</p></div>
            </div>
            <div className="flex flex-wrap gap-2"><Button type="submit" disabled={savingTenant}>{savingTenant ? 'Salvando...' : 'Salvar dados do tenant'}</Button><Button type="button" variant="outline" onClick={() => void toggleTenantStatus()} disabled={savingTenant}>{tenant.active ? 'Desativar tenant' : 'Ativar tenant'}</Button></div>
          </form>
        </TabsContent>
        <TabsContent value="branding" className="space-y-4 pt-4"><form onSubmit={form.handleSubmit(saveBranding)}><div className="grid gap-4 sm:grid-cols-2">{([['pwaName', 'Nome do PWA'], ['pwaShortName', 'Nome curto'], ['primaryColor', 'Cor primária'], ['secondaryColor', 'Cor secundária'], ['themeColor', 'Cor do tema'], ['backgroundColor', 'Cor de fundo']] as const).map(([name, label]) => <div key={name}><Label htmlFor={name}>{label}</Label><Input id={name} {...form.register(name)} placeholder={name.includes('Color') ? '#123456' : undefined} />{form.formState.errors[name] && <p className="mt-1 text-xs text-destructive">{form.formState.errors[name]?.message}</p>}</div>)}</div><Button type="submit" className="mt-4" disabled={saving}>{saving ? 'Salvando...' : 'Salvar branding'}</Button></form></TabsContent>
        <TabsContent value="logos" className="space-y-4 pt-4">
          <form onSubmit={saveLogos} className="space-y-4">
            <BrandingImagesEditor images={{ ...branding, ...imageChanges }} includePwa disabled={savingLogos} onChange={(field, value) => setImageChanges((current) => ({ ...current, [field]: value }))} />
            <Button type="submit" disabled={savingLogos || !Object.keys(imageChanges).length}>{savingLogos ? 'Salvando imagens...' : 'Salvar imagens'}</Button>
          </form>
        </TabsContent>
        <TabsContent value="users" className="space-y-4 pt-4">
          <div className="rounded-lg border border-border p-4 space-y-3">
            <p className="font-medium">Uso de usuários</p>
            {usage ? <>
              <p className="text-2xl font-semibold">{usage.total}{typeof maxUsers === 'number' ? ` de ${maxUsers}` : ''} <span className="text-sm font-normal text-muted-foreground">usuários cadastrados</span></p>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div><dt className="text-muted-foreground">Ativos</dt><dd className="font-medium">{usage.active}</dd></div>
                <div><dt className="text-muted-foreground">Inativos</dt><dd className="font-medium">{usage.inactive}</dd></div>
                <div><dt className="text-muted-foreground">Limite do plano {tenant.plan}</dt><dd className="font-medium">{maxUsers === null ? 'Sem limite' : maxUsers ?? 'Indisponível'}</dd></div>
                {remainingUsers !== null && <div><dt className="text-muted-foreground">Vagas disponíveis</dt><dd className="font-medium">{remainingUsers}</dd></div>}
              </dl>
              {typeof maxUsers === 'number' && usage.total >= maxUsers && <p className="text-sm text-destructive">{usage.total > maxUsers ? 'Quantidade de usuários acima do limite do plano.' : 'Limite de usuários do plano atingido.'}</p>}
              <p className="text-xs text-muted-foreground">A contagem inclui usuários ativos e inativos. Usuários excluídos não são contabilizados.</p>
            </> : <p role="status" className="text-sm text-muted-foreground">Contagem indisponível. Não foi possível consultar os usuários desta igreja. Tente atualizar as informações.</p>}
            <p className="text-sm text-muted-foreground">A gestão dos usuários ocorre dentro do ambiente da igreja.</p>
          </div>
          <Button type="button" variant="outline" onClick={() => void loadTenant()}><RefreshCw className="mr-2 h-4 w-4" />Atualizar informações</Button>
        </TabsContent>
        <TabsContent value="plan" className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="tenant-plan">Plano da igreja</Label>
            <Select value={selectedPlan} onValueChange={setSelectedPlan}>
              <SelectTrigger id="tenant-plan"><SelectValue placeholder="Selecione um plano" /></SelectTrigger>
              <SelectContent>
                {plans.map((plan) => <SelectItem key={plan.id} value={plan.code} disabled={!plan.active && plan.code !== tenant.plan}>{plan.name} ({plan.code}){!plan.active ? ' · inativo' : ''}</SelectItem>)}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Plano atual: <strong>{tenant.plan}</strong>. Recursos e limites são aplicados no próximo carregamento da sessão.</p>
          </div>
          <Button type="button" onClick={() => void savePlan()} disabled={savingPlan || !selectedPlan || selectedPlan === tenant.plan}>{savingPlan ? 'Salvando...' : 'Salvar plano'}</Button>
        </TabsContent>
      </Tabs>
    </CardContent></Card>
  </WebPageContainer>;
}
