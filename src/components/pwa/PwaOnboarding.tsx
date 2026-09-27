'use client';

import { useEffect, useMemo, useState } from 'react';
import { Bell, Download, MoreVertical, PlusSquare, Share } from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { usePushSubscription } from '@/hooks/use-push-subscription';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

type DeferredInstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

const INSTALL_DISMISSED_KEY = 'church-pwa-install-dismissed-v1';
const NOTIFICATIONS_DISMISSED_KEY = 'church-pwa-notifications-dismissed-v1';

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
  const { isAuthenticated } = useAuth();
  const push = usePushSubscription();
  const [mounted, setMounted] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<DeferredInstallPrompt | null>(null);
  const [installed, setInstalled] = useState(false);
  const [installDismissed, setInstallDismissed] = useState(true);
  const [notificationsDismissed, setNotificationsDismissed] = useState(true);
  const [installResolved, setInstallResolved] = useState(false);
  const [serviceWorkerReady, setServiceWorkerReady] = useState(false);

  const ios = useMemo(() => isIosBrowser(), []);
  const android = useMemo(() => isAndroidBrowser(), []);
  const production = process.env.NODE_ENV === 'production';

  useEffect(() => {
    setMounted(true);
    setInstalled(isStandalone());
    setInstallDismissed(readFlag(INSTALL_DISMISSED_KEY));
    setNotificationsDismissed(readFlag(NOTIFICATIONS_DISMISSED_KEY));

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as DeferredInstallPrompt);
    };
    const handleInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
      writeFlag(INSTALL_DISMISSED_KEY);
      setInstallDismissed(true);
      setInstallResolved(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt as EventListener);
    window.addEventListener('appinstalled', handleInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt as EventListener);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  useEffect(() => {
    if (!production || !mounted || !isAuthenticated || !('serviceWorker' in navigator)) return;
    void navigator.serviceWorker.ready.then(() => setServiceWorkerReady(true)).catch(() => setServiceWorkerReady(false));
  }, [isAuthenticated, mounted, production]);

  const canOfferInstall = production && mounted && isAuthenticated && !installed && !installDismissed && Boolean(installPrompt || ios || android);
  const canOfferNotifications = production && mounted && isAuthenticated && installResolved && serviceWorkerReady && push.supported && push.permission === 'default' && !push.subscribed && !notificationsDismissed;

  const dismissInstall = () => {
    writeFlag(INSTALL_DISMISSED_KEY);
    setInstallDismissed(true);
    setInstallResolved(true);
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
    writeFlag(NOTIFICATIONS_DISMISSED_KEY);
    setNotificationsDismissed(true);
  };

  const enableNotifications = async () => {
    const enabled = await push.subscribe();
    if (enabled) dismissNotifications();
  };

  return (
    <>
      <Dialog open={canOfferInstall} onOpenChange={(open) => { if (!open) dismissInstall(); }}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-md rounded-xl border-border/80 bg-card p-5 shadow-xl sm:p-6">
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
          <DialogFooter>
            <Button variant="outline" onClick={dismissInstall}>Agora não</Button>
            <Button variant="outline" onClick={openInApp}>Abrir no app</Button>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => void install()}>{ios || (android && !installPrompt) ? 'Entendi' : 'Instalar app'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={canOfferNotifications} onOpenChange={(open) => { if (!open) dismissNotifications(); }}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-md rounded-xl border-border/80 bg-card p-5 shadow-xl sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Bell className="h-5 w-5 text-primary" />Ativar notificações</DialogTitle>
            <DialogDescription>Receba avisos importantes da sua igreja neste dispositivo.</DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Você poderá receber atualizações do feed, pedidos da cantina, permissões e outros avisos em tempo real.</p>
          {push.error && <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{push.error}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={dismissNotifications}>Agora não</Button>
            <Button onClick={() => void enableNotifications()} disabled={push.loading}>{push.loading ? 'Ativando...' : 'Ativar notificações'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
