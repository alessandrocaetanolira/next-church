'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUIStore } from '@/features/ui/store';
import { useAppSettings } from '@/components/providers/AppSettingsProvider';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import { Palette, Gift, Lock, Trash2, LogOut, ImageIcon, Download, Bell } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useSession, signOut } from 'next-auth/react';
import { hasActionPermission } from '@/lib/access-control';
import { RegistrationShareCard } from '@/features/pastoral/components/RegistrationShareCard';
import { PendingMembersCard } from '@/features/pastoral/components/PendingMembersCard';
import { BibleDownloadControl } from '@/features/bible/components/BibleDownloadControl';
import { usePushSubscription } from '@/hooks/use-push-subscription';
import { AppImage, MobileThemePreview } from '@/components/shared';
import { AparenciaTab } from './tabs/aparenciaTab';
import { BibliaOfflineTab } from './tabs/bibliaOfflineTab';
import { IgrejaTab } from './tabs/igrejaTab';
import { NotificacoesTab } from './tabs/notificacoesTab';
import { SettingsSection } from '@/features/settings/components/SettingsSection';
import { ThemeOption, themeModes, themeOptions } from '@/features/settings/components/ThemeOptions';
import { useSettingsBranding } from '@/features/settings/hooks/use-settings-branding';
import { useSettingsController } from '@/features/settings/hooks/use-settings-controller';
import { SettingsScreen } from '@/features/settings/screens';

export default function SettingsPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const canUpdateSettings = hasActionPermission(session?.user, 'settings', 'update');
  const setPageTitle = useUIStore((state) => state.setPageTitle);
  const { settings, updateSettings } = useAppSettings();
  const brandingController = useSettingsBranding();
  const push = usePushSubscription();
  const { branding, setBranding, savingBranding, saveBranding, handleLogoUpload } = brandingController;
  const { settingsTab, setSettingsTab, clearCache, clearLegacyOfflineData } = useSettingsController();

  useEffect(() => { setPageTitle('Configurações'); }, [setPageTitle]);


  const handleSaveBranding = async () => {
    try { await saveBranding(); toast.success('Branding atualizado.'); }
    catch { toast.error('Erro ao salvar branding.'); }
  };

  return (
    <SettingsScreen activeTab={settingsTab} onTabChange={setSettingsTab}>

      {/* Tema, aparência e identidade visual */}
      <AparenciaTab active={settingsTab === 'appearance'} value="appearance">
        <SettingsSection icon={Palette} title="Tema, aparência e identidade visual">
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
                  accentColor={themeOptions.find((theme) => theme.variant === branding.themeVariant)?.color}
                  dark={settings.themeMode === 'dark'}
                />
              </div>
            </div>
            <div className="min-w-0 space-y-4">
        <div className="space-y-6">
          <div className="space-y-3">
          <Label>Cor Principal</Label>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {themeOptions.map((theme) => (
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
        </SettingsSection>
      </AparenciaTab>

      <BibliaOfflineTab active={settingsTab === 'offline'} value="offline">
        <SettingsSection icon={Download} title="Bíblia offline">
        <p className="text-sm text-muted-foreground">O download é opcional e fica salvo somente neste dispositivo. Escolha quais versões deseja acessar sem internet.</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <BibleDownloadControl translation="AA" />
          <BibleDownloadControl translation="ACF" />
          <BibleDownloadControl translation="NVI" />
        </div>
        </SettingsSection>
      </BibliaOfflineTab>

      <NotificacoesTab active={settingsTab === 'notifications'} value="notifications">
        <SettingsSection icon={Bell} title="Notificações no dispositivo">
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
        </SettingsSection>
      </NotificacoesTab>

      <IgrejaTab active={settingsTab === 'church'} value="church">
        {(session?.user?.role === 'ADMIN' || session?.user?.role === 'PASTOR') && session?.user?.tenantId ? (
          <>
          <SettingsSection icon={ImageIcon} title="Igreja e membros">
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Compartilhe o link ou o QR Code corretos do cadastro público da sua igreja.
              </p>
              <RegistrationShareCard tenantSlug={session.user.tenantSlug ?? ''} />
              <PendingMembersCard />
            </div>
          </SettingsSection>
          {session?.user?.role === 'ADMIN' ? (
            <>
              <SettingsSection icon={Gift} title="Programa de Fidelidade">
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">Configurações avançadas de fidelidade para membros.</p>
                  <Button variant="outline" className="w-full">Gerenciar Regras</Button>
                </div>
              </SettingsSection>

              <SettingsSection icon={Lock} title="Gerenciar usuários">
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">Gestão de permissões de acesso ao sistema.</p>
                  <Button variant="outline" className="w-full" onClick={() => router.push('/members')}>
                    Listar usuários
                  </Button>
                </div>
              </SettingsSection>
            </>
          ) : null}
          </>
        ) : <Card className="p-4 text-sm text-muted-foreground">Você não possui permissão para configurar o cadastro da igreja.</Card>}
        {/* Dados locais e sessão */}
        <Card className="border-border shadow-sm">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 p-4 h-auto text-warning hover:bg-warning/10"
          onClick={() => void clearLegacyOfflineData()}
        >
          <Trash2 className="w-5 h-5" />
          <span>Remover dados offline antigos sem tenant</span>
        </Button>
        <Button 
          variant="ghost" 
          className="w-full justify-start gap-3 p-4 h-auto text-destructive hover:bg-destructive/10" 
          onClick={() => void clearCache()}
        >
          <Trash2 className="w-5 h-5" />
          <span>Limpar Dados Offline</span>
        </Button>
        </Card>

        <Button variant="ghost" className="w-full gap-2 text-destructive" onClick={async () => {
          const tenantSlug = session?.user?.isPlatformAdmin ? '' : session?.user?.tenantSlug?.trim().toLowerCase();
          await signOut({ redirect: false });
          window.location.replace(tenantSlug ? `/auth/login?igreja=${encodeURIComponent(tenantSlug)}` : '/auth/login');
        }}>
          <LogOut className="w-4 h-4" /> Sair da conta
        </Button>
      </IgrejaTab>
    </SettingsScreen>
  );
}
