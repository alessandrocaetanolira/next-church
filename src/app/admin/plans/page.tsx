'use client';

import { useEffect, useState } from 'react';
import { Check, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CurrencyInput } from '@/components/ui/currency-input';
import { toast } from 'sonner';
import { PLAN_FEATURES } from '@/lib/plan-features';
import { createAdminPlan, deleteAdminPlan, listAdminPlans, updateAdminPlan, type AdminPlan } from '@/services/admin/plans-api';
import { WebPageContainer, WebPageHeader } from '@/components/shared/web';
import { PlansWebTable } from '@/features/admin-plans/components/PlansWebTable';

type Plan = AdminPlan;

type FormState = {
  code: string;
  name: string;
  description: string;
  priceCents: string;
  maxUsers: string;
  maxStorageMb: string;
  features: string;
  active: boolean;
};

const emptyForm: FormState = {
  code: '', name: '', description: '', priceCents: '0', maxUsers: '', maxStorageMb: '', features: '', active: true,
};

function formFromPlan(plan: Plan): FormState {
  let features: string[] = [];
  try { features = plan.features ? JSON.parse(plan.features) : []; } catch { features = []; }
  return {
    code: plan.code,
    name: plan.name,
    description: plan.description ?? '',
    priceCents: String(plan.priceCents),
    maxUsers: plan.maxUsers == null ? '' : String(plan.maxUsers),
    maxStorageMb: plan.maxStorageMb == null ? '' : String(plan.maxStorageMb),
    features: features.join(', '),
    active: plan.active,
  };
}

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [loadError, setLoadError] = useState(false);

  async function loadPlans() {
    setLoading(true);
    setLoadError(false);
    try {
      setPlans(await listAdminPlans());
    } catch {
      setLoadError(true);
      toast.error('Não foi possível carregar os planos.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadPlans(); }, []);

  function updateForm(field: keyof FormState, value: string | boolean) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function toggleFeature(feature: string) {
    const current = new Set(form.features.split(',').map((item) => item.trim()).filter(Boolean));
    if (current.has(feature)) current.delete(feature); else current.add(feature);
    updateForm('features', Array.from(current).join(', '));
  }

  async function savePlan(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    const payload = {
      ...form,
      code: form.code.trim().toUpperCase(),
      priceCents: Number(form.priceCents),
      maxUsers: form.maxUsers,
      maxStorageMb: form.maxStorageMb,
      features: form.features.split(',').map((feature) => feature.trim()).filter(Boolean),
    };

    try {
      if (editingId) await updateAdminPlan(editingId, payload);
      else await createAdminPlan(payload);
      toast.success(editingId ? 'Plano atualizado.' : 'Plano criado.');
      setForm(emptyForm);
      setEditingId(null);
      setFormOpen(false);
      await loadPlans();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível salvar o plano.');
    } finally {
      setSaving(false);
    }
  }

  async function deletePlan(plan: Plan) {
    if (!window.confirm(`Excluir o plano ${plan.name}?`)) return;
    try {
      await deleteAdminPlan(plan.id);
      toast.success('Plano excluído.');
      await loadPlans();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível excluir o plano.');
    }
  }

  return (
    <Dialog open={formOpen} onOpenChange={(open) => { if (!saving) setFormOpen(open); }}>
      <WebPageContainer size="wide" className="space-y-4 sm:space-y-6">
        <WebPageHeader title="Planos" description="Gerencie preços, limites e recursos das igrejas." actions={
          <DialogTrigger asChild>
            <Button disabled={saving} onClick={() => { setEditingId(null); setForm(emptyForm); }}><Plus className="mr-2 h-4 w-4" />Novo plano</Button>
          </DialogTrigger>
        } />

        <Card>
          <CardHeader><CardTitle>Planos cadastrados</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {loading ? <p role="status" className="text-sm text-muted-foreground">Carregando planos...</p> : loadError ? <div role="alert" className="space-y-3">
              <p className="text-sm text-muted-foreground">Não foi possível carregar os planos.</p>
              <Button type="button" variant="outline" onClick={() => void loadPlans()}>Tentar novamente</Button>
            </div> : <PlansWebTable plans={plans} onEdit={(plan) => { setEditingId(plan.id); setForm(formFromPlan(plan)); setFormOpen(true); }} onDelete={(plan) => void deletePlan(plan)} />}
          </CardContent>
        </Card>
      </WebPageContainer>
      <DialogContent className="flex max-h-[90dvh] flex-col gap-0 overflow-hidden p-0 min-[1025px]:max-w-3xl max-[1024px]:inset-x-0 max-[1024px]:bottom-0 max-[1024px]:top-auto max-[1024px]:w-full max-[1024px]:max-w-none max-[1024px]:translate-x-0 max-[1024px]:translate-y-0 max-[1024px]:rounded-b-none max-[1024px]:rounded-t-2xl">
        <DialogHeader className="shrink-0 border-b px-4 py-4 pr-10 text-left sm:px-6">
          <DialogTitle>{editingId ? 'Editar plano' : 'Novo plano'}</DialogTitle>
          <DialogDescription>Defina os limites e os recursos disponíveis. O código do plano fica fixo após a criação.</DialogDescription>
        </DialogHeader>
        <form onSubmit={savePlan} className="flex min-h-0 flex-col">
          <fieldset disabled={saving} className="grid min-h-0 min-w-0 gap-4 overflow-y-auto overscroll-contain px-4 py-4 sm:grid-cols-2 sm:px-6">
            <div className="space-y-2"><Label htmlFor="plan-code">Código</Label><Input id="plan-code" value={form.code} disabled={Boolean(editingId)} onChange={(event) => updateForm('code', event.target.value)} required /></div>
            <div className="space-y-2"><Label htmlFor="plan-name">Nome</Label><Input id="plan-name" value={form.name} onChange={(event) => updateForm('name', event.target.value)} required /></div>
            <div className="space-y-2 sm:col-span-2"><Label htmlFor="plan-description">Descrição</Label><Textarea id="plan-description" value={form.description} onChange={(event) => updateForm('description', event.target.value)} /></div>
            <div className="space-y-2"><Label htmlFor="plan-price">Preço mensal</Label><CurrencyInput id="plan-price" value={Number(form.priceCents) / 100} onValueChange={(value) => updateForm('priceCents', String(Math.round(value * 100)))} /></div>
            <div className="space-y-2"><Label htmlFor="plan-users">Máximo de usuários</Label><Input id="plan-users" type="number" min="0" placeholder="Ilimitado" value={form.maxUsers} onChange={(event) => updateForm('maxUsers', event.target.value)} /></div>
            <div className="space-y-2"><Label htmlFor="plan-storage">Armazenamento em MB</Label><Input id="plan-storage" type="number" min="0" placeholder="Ilimitado" value={form.maxStorageMb} onChange={(event) => updateForm('maxStorageMb', event.target.value)} /></div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Recursos liberados pelo plano</Label>
              <div className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-2">
                {PLAN_FEATURES.map((feature) => {
                  const checked = form.features.split(',').map((item) => item.trim()).includes(feature.key);
                  return <label key={feature.key} className="flex items-start gap-2 text-sm"><input type="checkbox" checked={checked} onChange={() => toggleFeature(feature.key)} /><span><span className="font-medium">{feature.label}</span><span className="block text-xs text-muted-foreground">{feature.description}</span></span></label>;
                })}
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.active} onChange={(event) => updateForm('active', event.target.checked)} /> Plano ativo</label>
          </fieldset>
          <div className="flex shrink-0 flex-col gap-2 border-t px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:flex-row sm:justify-end sm:px-6">
            <Button type="submit" disabled={saving}>{editingId ? <Check /> : <Plus />}{saving ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Criar plano'}</Button>
            <Button type="button" variant="outline" disabled={saving} onClick={() => setFormOpen(false)}><X /> Cancelar</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
