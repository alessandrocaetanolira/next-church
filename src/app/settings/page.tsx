'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUIStore } from '@/features/ui/store';
import { useAppSettings } from '@/components/providers/AppSettingsProvider';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Palette, Gift, Lock, Trash2, LogOut, ImageIcon, Check, Download, Bell } from 'lucide-react';
import { toast } from 'sonner';
import { clearUnscopedOfflineData, db } from '@/lib/db';
import { cn } from '@/lib/utils';
import { useSession, signOut } from 'next-auth/react';
import { hasActionPermission } from '@/lib/access-control';
import { RegistrationShareCard } from '@/features/pastoral/components/RegistrationShareCard';
import type { ThemeMode, ThemeVariant } from '@/components/providers/AppSettingsProvider';
import { BibleDownloadControl } from '@/features/bible/components/BibleDownloadControl';
import { usePushSubscription } from '@/hooks/use-push-subscription';
import { useIsMobile } from '@/hooks/use-mobile';
import { AppImage, MobileThemePreview } from '@/components/shared';
import { WebPageLayout } from '@/components/shared/web';
import { getUserBranding, updateUserBranding } from '@/services/settings/settings-api';
import { AdministracaoTab } from './tabs/administracaoTab';
import { AparenciaTab } from './tabs/aparenciaTab';
import { BibliaOfflineTab } from './tabs/bibliaOfflineTab';
import { IgrejaTab } from './tabs/igrejaTab';
import { NotificacoesTab } from './tabs/notificacoesTab';
import { SettingsTabs, type SettingsTab } from './tabs/settingsTabs';

function CollapsibleSection({ icon: Icon, title, children }: any) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  if (!isMobile) {
    return (
      <section className="space-y-6">
        <div className="flex items-center gap-3 border-b border-border pb-3">
          <Icon className="h-5 w-5 shrink-0 text-primary" />
          <h3 className="flex-1 text-xl font-semibold tracking-tight">{title}</h3>
        </div>
        <div className="space-y-6">{children}</div>
      </section>
    );
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
      <CollapsibleTrigger className="w-full flex items-center gap-3 p-4 hover:bg-muted/30 transition-colors">
        <Icon className="w-5 h-5 text-primary shrink-0" />
        <h3 className="font-semibold text-lg flex-1 text-left">{title}</h3>
        <ChevronDown className={cn('w-5 h-5 text-muted-foreground transition-transform duration-200', open && 'rotate-180')} />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="px-4 pb-4 pt-0 space-y-4">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}

interface ThemeOptionProps {
  variant: ThemeVariant;
  label: string;
  color: string;
  selected: boolean;
  onClick: () => void;
}

function ThemeOption({ label, color, selected, onClick }: ThemeOptionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex flex-col items-center gap-2 rounded-xl border-2 p-3 transition-all',
        selected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30',
      )}
    >
      <div className="h-8 w-8 rounded-full" style={{ backgroundColor: color }} />
      <span className="text-xs font-medium">{label}</span>
      {selected ? <Check className="h-3 w-3 text-primary" /> : null}
    </button>
  );
}

const themes: { variant: ThemeVariant; label: string; color: string }[] = [
  { variant: 'default', label: 'Azul', color: '#3b82f6' },
  { variant: 'emerald', label: 'Verde', color: '#10b981' },
  { variant: 'violet', label: 'Violeta', color: '#8b5cf6' },
  { variant: 'rose', label: 'Rosa', color: '#f43f5e' },
  { variant: 'amber', label: 'Ambar', color: '#f59e0b' },
  { variant: 'slate', label: 'Cinza', color: '#64748b' },
];

const themeModes: { value: ThemeMode; label: string }[] = [
  { value: 'system', label: 'Sistema' },
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Escuro' },
];

