"use client";

import { ArrowLeft, Monitor, Moon, Sun } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { NotificationBell } from "@/components/NotificationBell";
import { Button } from "@/components/ui/button";
import { WebUserMenu } from "@/components/layout/web/WebUserMenu";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useAppSettings } from "@/components/providers/AppSettingsProvider";
import { WebBreadcrumbs } from "@/components/shared/web";

export function WebHeader() {
  const { user } = useAuth();
  const { settings, updateSettings } = useAppSettings();
  const pathname = usePathname();
  const router = useRouter();
  const isFeedDetailsPage = /^\/feed\/[^/]+$/.test(pathname);
  const isFeedCommentPage = /^\/feed\/[^/]+\/comments\/new$/.test(pathname);
  const feedPostId = isFeedCommentPage ? pathname.split('/')[2] : null;

  const isMember = user?.role === "MEMBER";
  const handleCycleThemeMode = () => {
    const nextMode =
      settings.themeMode === "system"
        ? "light"
        : settings.themeMode === "light"
          ? "dark"
          : "system";
    updateSettings({ themeMode: nextMode });
  };

  const themeButton = {
    system: { label: "Sistema", icon: Monitor },
    light: { label: "Claro", icon: Sun },
    dark: { label: "Escuro", icon: Moon },
  }[settings.themeMode];
  const ThemeIcon = themeButton.icon;

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-card/80 px-4 backdrop-blur-lg">
      <div className="flex items-center gap-4">
        <SidebarTrigger />
        {isFeedDetailsPage || isFeedCommentPage ? (
          <Button variant="ghost" size="sm" className="gap-2 px-2" onClick={() => router.push(feedPostId ? `/feed/${feedPostId}` : '/feed')}>
            <ArrowLeft className="h-4 w-4" />
            <span>{feedPostId ? 'Voltar à publicação' : 'Voltar ao Feed'}</span>
          </Button>
        ) : null}
        <WebBreadcrumbs />
      </div>
      <div className="flex items-center gap-2">
        {isMember && (
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 px-2 text-xs"
            onClick={handleCycleThemeMode}
          >
            <ThemeIcon className="h-3.5 w-3.5" />
            <span>{themeButton.label}</span>
          </Button>
        )}
        <NotificationBell />
        <WebUserMenu />
      </div>
    </header>
  );
}
