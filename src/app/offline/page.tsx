"use client";

import { useEffect } from "react";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";

export default function OfflinePage() {
  useEffect(() => {
    // O worker pode servir este documento em /pwa-start ou numa subrota.
    // Normaliza o chrome pelo History API, sem fetch/redirect de rede.
    if (window.location.pathname !== "/offline") {
      window.history.replaceState(null, "", "/offline");
    }
  }, []);
  return (
    // O LayoutWrapper já monta Header/BottomNav com a última sessão offline.
    // Não criar outro main nem impor 100dvh dentro da área reservada do shell.
    <section aria-label="Página indisponível offline" className="flex h-full min-h-0 items-center justify-center bg-background p-4 sm:p-6">
      <EmptyState
        className="w-full max-w-md border-solid"
        icon={
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-xl font-semibold text-primary">
            CA
          </div>
        }
        title="Você está offline"
        description="Esta página não está disponível sem conexão. Você pode continuar lendo a Bíblia previamente baixada."
        action={<Button asChild variant="outline"><a href="/bible">Abrir Bíblia offline</a></Button>}
      />
    </section>
  );
}
