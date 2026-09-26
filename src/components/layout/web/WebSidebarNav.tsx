"use client";

import { usePathname } from "next/navigation";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { getVisibleWebNavigation, type VisibleWebNavigationGroup } from "@/components/layout/navigation/web-navigation-access";
import type { WebNavigationItem } from "@/components/layout/navigation/web-navigation";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

export function WebSidebarNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const visibleGroups = getVisibleWebNavigation(user);

  return (
    <>
      {visibleGroups.map(({ group, items }) => (
        <SidebarSection key={group.id} group={group} items={items} pathname={pathname} />
      ))}
    </>
  );
}

function SidebarSection({
  group,
  items,
  pathname,
}: {
  group: VisibleWebNavigationGroup["group"];
  items: WebNavigationItem[];
  pathname: string;
}) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel className={group.destructive ? "font-bold uppercase tracking-wider text-[10px] text-destructive" : "text-sidebar-foreground/60"}>
        {group.label}
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <SidebarMenuItem key={item.to}>
                <SidebarMenuButton asChild isActive={pathname === item.to || pathname.startsWith(`${item.to}/`)}>
                  <NavLink
                    to={item.to}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-sidebar-accent"
                    activeClassName="bg-sidebar-accent font-medium text-sidebar-primary"
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
