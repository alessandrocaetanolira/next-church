"use client";

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { NavLink } from '@/components/NavLink';
import { LayoutDashboard, ShoppingCart, Settings, Menu, BookOpen, Users as UsersIcon, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { canSeeModuleEntry, getAccessibleModules, isModulePlanAvailable } from '@/lib/access-control';
import { useDrawer } from '@/components/providers/DrawerProvider';
import { toast } from 'sonner';
import { getMobileMenuItems } from './navigation/mobile-navigation';
import { MobileMenuDrawer } from './MobileMenuDrawer';

export function BottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const accessibleModules = getAccessibleModules(user);
  const { openDrawer, closeDrawer } = useDrawer();
  const previousPath = useRef(pathname);

  useEffect(() => {
    if (previousPath.current !== pathname) closeDrawer();
    previousPath.current = pathname;
  }, [closeDrawer, pathname]);
  const platformMainItems = [
    { to: '/admin', icon: LayoutDashboard, label: 'Visão geral', show: true, disabled: false },
    { to: '/admin/tenants', icon: UsersIcon, label: 'Tenants', show: true, disabled: false },
    { to: '/admin/plans', icon: Settings, label: 'Planos', show: true, disabled: false },
  ];
  const mainItems = user?.isPlatformAdmin ? platformMainItems : [
    { to: '/', icon: LayoutDashboard, label: 'Início', show: accessibleModules.has('dashboard') },
    { to: '/bible', icon: BookOpen, label: 'Bíblia', show: accessibleModules.has('bible') },
    { to: '/feed', icon: MessageCircle, label: 'Feed', show: accessibleModules.has('feed') },
    { to: '/cantina', icon: ShoppingCart, label: 'Cantina', show: accessibleModules.has('canteen') || canSeeModuleEntry(user, 'canteen'), disabled: !isModulePlanAvailable(user, 'canteen') },
  ].filter(item => item.show);

  const drawerItems = getMobileMenuItems(user);

  return (
    <nav aria-label="Navegação principal" className="fixed inset-x-0 bottom-0 z-50 isolate w-full border-t border-border/70 bg-card/80 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl supports-[backdrop-filter]:bg-card/65">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {mainItems.map((item) => {
          const isActive = pathname === item.to;
          return (
            <NavLink key={item.to} to={item.to}
              onClick={(event) => {
                if (item.disabled) {
                  event.preventDefault();
                  toast.info('Este recurso não está incluso no plano atual.');
                  return;
                }
                closeDrawer();
              }}
              aria-disabled={item.disabled}
              title={item.disabled ? 'Este recurso não está incluso no plano atual.' : undefined}
              className={cn('flex h-14 w-16 touch-manipulation flex-col items-center justify-center gap-1 rounded-xl transition-colors duration-150',
                item.disabled ? 'cursor-not-allowed text-muted-foreground/50' : isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground')}>
              <item.icon className={cn('w-5 h-5', isActive && 'stroke-[2.5]')} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </NavLink>
          );
        })}
        {drawerItems.length > 0 ? <button
          type="button"
          onClick={() => openDrawer({
            contentClassName: 'max-h-[70dvh]',
            contentWrapperClassName: 'min-h-0 overflow-y-auto overscroll-contain pb-0',
            closeOnSuspend: true,
            repositionInputs: false,
            content: <MobileMenuDrawer />,
          })}
          aria-label="Mais opções"
          className="flex h-14 w-16 touch-manipulation flex-col items-center justify-center gap-1 rounded-xl text-muted-foreground transition-colors duration-150 hover:text-foreground"
        >
          <Menu className="h-5 w-5" />
          <span className="text-[10px] font-medium">Mais</span>
        </button> : null}
      </div>
    </nav>
  );
}
