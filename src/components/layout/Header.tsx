"use client";

import { ArrowLeft, LogOut, Info, WifiOff, Monitor, Sun, Moon, Wallet, UserRound } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useAppSettings } from '@/components/providers/AppSettingsProvider';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { NotificationBell } from '@/components/NotificationBell';
import { useState, useEffect } from 'react';
import { isOffline, onConnectivityChange } from '@/lib/pushNotifications';
import { usePushSubscription } from '@/hooks/use-push-subscription';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { AppImage } from '@/components/shared';
import { getAccessibleModules } from '@/lib/access-control';

const CHANGELOG = [
  {
    version: 'Beta 1.0',
    date: '2026-03-09',
    changes: [
      '🎯 Ícone da aba Preparo pulsa e muda de cor quando há pedidos em preparação',
      '🔔 Notificação automática para o comprador quando pedido fica pronto',
      '📍 Todos os toasts da Cantina agora aparecem no topo (sem conflito com navegação inferior)',
      '✅ App promovido para versão Beta com toda documentação atualizada',
    ],
  },
  {
    version: '1.4.0',
    date: '2026-03-09',
    changes: [
      'Suporte offline completo via Service Worker (Workbox) com cache de todos os assets',
      'Notificações nativas do browser via Notification API',
      'Indicador de status offline no header',
      'Botão de ativação de notificações do sistema no header',
      'Documentação de uso completa na Central de Ajuda (por módulo e nível de usuário)',
      'Guia PWA, offline e notificações na Central de Ajuda',
      'Módulo pushNotifications.ts centralizado',
    ],
  },
  {
    version: '1.3.0',
    date: '2026-03-09',
    changes: [
      'Restrição de alteração de status de tarefas (apenas membros atribuídos e admin)',
      'Central de notificações com detalhes e filtros',
      'Tela "Sobre" com changelog de versões',
      'Criação do RESUME.md com visão geral do projeto',
    ],
  },
  {
    version: '1.2.0',
    date: '2026-03-08',
    changes: [
      'CRUD de membros e permissões restrito ao admin em Configurações',
      'Cards colapsáveis na tela de Configurações',
      '8 usuários de teste com diferentes roles e permissões',
      'Tela de login com credenciais de demonstração expandidas',
    ],
  },
  {
    version: '1.1.0',
    date: '2026-03-07',
    changes: [
      'Programa de fidelidade com vigência, formas de pagamento e valores mínimos',
      'Sistema de notificações em tempo real com SSE simulado',
      'Exportação de relatórios em PDF e Excel com identidade visual',
      'Sistema de fiado com cobrança via WhatsApp',
    ],
  },
  {
    version: '1.0.0',
    date: '2026-03-01',
    changes: [
      'Dashboard com estatísticas e tarefas pendentes',
      'CRUD completo de tarefas, equipes, materiais e produtos',
      'PDV da cantina com carrinho e múltiplos pagamentos',
      'PWA instalável com tema customizável (6 cores + dark mode)',
      'Devocional diário com streak e pontuação',
    ],
  },
];