export default function SettingsPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const canUpdateSettings = hasActionPermission(session?.user, 'settings', 'update');
  const setPageTitle = useUIStore((state) => state.setPageTitle);
  const { settings, updateSettings } = useAppSettings();
  const push = usePushSubscription();
  const [branding, setBranding] = useState({
    name: settings.appName,
    logoLightUrl: settings.logoLightUrl ?? settings.logoUrl ?? '',
    logoDarkUrl: settings.logoDarkUrl ?? settings.logoUrl ?? '',
    mobileIconUrl: settings.mobileIconUrl ?? '',
    sidebarLogoUrl: settings.sidebarLogoUrl ?? settings.logoLightUrl ?? settings.logoUrl ?? '',
    sidebarOpenLightUrl: settings.sidebarOpenLightUrl ?? settings.logoLightUrl ?? settings.logoUrl ?? '',
    sidebarOpenDarkUrl: settings.sidebarOpenDarkUrl ?? settings.logoDarkUrl ?? settings.logoUrl ?? '',
    sidebarCollapsedLightUrl: settings.sidebarCollapsedLightUrl ?? settings.logoLightUrl ?? settings.logoUrl ?? '',
    sidebarCollapsedDarkUrl: settings.sidebarCollapsedDarkUrl ?? settings.logoDarkUrl ?? settings.logoUrl ?? '',
    sidebarUseImage: settings.sidebarUseImage,
    sidebarTitle: settings.sidebarTitle ?? settings.appName,
    sidebarSubtitle: settings.sidebarSubtitle ?? 'Gestão de Tarefas',
    themeVariant: settings.themeVariant,
  });
  const [savingBranding, setSavingBranding] = useState(false);
  const [settingsTab, setSettingsTab] = useState<SettingsTab>('appearance');

  useEffect(() => { setPageTitle('Configurações'); }, [setPageTitle]);

  useEffect(() => {
    const loadBranding = async () => {
      if (!session?.user) return;
      try {
        const payload = await getUserBranding();
        setBranding({
          name: payload.name ?? settings.appName,
          logoLightUrl: payload.logoLightUrl ?? payload.logoUrl ?? '',
          logoDarkUrl: payload.logoDarkUrl ?? payload.logoUrl ?? '',
          mobileIconUrl: payload.mobileIconUrl ?? '',
          sidebarLogoUrl: payload.sidebarLogoUrl ?? payload.logoLightUrl ?? payload.logoUrl ?? '',
          sidebarOpenLightUrl: payload.sidebarOpenLightUrl ?? payload.logoLightUrl ?? payload.logoUrl ?? '',
          sidebarOpenDarkUrl: payload.sidebarOpenDarkUrl ?? payload.logoDarkUrl ?? payload.logoUrl ?? '',
          sidebarCollapsedLightUrl: payload.sidebarCollapsedLightUrl ?? payload.logoLightUrl ?? payload.logoUrl ?? '',
          sidebarCollapsedDarkUrl: payload.sidebarCollapsedDarkUrl ?? payload.logoDarkUrl ?? payload.logoUrl ?? '',
          sidebarUseImage: payload.sidebarUseImage ?? true,
          sidebarTitle: payload.sidebarTitle ?? '',
          sidebarSubtitle: payload.sidebarSubtitle ?? '',
          themeVariant: (payload.themeVariant as ThemeVariant | undefined) ?? settings.themeVariant,
        });
      } catch {
        setBranding({
          name: settings.appName,
          logoLightUrl: settings.logoLightUrl ?? settings.logoUrl ?? '',
          logoDarkUrl: settings.logoDarkUrl ?? settings.logoUrl ?? '',
          mobileIconUrl: settings.mobileIconUrl ?? '',
          sidebarLogoUrl: settings.sidebarLogoUrl ?? settings.logoLightUrl ?? settings.logoUrl ?? '',
          sidebarOpenLightUrl: settings.sidebarOpenLightUrl ?? settings.logoLightUrl ?? settings.logoUrl ?? '',
          sidebarOpenDarkUrl: settings.sidebarOpenDarkUrl ?? settings.logoDarkUrl ?? settings.logoUrl ?? '',
          sidebarCollapsedLightUrl: settings.sidebarCollapsedLightUrl ?? settings.logoLightUrl ?? settings.logoUrl ?? '',
          sidebarCollapsedDarkUrl: settings.sidebarCollapsedDarkUrl ?? settings.logoDarkUrl ?? settings.logoUrl ?? '',
          sidebarUseImage: settings.sidebarUseImage,
          sidebarTitle: settings.sidebarTitle ?? '',
          sidebarSubtitle: settings.sidebarSubtitle ?? '',
          themeVariant: settings.themeVariant,
        });
      }
    };

    void loadBranding();
  }, [
    session?.user,
    settings.appName,
    settings.logoUrl,
    settings.logoLightUrl,
    settings.logoDarkUrl,
    settings.mobileIconUrl,
    settings.sidebarLogoUrl,
    settings.sidebarOpenLightUrl,
    settings.sidebarOpenDarkUrl,
    settings.sidebarCollapsedLightUrl,
    settings.sidebarCollapsedDarkUrl,
    settings.sidebarUseImage,
    settings.sidebarTitle,
    settings.sidebarSubtitle,
    settings.themeVariant,
  ]);

  const handleClearCache = async () => {
    if (confirm('Tem certeza? Todos os dados offline serão apagados.')) {
      await db.delete();
      await db.open();
      localStorage.clear();
      toast.success('Cache e dados offline limpos com sucesso!');
      window.location.reload();
    }
  };

  const handleClearLegacyOfflineData = async () => {
    if (!confirm('Remover dados offline antigos sem tenant identificado? O conteúdo da Bíblia será preservado.')) return;
    const removed = await clearUnscopedOfflineData();
    toast.success(`${removed} registro(s) legado(s) removido(s).`);
  };

  const handleSaveBranding = async () => {
    setSavingBranding(true);
    try {
      const payload = await updateUserBranding({
        name: branding.name,
        themeVariant: branding.themeVariant,
    logoLightBase64: branding.logoLightUrl === '' ? null : branding.logoLightUrl.startsWith('data:') ? branding.logoLightUrl : undefined,
    logoDarkBase64: branding.logoDarkUrl === '' ? null : branding.logoDarkUrl.startsWith('data:') ? branding.logoDarkUrl : undefined,
    mobileIconBase64: branding.mobileIconUrl === '' ? null : branding.mobileIconUrl.startsWith('data:') ? branding.mobileIconUrl : undefined,
    sidebarLogoBase64: branding.sidebarLogoUrl === '' ? null : branding.sidebarLogoUrl.startsWith('data:') ? branding.sidebarLogoUrl : undefined,
        sidebarOpenLightBase64: branding.sidebarOpenLightUrl === '' ? null : branding.sidebarOpenLightUrl.startsWith('data:') ? branding.sidebarOpenLightUrl : undefined,
        sidebarOpenDarkBase64: branding.sidebarOpenDarkUrl === '' ? null : branding.sidebarOpenDarkUrl.startsWith('data:') ? branding.sidebarOpenDarkUrl : undefined,
        sidebarCollapsedLightBase64: branding.sidebarCollapsedLightUrl === '' ? null : branding.sidebarCollapsedLightUrl.startsWith('data:') ? branding.sidebarCollapsedLightUrl : undefined,
        sidebarCollapsedDarkBase64: branding.sidebarCollapsedDarkUrl === '' ? null : branding.sidebarCollapsedDarkUrl.startsWith('data:') ? branding.sidebarCollapsedDarkUrl : undefined,
        sidebarUseImage: branding.sidebarUseImage,
        sidebarTitle: branding.sidebarTitle.trim() || null,
        sidebarSubtitle: branding.sidebarSubtitle.trim() || null,
      });
      updateSettings({
        appName: payload.name ?? branding.name,
        logoUrl: payload.logoUrl ?? null,
        logoLightUrl: payload.logoLightUrl ?? payload.logoUrl ?? null,
        logoDarkUrl: payload.logoDarkUrl ?? payload.logoUrl ?? null,
        mobileIconUrl: payload.mobileIconUrl ?? null,
        sidebarLogoUrl: payload.sidebarLogoUrl ?? null,
        sidebarOpenLightUrl: payload.sidebarOpenLightUrl ?? null,
        sidebarOpenDarkUrl: payload.sidebarOpenDarkUrl ?? null,
        sidebarCollapsedLightUrl: payload.sidebarCollapsedLightUrl ?? null,
        sidebarCollapsedDarkUrl: payload.sidebarCollapsedDarkUrl ?? null,
        sidebarUseImage: payload.sidebarUseImage ?? true,
        sidebarTitle: payload.sidebarTitle,
        sidebarSubtitle: payload.sidebarSubtitle,
        themeVariant: (payload.themeVariant as ThemeVariant | undefined) ?? settings.themeVariant,
      });
      toast.success('Branding atualizado.');
    } catch {
      toast.error('Erro ao salvar branding.');
    } finally {
      setSavingBranding(false);
    }
  };

  type BrandingImageField = 'mobileIconUrl' | 'sidebarOpenLightUrl' | 'sidebarOpenDarkUrl' | 'sidebarCollapsedLightUrl' | 'sidebarCollapsedDarkUrl';

  const handleLogoUpload = async (field: BrandingImageField, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === 'string') {
        setBranding((current) => ({ ...current, [field]: result }));
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <WebPageLayout
      title="Configurações"
      description="Gerencie a aparência, identidade e recursos do seu aplicativo."
    >

      <SettingsTabs value={settingsTab} onChange={setSettingsTab} />

      {/* Tema, aparência e identidade visual */}
      <AparenciaTab active={settingsTab === 'appearance'} value="appearance">
        <CollapsibleSection icon={Palette} title="Tema, aparência e identidade visual">
          <div className="grid gap-6 lg:grid-cols-[430px_minmax(0,1fr)] lg:items-start">
            <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-3 sm:p-4">
              <div>
                <p className="font-medium">Preview do aplicativo</p>
                <p className="text-sm text-muted-foreground">Visualização da identidade atual no mobile.</p>
              </div>
              <p className="text-center text-xs text-muted-foreground">Pré-visualização iOS</p>
              <div className="theme-preview-stage lg:justify-start">
                <MobileThemePreview
                  appName={branding.name || settings.appName}
                  userName={session?.user?.name ?? 'Alessandro'}
                  logoUrl={branding.mobileIconUrl || branding.logoLightUrl || branding.logoDarkUrl}
                  accentColor={themes.find((theme) => theme.variant === branding.themeVariant)?.color}
                  dark={settings.themeMode === 'dark'}
                />
              </div>
            </div>
            <div className="min-w-0 space-y-4">
        <div className="space-y-6">
          <div className="space-y-3">
          <Label>Cor Principal</Label>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {themes.map((theme) => (
              <ThemeOption
                key={theme.variant}
                variant={theme.variant}
                label={theme.label}
                color={theme.color}
                selected={branding.themeVariant === theme.variant}
                onClick={() => canUpdateSettings && setBranding((current) => ({ ...current, themeVariant: theme.variant }))}
              />
            ))}
          </div>
          {canUpdateSettings && (
            <Button className="w-full" onClick={() => void handleSaveBranding()} disabled={savingBranding}>
              {savingBranding ? 'Aplicando...' : 'Aplicar cor da igreja'}
            </Button>
          )}
          </div>
          <div className="flex items-center justify-between py-2">
          <div className="w-full space-y-3">
            <div>
              <p className="font-medium">Aparência do app</p>
              <p className="text-sm text-muted-foreground">Define a preferência visual do usuário</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {themeModes.map((mode) => (
                <Button
                  key={mode.value}
                  type="button"
                  variant={settings.themeMode === mode.value ? 'default' : 'outline'}
                  onClick={() => canUpdateSettings && updateSettings({ themeMode: mode.value })}
                  disabled={!canUpdateSettings}
                >
                  {mode.label}
                </Button>
              ))}
            </div>
          </div>
          </div>
        </div>
        {canUpdateSettings && (
          <div className="space-y-4 border-t border-border pt-6">
            <div>
              <p className="font-medium">Identidade visual e logos</p>
              <p className="text-sm text-muted-foreground">Essas imagens alimentam o preview e cada contexto do aplicativo.</p>
            </div>
            <div className="space-y-2">
              <Label>Nome da igreja</Label>
              <Input
                value={branding.name ?? ''}
                onChange={(event) => setBranding((current) => ({ ...current, name: event.target.value }))}
                placeholder="Nome exibido no app e no login"
              />
            </div>
            <div className="space-y-2">
              <p className="font-medium">Logos por contexto</p>
              <p className="text-sm text-muted-foreground">Use arquivos separados para preservar contraste e leitura em cada tema.</p>
              <div className="grid gap-4 sm:grid-cols-2">
                {([
                  ['mobileIconUrl', 'Ícone mobile', 'Ícone quadrado usado no mobile e atalhos.'],
                  ['sidebarOpenLightUrl', 'Sidebar aberta · tema claro', 'Logo retangular usada quando a sidebar está expandida no tema claro.'],
                  ['sidebarOpenDarkUrl', 'Sidebar aberta · tema escuro', 'Logo retangular usada quando a sidebar está expandida no tema escuro.'],
                  ['sidebarCollapsedLightUrl', 'Sidebar recolhida · tema claro', 'Ícone quadrado usado quando a sidebar está recolhida no tema claro.'],
                  ['sidebarCollapsedDarkUrl', 'Sidebar recolhida · tema escuro', 'Ícone quadrado usado quando a sidebar está recolhida no tema escuro.'],
                ] as const).map(([field, label, hint]) => (
                  <div key={field} className="space-y-2 rounded-lg border border-border p-3">
                    <Label>{label}</Label>
                    <p className="text-xs text-muted-foreground">{hint}</p>
                    <Input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => void handleLogoUpload(field, event)} />
                    {branding[field] && <AppImage src={branding[field]} alt={label} width={320} height={160} className={field === 'mobileIconUrl' ? 'h-20 w-20 rounded-lg object-contain' : 'h-16 w-full rounded-lg object-contain'} />}
                    {branding[field] && <Button type="button" variant="outline" size="sm" onClick={() => setBranding((current) => ({ ...current, [field]: '' }))}>Remover</Button>}
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-3 rounded-lg border border-border p-3">
              <div>
                <p className="font-medium">Sidebar aberta</p>
                <p className="text-sm text-muted-foreground">Escolha se a sidebar exibe a imagem retangular e quais textos aparecem ao lado.</p>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
                <div>
                  <p className="text-sm font-medium">Usar imagem na sidebar</p>
                  <p className="text-xs text-muted-foreground">Quando desativado, a sidebar usa apenas os textos configurados.</p>
                </div>
                <Switch checked={branding.sidebarUseImage} onCheckedChange={(checked) => setBranding((current) => ({ ...current, sidebarUseImage: checked }))} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Título opcional</Label>
                  <Input value={branding.sidebarTitle} onChange={(event) => setBranding((current) => ({ ...current, sidebarTitle: event.target.value }))} placeholder="Ex.: Igreja Esperança" />
                </div>
                <div className="space-y-2">
                  <Label>Subtítulo opcional</Label>
                  <Input value={branding.sidebarSubtitle} onChange={(event) => setBranding((current) => ({ ...current, sidebarSubtitle: event.target.value }))} placeholder="Ex.: Gestão de Tarefas" />
                </div>
              </div>
            </div>
            <Button className="w-full" onClick={() => void handleSaveBranding()} disabled={savingBranding}>
              {savingBranding ? 'Salvando...' : 'Salvar identidade visual'}
            </Button>
          </div>
        )}
            </div>
          </div>
        </CollapsibleSection>
      </AparenciaTab>

      <BibliaOfflineTab active={settingsTab === 'offline'} value="offline">
        <CollapsibleSection icon={Download} title="Bíblia offline">
        <p className="text-sm text-muted-foreground">O download é opcional e fica salvo somente neste dispositivo. Escolha quais versões deseja acessar sem internet.</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <BibleDownloadControl translation="AA" />
          <BibleDownloadControl translation="ACF" />
          <BibleDownloadControl translation="NVI" />
        </div>
        </CollapsibleSection>
      </BibliaOfflineTab>

      <NotificacoesTab active={settingsTab === 'notifications'} value="notifications">
        <CollapsibleSection icon={Bell} title="Notificações no dispositivo">
        <p className="text-sm text-muted-foreground">
          Receba alertas mesmo quando o app estiver fechado. A permissão é controlada pelo navegador.
        </p>
        {!push.supported ? (
          <p className="text-sm text-muted-foreground">{push.supportIssue ?? 'Este navegador não oferece notificações Push.'}</p>
        ) : push.subscribed ? (
          <Button variant="outline" className="w-full" onClick={() => void push.unsubscribe()} disabled={push.loading}>
            {push.loading ? 'Desativando...' : 'Desativar notificações Push'}
          </Button>
        ) : (
          <Button className="w-full" onClick={() => void push.subscribe()} disabled={push.loading}>
            {push.loading ? 'Ativando...' : 'Ativar notificações Push'}
          </Button>
        )}
        {push.permission === 'granted' && !push.subscribed && !push.loading && (
          <p className="text-xs text-muted-foreground">Permissão concedida, mas o registro do dispositivo ainda não foi concluído.</p>
        )}
        {push.error && <p className="text-xs text-destructive">{push.error}</p>}
        {push.permission === 'denied' && !push.error && <p className="text-xs text-destructive">A permissão foi bloqueada. Reative-a nas configurações do navegador.</p>}
        </CollapsibleSection>
      </NotificacoesTab>

      <IgrejaTab active={settingsTab === 'church'} value="church">
        {(session?.user?.role === 'ADMIN' || session?.user?.role === 'PASTOR') && session?.user?.tenantId ? (
          <CollapsibleSection icon={ImageIcon} title="Cadastro da Igreja">
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Compartilhe o link ou o QR Code corretos do cadastro público da sua igreja.
              </p>
              <RegistrationShareCard tenantSlug={session.user.tenantSlug ?? session.user.tenantId} />
            </div>
          </CollapsibleSection>
        ) : <Card className="p-4 text-sm text-muted-foreground">Você não possui permissão para configurar o cadastro da igreja.</Card>}
      </IgrejaTab>

      <AdministracaoTab active={settingsTab === 'admin'} value="admin">
        {/* Admin Features */}
        {session?.user?.role === 'ADMIN' && (
          <>
            <CollapsibleSection icon={Gift} title="Programa de Fidelidade">
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">Configurações avançadas de fidelidade para membros.</p>
                <Button variant="outline" className="w-full">Gerenciar Regras</Button>
              </div>
            </CollapsibleSection>

            <CollapsibleSection icon={Lock} title="Gerenciar Usuários">
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">Gestão de permissões de acesso ao sistema.</p>
                <Button variant="outline" className="w-full" onClick={() => router.push('/members')}>
                  Listar Usuários
                </Button>
              </div>
            </CollapsibleSection>
          </>
        )}

        {/* Danger Zone */}
        <Card className="border-border shadow-sm">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 p-4 h-auto text-warning hover:bg-warning/10"
          onClick={handleClearLegacyOfflineData}
        >
          <Trash2 className="w-5 h-5" />
          <span>Remover dados offline antigos sem tenant</span>
        </Button>
        <Button 
          variant="ghost" 
          className="w-full justify-start gap-3 p-4 h-auto text-destructive hover:bg-destructive/10" 
          onClick={handleClearCache}
        >
          <Trash2 className="w-5 h-5" />
          <span>Limpar Dados Offline</span>
        </Button>
        </Card>

        <Button variant="ghost" className="w-full gap-2 text-destructive" onClick={() => signOut()}>
          <LogOut className="w-4 h-4" /> Sair da conta
        </Button>
      </AdministracaoTab>
    </WebPageLayout>
  );
}
