"use client";

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { NavLink } from '@/components/NavLink';
import { LayoutDashboard, Calendar, ShoppingCart, Settings, Menu, BookOpen, Users as UsersIcon, MessageCircle, Gamepad2, Megaphone, Bell, Package, Layers, Heart, Baby, Car } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { canSeeModuleEntry, getAccessibleModules, isModulePlanAvailable } from '@/lib/access-control';
import { useDrawer } from '@/components/providers/DrawerProvider';
import { toast } from 'sonner';

export function BottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const accessibleModules = getAccessibleModules(user);
  const { openDrawer, closeDrawer } = useDrawer();

  useEffect(() => {
    closeDrawer();
  }, [closeDrawer, pathname]);
  const mainItems = [
    { to: '/', icon: LayoutDashboard, label: 'Início', show: accessibleModules.has('dashboard') },
    { to: '/bible', icon: BookOpen, label: 'Bíblia', show: accessibleModules.has('bible') },
    { to: '/feed', icon: MessageCircle, label: 'Feed', show: accessibleModules.has('feed') },
    { to: '/cantina', icon: ShoppingCart, label: 'Cantina', show: accessibleModules.has('canteen') || canSeeModuleEntry(user, 'canteen'), disabled: !isModulePlanAvailable(user, 'canteen') },
  ].filter(item => item.show);

  const drawerItems = [
    { to: '/schedules', icon: Calendar, label: 'Escalas', show: accessibleModules.has('schedules') },
    { to: '/jogos-novos', icon: Gamepad2, label: 'Jogos', show: accessibleModules.has('games') },
    { to: '/groups', icon: Layers, label: 'Grupos', show: accessibleModules.has('groups') },
    { to: '/kids', icon: Baby, label: 'Infantil', show: accessibleModules.has('kids') },
    { to: '/social-projects', icon: Heart, label: 'Proj. Sociais', show: accessibleModules.has('socialProjects') },
    { to: '/parking', icon: Car, label: 'Estacion.', show: accessibleModules.has('parking') },
    { to: '/members', icon: UsersIcon, label: 'Membros', show: accessibleModules.has('members') },
    { to: '/materials', icon: Package, label: 'Materiais', show: accessibleModules.has('materials') },
    { to: '/notifications', icon: Bell, label: 'Notificações', show: accessibleModules.has('notifications') },
    { to: '/pastoral', icon: Megaphone, label: 'Área do Pastor', show: accessibleModules.has('pastoral') },
    { to: '/settings', icon: Settings, label: 'Configurações', show: accessibleModules.has('settings') },
  ].filter(item => item.show);

  return (
    <nav aria-label="Navegação principal" className="fixed inset-x-0 bottom-0 z-50 isolate border-t border-border bg-card/95 safe-bottom supports-[backdrop-filter]:bg-card/80">
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
        <button
          type="button"
          onClick={() => openDrawer({
            contentClassName: 'max-h-[70dvh]',
            contentWrapperClassName: 'min-h-0 overflow-y-auto overscroll-contain pb-0',
            content: <>
              <div className="grid grid-cols-3 gap-3 overflow-y-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-8">
                {drawerItems.map((item, index) => {
                  const isActive = pathname === item.to;
                  return (
                    <NavLink key={item.to} to={item.to} onClick={closeDrawer}
                      className={cn('flex min-h-20 touch-manipulation flex-col items-center justify-center gap-2 rounded-xl bg-muted/40 p-4 text-center transition-colors dark:bg-muted/30',
                        'animate__animated animate__zoomIn',
                        isActive ? 'bg-primary/10 text-primary dark:bg-primary/15' : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground')}
                      style={{ animationDelay: `${Math.min(index * 35, 280)}ms` }}>
                      <item.icon className="h-5 w-5" />
                      <span className="text-center text-[11px] font-medium leading-tight">{item.label}</span>
                    </NavLink>
                  );
                })}
              </div>
            </>,
          })}
          aria-label="Mais opções"
          className="flex h-14 w-16 touch-manipulation flex-col items-center justify-center gap-1 rounded-xl text-muted-foreground transition-colors duration-150 hover:text-foreground"
        >
          <Menu className="h-5 w-5" />
          <span className="text-[10px] font-medium">Mais</span>
        </button>
      </div>
    </nav>
  );
}
