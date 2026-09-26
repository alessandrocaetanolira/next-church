"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { WebHeader } from "@/components/layout/web/WebHeader";
import { WebPageContainer } from "@/components/shared/web";
import { SidebarProvider } from "@/components/ui/sidebar";

interface WebTemplateProps {
  children: ReactNode;
}

export function WebTemplate({ children }: WebTemplateProps) {
  const pathname = usePathname();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <WebHeader />
          <main className="flex-1 overflow-auto">
            <WebPageContainer key={pathname}>
              {children}
            </WebPageContainer>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
