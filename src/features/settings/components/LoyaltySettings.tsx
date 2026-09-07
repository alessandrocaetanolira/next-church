/**
 * features/settings/components/LoyaltySettings.tsx
 * 
 * Formulário para configuração das regras de fidelidade da Cantina.
 */

"use client";

import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export function LoyaltySettings() {
  const form = useForm({
    defaultValues: {
      minPurchase: 10.00,
      discountPercent: 5,
    }
  });

  const onSubmit = (data: any) => {
    // Ação de persistência no Dexie ou LocalStorage
    console.log("Configurações salvas:", data);
    toast.success("Regras de fidelidade atualizadas!");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Regras de Fidelidade</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Valor mínimo para fidelidade (R$)</label>
            <Input type="number" {...form.register("minPurchase")} />
          </div>
          <div>
            <label className="text-sm font-medium">% de Desconto</label>
            <Input type="number" {...form.register("discountPercent")} />
          </div>
          <Button type="submit">Salvar Alterações</Button>
        </form>
      </CardContent>
    </Card>
  );
}
