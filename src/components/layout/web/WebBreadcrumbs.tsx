"use client";

import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { usePathname } from "next/navigation";
import { WEB_NAVIGATION } from "@/components/layout/navigation/web-navigation";
import { cn } from "@/lib/utils";

const CONTEXT_LABELS: Array<[string, string]> = [
  ["/members/new", "Novo membro"],
  ["/cantina/products/new", "Novo produto"],
  ["/cantina/configuracoes", "Configurações"],
  ["/admin/plans", "Planos"],
];

function getContextLabel(pathname: string) {
  const exactLabel = CONTEXT_LABELS.find(([route]) => pathname === route)?.[1];
  if (exactLabel) return exactLabel;
  if (/^\/members\/[^/]+$/.test(pathname)) return "Detalhes do membro";
  if (/^\/groups\/[^/]+$/.test(pathname)) return "Detalhes do grupo";
  if (/^\/cantina\/products\/[^/]+\/edit$/.test(pathname)) return "Editar produto";
  if (/^\/cantina\/products\/[^/]+$/.test(pathname)) return "Detalhes do produto";
  if (/^\/admin\/tenants\/[^/]+$/.test(pathname)) return "Detalhes da igreja";
  return "Detalhes";
}

export function WebBreadcrumbs() {
  const pathname = usePathname();
  if (pathname === "/") {
    return (
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-foreground">
        <Home className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="px-1.5 py-1 font-medium">Início</span>
      </nav>
    );
  }

  const navigationItem = WEB_NAVIGATION
    .flatMap((group) => group.items)
    .filter((item) => pathname === item.to || pathname.startsWith(`${item.to}/`))
    .sort((a, b) => b.to.length - a.to.length)[0];

  if (!navigationItem) return null;

  const contextLabel = getContextLabel(pathname);

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-muted-foreground">
      <Link href="/" className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 hover:bg-muted hover:text-foreground">
        <Home className="h-3.5 w-3.5" />
        <span>Início</span>
      </Link>
      <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
      <span className={cn("px-1.5 py-1", pathname === navigationItem.to && "font-medium text-foreground")}>
        {navigationItem.label}
      </span>
      {pathname !== navigationItem.to && (
        <>
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="px-1.5 py-1 font-medium text-foreground">{contextLabel}</span>
        </>
      )}
    </nav>
  );
}
