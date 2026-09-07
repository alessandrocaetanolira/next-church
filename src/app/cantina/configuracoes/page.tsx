/**
 * app/cantina/configuracoes/page.tsx
 * 
 * Página de configurações da Cantina.
 */

import { LoyaltySettings } from "@/features/settings/components/LoyaltySettings";

export default function ConfiguracoesCantinaPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Configurações da Cantina</h2>
      <LoyaltySettings />
    </div>
  );
}