export function Header() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const { settings, updateSettings } = useAppSettings();
  const [showAbout, setShowAbout] = useState(false);
  const [offline, setOffline] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);
  const push = usePushSubscription();

  useEffect(() => {
    setOffline(isOffline());
    return onConnectivityChange((online) => setOffline(!online));
  }, []);

  useEffect(() => {
    if (push.error) toast.error(push.error);
  }, [push.error]);

  useEffect(() => {
    setLogoFailed(false);
  }, [settings.logoUrl, settings.logoLightUrl, settings.logoDarkUrl]);

  const handleRequestNotifications = async () => {
    const enabled = await push.subscribe();
    if (enabled) toast.success('Notificações ativadas neste dispositivo.');
  };

  const initials = user?.name
    ? user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  const isMember = user?.role === 'MEMBER';
  const canAccessWallet = getAccessibleModules(user).has('wallet');

  const handleCycleThemeMode = () => {
    const nextMode =
      settings.themeMode === 'system'
        ? 'light'
        : settings.themeMode === 'light'
          ? 'dark'
          : 'system';
    updateSettings({ themeMode: nextMode });
  };

  const themeButton = {
    system: { label: 'Sistema', icon: Monitor },
    light: { label: 'Claro', icon: Sun },
    dark: { label: 'Escuro', icon: Moon },
  }[settings.themeMode];

  const ThemeIcon = themeButton.icon;

  const mobileBackTarget = (() => {
    if (/^\/feed\/[^/]+\/comments\/new$/.test(pathname)) return { href: `/feed/${pathname.split('/')[2]}`, label: 'Publicação' };
    if (/^\/feed\/[^/]+$/.test(pathname)) return { href: '/feed', label: 'Feed' };
    if (pathname === '/members/new') return { href: '/members', label: 'Membros' };
    if (pathname === '/groups/new') return { href: '/groups', label: 'Grupos' };
    if (pathname === '/minha-conta/perfil') return { href: '/minha-conta', label: 'Minha conta' };
    if (/^\/groups\/[^/]+\/edit$/.test(pathname)) return { href: `/groups/${pathname.split('/')[2]}`, label: 'Grupo' };
    if (pathname === '/kids/new') return { href: '/kids', label: 'Infantil' };
    if (/^\/kids\/[^/]+\/edit$/.test(pathname)) return { href: '/kids', label: 'Infantil' };
    if (/^\/members\/[^/]+\/(edit|access)$/.test(pathname)) return { href: `/members/${pathname.split('/')[2]}`, label: 'Membro' };
    if (/^\/members\/[^/]+$/.test(pathname)) return { href: '/members', label: 'Membros' };
    if (/^\/groups\/[^/]+$/.test(pathname)) return { href: '/groups', label: 'Grupos' };
    if (pathname === '/schedules/new') return { href: '/schedules', label: 'Escalas' };
    if (pathname === '/cantina/products/new') return { href: '/cantina', label: 'Cantina' };
    if (pathname === '/cantina/checkout') return { href: '/cantina?tab=pdv', label: 'PDV' };
    if (/^\/cantina\/products\/[^/]+\/edit$/.test(pathname)) return { href: `/cantina/products/${pathname.split('/')[3]}`, label: 'Produto' };
    if (/^\/cantina\/products\/[^/]+$/.test(pathname)) return { href: '/cantina', label: 'Cantina' };
    return null;
  })();

  return (
    <>
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <div className="flex h-16 items-center justify-between px-4">
          <div className="flex min-w-0 items-center gap-2">
            {mobileBackTarget ? (
              <Button variant="ghost" className="h-9 gap-1 px-1.5 text-sm" onClick={() => router.push(mobileBackTarget.href)} aria-label={`Voltar para ${mobileBackTarget.label}`}>
                <ArrowLeft className="h-5 w-5" />
                <span className="max-w-28 truncate">{mobileBackTarget.label}</span>
              </Button>
            ) : (
              <div className="flex h-9 w-40 items-center justify-start">
                <AppImage
                  src={settings.logoLightUrl && !logoFailed ? settings.logoLightUrl : settings.logoUrl && !logoFailed ? settings.logoUrl : '/branding/a-mesa-church/header.png'}
                  alt={settings.appName}
                  className="h-full w-full object-contain object-left dark:hidden"
                  onError={() => setLogoFailed(true)}
                />
                <AppImage
                  src={settings.logoDarkUrl && !logoFailed ? settings.logoDarkUrl : settings.logoUrl && !logoFailed ? settings.logoUrl : '/branding/a-mesa-church/header.png'}
                  alt={settings.appName}
                  className="hidden h-full w-full object-contain object-left dark:block"
                  onError={() => setLogoFailed(true)}
                />
              </div>
            )}
          </div>

          <TooltipProvider>
            <div className="flex items-center gap-1.5">
              {offline && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-destructive/10 text-destructive">
                      <WifiOff className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-medium hidden sm:inline">Offline</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>Sem conexão — dados salvos localmente</TooltipContent>
                </Tooltip>
              )}

              {push.supported && !push.subscribed && push.permission !== 'denied' && (
                <Button variant="outline" size="sm" className="h-8 px-2 text-xs" onClick={() => void handleRequestNotifications()} disabled={push.loading}>
                  {push.loading ? 'Ativando...' : 'Ativar alertas'}
                </Button>
              )}

              {isMember && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 gap-1.5 px-2 text-xs" onClick={handleCycleThemeMode}>
                      <ThemeIcon className="h-3.5 w-3.5" />
                      <span>{themeButton.label}</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Alterna entre Sistema, Claro e Escuro</TooltipContent>
                </Tooltip>
              )}

              <Tooltip>
                <TooltipTrigger asChild>
                  <NotificationBell />
                </TooltipTrigger>
                <TooltipContent>Notificações</TooltipContent>
              </Tooltip>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                    <Avatar className="h-9 w-9">
                      {user?.image ? <AvatarImage src={user.image} alt={user.name || 'Usuário'} /> : null}
                      <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium">{user?.name}</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  {canAccessWallet ? (
                    <DropdownMenuItem onClick={() => router.push('/carteira')}>
                      <Wallet className="mr-2 h-4 w-4" />
                      Carteira
                    </DropdownMenuItem>
                  ) : null}
                  <DropdownMenuItem onClick={() => router.push('/minha-conta/perfil')}>
                    <UserRound className="mr-2 h-4 w-4" />
                    Perfil do usuário
                  </DropdownMenuItem>
                  {canAccessWallet ? <DropdownMenuSeparator /> : null}
                  <DropdownMenuItem onClick={() => setShowAbout(true)}>
                    <Info className="w-4 h-4 mr-2" />
                    Sobre
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} className="text-destructive">
                    <LogOut className="w-4 h-4 mr-2" />
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </TooltipProvider>
        </div>
      </header>

      {/* About Dialog */}
      <Dialog open={showAbout} onOpenChange={setShowAbout}>
        <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <AppImage src={settings.logoUrl && !logoFailed ? settings.logoUrl : '/branding/a-mesa-church/header.png'} alt={settings.appName} width={64} height={64} className="h-full w-full rounded-lg object-contain" onError={() => setLogoFailed(true)} />
              </div>
              {settings.appName}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              Sistema de gestão para igrejas e comunidades. Gerencie equipes, tarefas, cantina e engajamento de membros.
            </p>

            <div className="space-y-4">
              <h4 className="font-semibold text-sm">Changelog</h4>
              {CHANGELOG.map((release) => (
                <div key={release.version} className="border border-border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-bold text-primary">v{release.version}</span>
                    <span className="text-xs text-muted-foreground">{release.date}</span>
                  </div>
                  <ul className="space-y-1">
                    {release.changes.map((change, i) => (
                      <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                        <span className="text-primary mt-0.5">•</span>
                        <span>{change}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <p className="text-center text-xs text-muted-foreground pt-2">
              {settings.appName} v1.3.0 — Feito com ❤️
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
