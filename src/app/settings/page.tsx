'use client';

import { useState, useEffect } from 'react';
import { useUIStore } from '@/features/ui/store';
import { useAppSettings } from '@/components/providers/AppSettingsProvider';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Palette, Gift, Lock, Trash2, LogOut, ImageIcon, Check } from 'lucide-react';
import { toast } from 'sonner';
import { db } from '@/lib/db';
import { cn } from '@/lib/utils';
import { useSession, signOut } from 'next-auth/react';
import { RegistrationShareCard } from '@/features/pastoral/components/RegistrationShareCard';
import type { ThemeMode, ThemeVariant } from '@/components/providers/AppSettingsProvider';

function CollapsibleSection({ icon: Icon, title, children }: any) {
  const [open, setOpen] = useState(false);
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
  const { data: session } = useSession();
  const setPageTitle = useUIStore((state) => state.setPageTitle);
  const { settings, updateSettings } = useAppSettings();
  const [branding, setBranding] = useState({
    name: settings.appName,
    logoUrl: settings.logoUrl ?? '',
    themeVariant: settings.themeVariant,
  });
  const [savingBranding, setSavingBranding] = useState(false);

  useEffect(() => { setPageTitle('Configurações'); }, [setPageTitle]);

  useEffect(() => {
    const loadBranding = async () => {
      if (!session?.user) return;
      try {
        const response = await fetch('/api/settings/branding', { cache: 'no-store' });
        if (!response.ok) throw new Error();
        const payload = await response.json();
        setBranding({
          name: payload.name ?? settings.appName,
          logoUrl: payload.logoUrl ?? '',
          themeVariant: (payload.themeVariant as ThemeVariant | undefined) ?? settings.themeVariant,
        });
      } catch {
        setBranding({
          name: settings.appName,
          logoUrl: settings.logoUrl ?? '',
          themeVariant: settings.themeVariant,
        });
      }
    };

    void loadBranding();
  }, [session?.user, settings.appName, settings.logoUrl, settings.themeVariant]);

  const handleClearCache = async () => {
    if (confirm('Tem certeza? Todos os dados offline serão apagados.')) {
      await db.delete();
      await db.open();
      localStorage.clear();
      toast.success('Cache e dados offline limpos com sucesso!');
      window.location.reload();
    }
  };

  const handleSaveBranding = async () => {
    setSavingBranding(true);
    try {
      const response = await fetch('/api/settings/branding', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: branding.name,
          logoUrl: branding.logoUrl,
          themeVariant: branding.themeVariant,
        }),
      });

      if (!response.ok) throw new Error();
      const payload = await response.json();
      updateSettings({
        appName: payload.name,
        logoUrl: payload.logoUrl ?? null,
        themeVariant: (payload.themeVariant as ThemeVariant | undefined) ?? settings.themeVariant,
      });
      toast.success('Branding atualizado.');
    } catch {
      toast.error('Erro ao salvar branding.');
    } finally {
      setSavingBranding(false);
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === 'string') {
        setBranding((current) => ({ ...current, logoUrl: result }));
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-4 pb-20">
      <h2 className="text-xl font-bold mb-4">Configurações</h2>

      {/* Tema e Aparência */}
      <CollapsibleSection icon={Palette} title="Tema e Aparência">
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
                onClick={() => setBranding((current) => ({ ...current, themeVariant: theme.variant }))}
              />
            ))}
          </div>
          {(session?.user?.role === 'ADMIN' || session?.user?.role === 'PASTOR') && (
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
                  onClick={() => updateSettings({ themeMode: mode.value })}
                >
                  {mode.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </CollapsibleSection>

      {(session?.user?.role === 'ADMIN' || session?.user?.role === 'PASTOR') && (
        <CollapsibleSection icon={ImageIcon} title="Nome e Logo da Igreja">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome da igreja</Label>
              <Input
                value={branding.name}
                onChange={(event) => setBranding((current) => ({ ...current, name: event.target.value }))}
                placeholder="Nome exibido no app e no login"
              />
            </div>
            <div className="space-y-2">
              <Label>Logo da igreja</Label>
              <Input type="file" accept="image/*" onChange={handleLogoUpload} />
              {branding.logoUrl ? (
                <div className="mt-2 flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-3">
                  <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl bg-background">
                    <img src={branding.logoUrl} alt={branding.name} className="h-full w-full object-contain" />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setBranding((current) => ({ ...current, logoUrl: '' }))}
                  >
                    Remover logo
                  </Button>
                </div>
              ) : null}
            </div>
            <Button className="w-full" onClick={() => void handleSaveBranding()} disabled={savingBranding}>
              {savingBranding ? 'Salvando...' : 'Salvar Branding'}
            </Button>
          </div>
        </CollapsibleSection>
      )}

      {(session?.user?.role === 'ADMIN' || session?.user?.role === 'PASTOR') && session?.user?.tenantId ? (
        <CollapsibleSection icon={ImageIcon} title="Cadastro da Igreja">
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Compartilhe o link ou o QR Code corretos do cadastro público da sua igreja.
            </p>
            <RegistrationShareCard tenantSlug={session.user.tenantSlug ?? session.user.tenantId} />
          </div>
        </CollapsibleSection>
      ) : null}

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
               <Button variant="outline" className="w-full">Listar Usuários</Button>
             </div>
          </CollapsibleSection>
        </>
      )}

      {/* Danger Zone */}
      <Card className="border-border shadow-sm">
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
    </div>
  );
}
