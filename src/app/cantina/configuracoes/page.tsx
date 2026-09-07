/**
 * app/cantina/configuracoes/page.tsx
 * 
 * Página de configurações da Cantina.
 */

import { LoyaltySettings } from "@/features/settings/components/LoyaltySettings";
import { PageHeader } from "@/components/common/PageHeader";
import { PageShell } from "@/components/common/PageShell";

export default function ConfiguracoesCantinaPage() {
  return (
    <PageShell>
      <PageHeader title="Configurações da Cantina" />
      <LoyaltySettings />
    </PageShell>
  );
}
