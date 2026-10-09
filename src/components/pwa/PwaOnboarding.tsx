'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Bell, Download, PlusSquare, Share } from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { usePushSubscription } from '@/hooks/use-push-subscription';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

type DeferredInstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

const INSTALL_DISMISSED_KEY = 'church-pwa-install-dismissed-v1';

function isIosBrowser() {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function isAndroidBrowser() {
  if (typeof navigator === 'undefined') return false;
  return /Android/i.test(navigator.userAgent);
}

function isStandalone() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches
    || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
}

function readFlag(key: string) {
  try { return localStorage.getItem(key) === '1'; } catch { return false; }
}

function writeFlag(key: string) {
  try { localStorage.setItem(key, '1'); } catch { /* preferência opcional */ }
}

export function PwaOnboarding() {
  const { isAuthenticated, user } = useAuth();
  const push = usePushSubscription();
  const [mounted, setMounted] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<DeferredInstallPrompt | null>(null);
  const [installed, setInstalled] = useState(false);
  const [installDismissed, setInstallDismissed] = useState(true);
  const [notificationsPromptClosed, setNotificationsPromptClosed] = useState(false);
  const previousPushPermissionRef = useRef<NotificationPermission | null>(null);
  const identity = isAuthenticated ? `${user?.isPlatformAdmin}:${user?.tenantId}:${user?.id}` : null;

  const ios = useMemo(() => isIosBrowser(), []);
  const android = useMemo(() => isAndroidBrowser(), []);
  const production = process.env.NODE_ENV === 'production';

  useEffect(() => {
    setMounted(true);
    setInstalled(isStandalone());
    const dismissed = readFlag(INSTALL_DISMISSED_KEY);
    setInstallDismissed(dismissed);

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as DeferredInstallPrompt);
    };
    const handleInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
      writeFlag(INSTALL_DISMISSED_KEY);
      setInstallDismissed(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt as EventListener);
    window.addEventListener('appinstalled', handleInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt as EventListener);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  useEffect(() => {
    setNotificationsPromptClosed(false);
    previousPushPermissionRef.current = null;
  }, [identity]);

  useEffect(() => {
    const previousPermission = previousPushPermissionRef.current;
    // A pessoa pode conceder a permissão no diálogo do SO ou nos ajustes do
    // navegador depois de dispensar o onboarding. Nesse caso, reabrimos apenas
    // a etapa de sincronização; fechar a modal sem mudar a permissão continua
    // respeitado até uma nova abertura do app.
    if (previousPermission !== null
      && previousPermission !== 'granted'
      && push.permission === 'granted'
      && !push.subscribed) {
      setNotificationsPromptClosed(false);
    }
    previousPushPermissionRef.current = push.permission;
  }, [push.permission, push.subscribed]);

  const canOfferInstall = production && mounted && isAuthenticated && !installed && !installDismissed && Boolean(installPrompt || ios || android);
  // Instalação tem prioridade: apenas um diálogo pode capturar foco por vez.
  // A sugestão não depende de worker ativo; a ativação trata espera e falhas.
  const canOfferNotifications = production
    && mounted
    && isAuthenticated
    && !canOfferInstall
    && push.statusChecked
    && push.supported
    && !push.subscribed
    && !notificationsPromptClosed
    && (push.permission === 'default' || push.permission === 'granted' || push.permission === 'denied');

  const dismissInstall = () => {
    writeFlag(INSTALL_DISMISSED_KEY);
    setInstallDismissed(true);
  };

  const openInApp = () => {
    const currentUrl = window.location.href;
    const opened = window.open(currentUrl, '_blank', 'noopener,noreferrer');
    if (!opened) window.location.assign(currentUrl);
  };

  const install = async () => {
    if (!installPrompt) {
      dismissInstall();
      return;
    }
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    setInstallPrompt(null);
    if (choice.outcome === 'accepted') {
      setInstalled(true);
    }
    dismissInstall();
  };

  const dismissNotifications = () => {
    setNotificationsPromptClosed(true);
  };

  const enableNotifications = async () => {
    const enabled = await push.subscribe();
    if (enabled) dismissNotifications();
  };

  return (
    <>
      <Dialog open={canOfferInstall} onOpenChange={(open) => { if (!open) dismissInstall(); }}>
        <DialogContent className="max-w-md rounded-xl border-border/80 bg-card p-5 shadow-xl sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Download className="h-5 w-5 text-primary" />Instalar o Church App</DialogTitle>
            <DialogDescription>Tenha acesso rápido à igreja, notificações e recursos offline.</DialogDescription>
          </DialogHeader>
          {ios ? (
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>No iPhone ou iPad, toque em <Share className="mx-1 inline h-4 w-4 text-foreground" /> <strong className="text-foreground">Compartilhar</strong> e depois em <PlusSquare className="mx-1 inline h-4 w-4 text-foreground" /> <strong className="text-foreground">Adicionar à Tela de Início</strong>.</p>
              <p>Depois de instalado, o app poderá receber notificações neste dispositivo.</p>
            </div>
          ) : android && !installPrompt ? (
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>Para instalar no Android, abra o menu <strong className="text-foreground">⋮</strong> do Chrome e toque em <strong className="text-foreground">Instalar app</strong> ou <strong className="text-foreground">Adicionar à tela inicial</strong>.</p>
              <p>Se essa opção não aparecer, abra o menu do navegador depois de carregar a página completamente e confirme que está usando HTTPS.</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Instale o app para abrir a igreja diretamente pela tela inicial, com uma experiência mais rápida e preparada para uso offline.</p>
          )}
          <DialogFooter className="gap-2 pt-2 sm:space-x-0">
            <Button variant="ghost" className="w-full sm:w-auto" onClick={dismissInstall}>Agora não</Button>
            <Button variant="outline" className="w-full sm:w-auto" onClick={openInApp}>Abrir no app</Button>
            <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 sm:w-auto" onClick={() => void install()}>{ios || (android && !installPrompt) ? 'Entendi' : 'Instalar app'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={canOfferNotifications} onOpenChange={(open) => { if (!open) dismissNotifications(); }}>
        <DialogContent className="max-w-md rounded-xl border-border/80 bg-card p-5 shadow-xl sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Bell className="h-5 w-5 text-primary" />{push.permission === 'denied' ? 'Notificações bloqueadas' : push.permission === 'granted' ? 'Sincronizar notificações' : 'Ativar notificações'}</DialogTitle>
            <DialogDescription>Receba avisos importantes da sua igreja neste dispositivo.</DialogDescription>
          </DialogHeader>
          {push.permission === 'denied' ? (
            <p className="text-sm text-muted-foreground">A permissão foi bloqueada nas configurações do navegador. Libere notificações para este site nas configurações do dispositivo e volte ao app; vamos detectar a mudança e permitir sincronizar.</p>
          ) : (
            <p className="text-sm text-muted-foreground">Você poderá receber atualizações do feed, pedidos da cantina, permissões e outros avisos em tempo real.</p>
          )}
          {push.error && <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{push.error}</p>}
          <DialogFooter className="gap-2 pt-2 sm:space-x-0">
            <Button variant="ghost" className="w-full sm:w-auto" onClick={dismissNotifications}>{push.permission === 'denied' ? 'Entendi' : 'Agora não'}</Button>
            {push.permission !== 'denied' ? (
              <Button className="w-full sm:w-auto" onClick={() => void enableNotifications()} disabled={push.loading}>
                {push.loading ? 'Ativando...' : push.phase === 'error' ? 'Tentar novamente' : push.permission === 'granted' ? 'Concluir ativação' : 'Ativar notificações'}
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
