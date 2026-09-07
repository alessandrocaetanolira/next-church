/**
 * features/canteen/components/CanteenLayout.tsx
 * 
 * Layout com abas para o módulo da Cantina.
 * Permite navegação entre PDV, Preparo, Produtos, Vendas e Membros.
 */

"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode } from "react";

interface CanteenLayoutProps {
  children: ReactNode;
}

export function CanteenLayout({ children }: CanteenLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();

  const getActiveTab = () => {
    if (pathname.includes('/preparo')) return 'preparo';
    if (pathname.includes('/produtos')) return 'produtos';
    if (pathname.includes('/vendas')) return 'vendas';
    if (pathname.includes('/membros')) return 'membros';
    return 'pdv';
  };

  return (
    <div className="space-y-4">
      <Tabs value={getActiveTab()} onValueChange={(v) => router.push(`/cantina/${v === 'pdv' ? '' : v}`)}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="pdv">PDV</TabsTrigger>
          <TabsTrigger value="preparo">Preparo</TabsTrigger>
          <TabsTrigger value="produtos">Prod.</TabsTrigger>
          <TabsTrigger value="vendas">Vendas</TabsTrigger>
          <TabsTrigger value="membros">Membros</TabsTrigger>
        </TabsList>
      </Tabs>
      <div className="p-1">
        {children}
      </div>
    </div>
  );
}
