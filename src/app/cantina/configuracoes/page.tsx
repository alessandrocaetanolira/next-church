/**
 * app/cantina/configuracoes/page.tsx
 * 
 * Página de configurações da Cantina.
 */

import { LoyaltySettings } from "@/features/settings/components/LoyaltySettings";
import { PageHeader } from "@/components/common/PageHeader";
import { WebPageContainer } from "@/components/shared/web";

export default function ConfiguracoesCantinaPage() {
  return (
    <WebPageContainer size="wide">
      <PageHeader title="Configurações da Cantina" />
      <LoyaltySettings />
    </WebPageContainer>
  );
}
