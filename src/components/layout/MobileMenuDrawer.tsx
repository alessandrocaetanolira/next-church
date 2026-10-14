'use client';

import { usePathname } from 'next/navigation';
import { NavLink } from '@/components/NavLink';
import { DrawerTitle } from '@/components/ui/drawer';
import { useDrawer } from '@/components/providers/DrawerProvider';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { cn } from '@/lib/utils';
import { getMobileMenuItems } from './navigation/mobile-navigation';

/** Reads access inside the portal so an open menu follows session/SSE changes. */
export function MobileMenuDrawer() {
  const { user } = useAuth();
  const pathname = usePathname();
  const { closeDrawer } = useDrawer();
  const items = getMobileMenuItems(user);
  return <>
    <DrawerTitle className="sr-only">Mais opções</DrawerTitle>
    <div className="grid grid-cols-3 gap-3 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-8">
      {items.map((item) => <NavLink key={item.module} to={item.to} onClick={closeDrawer}
        data-mobile-menu-item={item.module}
        className={cn('flex min-h-20 touch-manipulation flex-col items-center justify-center gap-2 rounded-xl bg-muted/40 p-4 text-center transition-colors dark:bg-muted/30',
          pathname === item.to ? 'bg-primary/10 text-primary dark:bg-primary/15' : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground')}>
        <item.icon className="h-5 w-5" />
        <span className="text-center text-[11px] font-medium leading-tight">{item.label}</span>
      </NavLink>)}
    </div>
  </>;
}
