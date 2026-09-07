"use client";

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { NavLink } from '@/components/NavLink';
import { LayoutDashboard, Calendar, ShoppingCart, Wallet, Settings, Menu, BookOpen, Users as UsersIcon, MessageCircle, Gamepad2, Megaphone, Bell, Package, Layers, Heart, Baby, Car } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { hasPermission } from '@/lib/access-control';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';

export function BottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const canAccessSchedules = hasPermission(user, 'tasks');
  const canAccessMaterials = hasPermission(user, 'materials');

  const mainItems = [
    { to: '/', icon: LayoutDashboard, label: 'Início', show: true },
    { to: '/schedules', icon: Calendar, label: 'Escalas', show: canAccessSchedules },
    { to: '/feed', icon: MessageCircle, label: 'Feed', show: true },
    { to: '/carteira', icon: Wallet, label: 'Cart.', show: true },
  ].filter(item => item.show);

  const drawerItems = [
    { to: '/jogos-novos', icon: Gamepad2, label: 'Jogos', show: true },
    { to: '/bible', icon: BookOpen, label: 'Bíblia', show: true },
    { to: '/groups', icon: Layers, label: 'Grupos', show: true },
    { to: '/kids', icon: Baby, label: 'Infantil', show: true },
    { to: '/social-projects', icon: Heart, label: 'Proj. Sociais', show: true },
    { to: '/parking', icon: Car, label: 'Estacion.', show: true },
    { to: '/members', icon: UsersIcon, label: 'Membros', show: user?.role === 'ADMIN' || user?.role === 'PASTOR' },
    { to: '/materials', icon: Package, label: 'Materiais', show: canAccessMaterials },
    { to: '/notifications', icon: Bell, label: 'Notificações', show: true },
    { to: '/pastoral', icon: Megaphone, label: 'Área do Pastor', show: hasPermission(user, 'pastor') },
    { to: '/canteen', icon: ShoppingCart, label: 'Cantina', show: hasPermission(user, 'canteen') },
    { to: '/settings', icon: Settings, label: 'Configurações', show: hasPermission(user, 'settings') },
  ].filter(item => item.show);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 border-t border-border safe-bottom">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {mainItems.map((item) => {
          const isActive = pathname === item.to;
          return (
            <NavLink key={item.to} to={item.to}
              className={cn('flex flex-col items-center justify-center gap-1 w-16 h-14 rounded-xl transition-all duration-200',
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground')}>
              <item.icon className={cn('w-5 h-5', isActive && 'stroke-[2.5]')} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </NavLink>
          );
        })}
        <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
          <SheetTrigger asChild>
            <button className="flex flex-col items-center justify-center gap-1 w-16 h-14 rounded-xl transition-all duration-200 text-muted-foreground hover:text-foreground">
              <Menu className="w-5 h-5" />
              <span className="text-[10px] font-medium">Mais</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-2xl max-h-[70vh]">
            <SheetHeader className="pb-2"><SheetTitle className="text-base">Menu</SheetTitle></SheetHeader>
            <Separator className="mb-3" />
            <div className="grid grid-cols-3 gap-2 overflow-y-auto pb-6">
              {drawerItems.map((item) => {
                const isActive = pathname === item.to;
                return (
                  <NavLink key={item.to} to={item.to} onClick={() => setDrawerOpen(false)}
                    className={cn('flex flex-col items-center justify-center gap-2 p-3 rounded-xl transition-all',
                      isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted')}>
                    <item.icon className="w-5 h-5" />
                    <span className="text-[11px] font-medium text-center leading-tight">{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
