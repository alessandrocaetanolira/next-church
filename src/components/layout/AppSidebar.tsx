"use client";

import { LayoutDashboard, Calendar, Package, Settings, ShoppingCart, UserPlus, Wallet, BookOpen, MessageCircle, Gamepad2, Megaphone, ShieldCheck, Bell, Layers, Heart, Baby, Car } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { usePathname } from 'next/navigation';
import { useAppSettings } from '@/components/providers/AppSettingsProvider';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { hasPermission } from '@/lib/access-control';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarHeader, SidebarFooter, useSidebar,
} from '@/components/ui/sidebar';

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const pathname = usePathname();
  const { settings } = useAppSettings();
  const { user } = useAuth();
  const canAccessSchedules = hasPermission(user, 'tasks');
  const canAccessMaterials = hasPermission(user, 'materials');

  const mainItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard', show: true },
    { to: '/carteira', icon: Wallet, label: 'Carteira', show: true },
    { to: '/schedules', icon: Calendar, label: 'Escalas', show: canAccessSchedules },
    { to: '/groups', icon: Layers, label: 'Grupos', show: true },
    { to: '/kids', icon: Baby, label: 'Infantil', show: true },
    { to: '/social-projects', icon: Heart, label: 'Projetos Sociais', show: true },
    { to: '/parking', icon: Car, label: 'Estacionamento', show: true },
    { to: '/members', icon: UserPlus, label: 'Membros', show: user?.role === 'ADMIN' || user?.role === 'PASTOR' },
    { to: '/materials', icon: Package, label: 'Materiais', show: canAccessMaterials },
    { to: '/jogos-novos', icon: Gamepad2, label: 'Jogos', show: true },
    { to: '/bible', icon: BookOpen, label: 'Bíblia', show: true },
    { to: '/feed', icon: MessageCircle, label: 'Comunidade', show: true },
    { to: '/notifications', icon: Bell, label: 'Notificações', show: true },
  ];

  const canteenItems = [
    { to: '/cantina', icon: ShoppingCart, label: 'Cantina', show: hasPermission(user, 'canteen') },
  ];

  const configItems = [
    { to: '/pastoral', icon: Megaphone, label: 'Área do Pastor', show: hasPermission(user, 'pastor') },
    { to: '/settings', icon: Settings, label: 'Configurações', show: hasPermission(user, 'settings') },
  ];

  const adminItems = [
    { to: '/admin/tenants', icon: ShieldCheck, label: 'Gerenciar Tenants', show: user?.email === 'admin@teste.com' },
  ];

  const renderNavItems = (items: typeof mainItems) => (
    <SidebarMenu>
      {items.filter(item => item.show).map((item) => {
        const isActive = pathname === item.to;
        return (
          <SidebarMenuItem key={item.to}>
            <SidebarMenuButton asChild isActive={isActive}>
              <NavLink to={item.to} end className="flex items-center gap-3 px-3 py-2 rounded-lg transition-colors hover:bg-sidebar-accent" activeClassName="bg-sidebar-accent text-sidebar-primary font-medium">
                <item.icon className="w-5 h-5 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );

  const visibleCanteenItems = canteenItems.filter(i => i.show);
  const visibleConfigItems = configItems.filter(i => i.show);

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-primary shrink-0">
            {settings.logoUrl ? (
              <img src={settings.logoUrl} alt={settings.appName} className="h-full w-full object-cover" />
            ) : (
              <span className="text-primary-foreground font-bold text-lg">✝</span>
            )}
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <h1 className="font-bold text-sidebar-foreground truncate">{settings.appName}</h1>
              <p className="text-xs text-sidebar-foreground/60">Gestão de Tarefas</p>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/60">Principal</SidebarGroupLabel>
          <SidebarGroupContent>{renderNavItems(mainItems)}</SidebarGroupContent>
        </SidebarGroup>
        {visibleCanteenItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-sidebar-foreground/60">Cantina</SidebarGroupLabel>
            <SidebarGroupContent>{renderNavItems(canteenItems)}</SidebarGroupContent>
          </SidebarGroup>
        )}
        {visibleConfigItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-sidebar-foreground/60">Sistema</SidebarGroupLabel>
            <SidebarGroupContent>{renderNavItems(configItems)}</SidebarGroupContent>
          </SidebarGroup>
        )}
        {user?.email === 'admin@teste.com' && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-red-500 font-bold uppercase tracking-wider text-[10px]">Global Admin</SidebarGroupLabel>
            <SidebarGroupContent>
              {renderNavItems([
                { to: '/admin/tenants', icon: ShieldCheck, label: 'Gerenciar Tenants', show: true }
              ])}
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter className="p-4">
        {!collapsed && <p className="text-xs text-sidebar-foreground/50 text-center">{settings.appName} v1.3.0</p>}
      </SidebarFooter>
    </Sidebar>
  );
}
