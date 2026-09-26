"use client";

import type { ReactNode } from "react";
import { useAppSettings } from "@/components/providers/AppSettingsProvider";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { AppImage } from "@/components/shared";

interface WebSidebarProps {
  children: ReactNode;
}

export function WebSidebar({ children }: WebSidebarProps) {
  const { settings } = useAppSettings();

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="p-4 group-data-[collapsible=icon]:p-2">
        <div className="flex items-center justify-start gap-3 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0">
          {settings.sidebarUseImage ? (
            <>
              <div className="flex h-10 w-32 shrink-0 items-center justify-center overflow-hidden rounded-xl group-data-[collapsible=icon]:hidden">
                <AppImage src={settings.sidebarOpenLightUrl || settings.logoLightUrl || settings.sidebarLogoUrl || settings.logoUrl || "/branding/a-mesa-church/header.png"} alt={settings.sidebarTitle || settings.appName} width={256} height={80} className="h-full w-full object-contain dark:hidden" />
                <AppImage src={settings.sidebarOpenDarkUrl || settings.logoDarkUrl || settings.sidebarLogoUrl || settings.logoUrl || "/branding/a-mesa-church/header.png"} alt={settings.sidebarTitle || settings.appName} width={256} height={80} className="hidden h-full w-full object-contain dark:block" />
              </div>
              <div className="hidden h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl group-data-[collapsible=icon]:flex">
                <AppImage src={settings.sidebarCollapsedLightUrl || settings.logoLightUrl || settings.sidebarLogoUrl || settings.logoUrl || "/branding/a-mesa-church/header.png"} alt={settings.sidebarTitle || settings.appName} width={64} height={64} className="h-full w-full object-contain dark:hidden" />
                <AppImage src={settings.sidebarCollapsedDarkUrl || settings.logoDarkUrl || settings.sidebarLogoUrl || settings.logoUrl || "/branding/a-mesa-church/header.png"} alt={settings.sidebarTitle || settings.appName} width={64} height={64} className="hidden h-full w-full object-contain dark:block" />
              </div>
            </>
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary">
              <span className="text-lg font-bold text-primary-foreground">✝</span>
            </div>
          )}
          {(settings.sidebarTitle || settings.sidebarSubtitle) && (
            <div className="overflow-hidden group-data-[collapsible=icon]:hidden">
              {settings.sidebarTitle && <h1 className="truncate font-bold text-sidebar-foreground">{settings.sidebarTitle}</h1>}
              {settings.sidebarSubtitle && <p className="truncate text-xs text-sidebar-foreground/60">{settings.sidebarSubtitle}</p>}
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>{children}</SidebarContent>
      <SidebarFooter className="p-4">
        <p className="text-center text-xs text-sidebar-foreground/50 group-data-[collapsible=icon]:hidden">{settings.appName} v1.3.0</p>
      </SidebarFooter>
    </Sidebar>
  );
}
