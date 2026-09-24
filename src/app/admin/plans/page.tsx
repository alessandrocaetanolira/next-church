'use client';

import { useEffect, useState } from 'react';
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { PLAN_FEATURES } from '@/lib/plan-features';
import { createAdminPlan, deleteAdminPlan, listAdminPlans, updateAdminPlan, type AdminPlan } from '@/services/admin/plans-api';

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

  async function loadPlans() {
    try {
      setPlans(await listAdminPlans());
    } catch {
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
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Planos</h1>
        <p className="text-sm text-muted-foreground">Defina preços, limites e recursos disponíveis para cada tenant.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{editingId ? 'Editar plano' : 'Novo plano'}</CardTitle>
          <CardDescription>O código é usado por `Church.plan` e não pode ser alterado após a criação.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={savePlan} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2"><Label htmlFor="plan-code">Código</Label><Input id="plan-code" value={form.code} disabled={Boolean(editingId)} onChange={(event) => updateForm('code', event.target.value)} required /></div>
            <div className="space-y-2"><Label htmlFor="plan-name">Nome</Label><Input id="plan-name" value={form.name} onChange={(event) => updateForm('name', event.target.value)} required /></div>
            <div className="space-y-2 md:col-span-2"><Label htmlFor="plan-description">Descrição</Label><Textarea id="plan-description" value={form.description} onChange={(event) => updateForm('description', event.target.value)} /></div>
            <div className="space-y-2"><Label htmlFor="plan-price">Preço em centavos</Label><Input id="plan-price" type="number" min="0" value={form.priceCents} onChange={(event) => updateForm('priceCents', event.target.value)} /></div>
            <div className="space-y-2"><Label htmlFor="plan-users">Máximo de usuários</Label><Input id="plan-users" type="number" min="0" placeholder="Ilimitado" value={form.maxUsers} onChange={(event) => updateForm('maxUsers', event.target.value)} /></div>
            <div className="space-y-2"><Label htmlFor="plan-storage">Armazenamento em MB</Label><Input id="plan-storage" type="number" min="0" placeholder="Ilimitado" value={form.maxStorageMb} onChange={(event) => updateForm('maxStorageMb', event.target.value)} /></div>
            <div className="space-y-2 md:col-span-2">
              <Label>Recursos liberados pelo plano</Label>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 rounded-lg border p-3">
                {PLAN_FEATURES.map((feature) => {
                  const checked = form.features.split(',').map((item) => item.trim()).includes(feature.key);
                  return <label key={feature.key} className="flex items-start gap-2 text-sm"><input type="checkbox" checked={checked} onChange={() => toggleFeature(feature.key)} /><span><span className="font-medium">{feature.label}</span><span className="block text-xs text-muted-foreground">{feature.description}</span></span></label>;
                })}
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.active} onChange={(event) => updateForm('active', event.target.checked)} /> Plano ativo</label>
            <div className="flex gap-2 md:col-span-2">
              <Button type="submit" disabled={saving}>{editingId ? <Check /> : <Plus />}{saving ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Criar plano'}</Button>
              {editingId && <Button type="button" variant="outline" onClick={() => { setEditingId(null); setForm(emptyForm); }}><X /> Cancelar</Button>}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Planos cadastrados</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {loading ? <p className="text-sm text-muted-foreground">Carregando...</p> : plans.map((plan) => (
            <div key={plan.id} className="flex flex-col gap-3 rounded-lg border p-4 md:flex-row md:items-center md:justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2"><h2 className="font-semibold">{plan.name}</h2><Badge variant="outline">{plan.code}</Badge><Badge variant={plan.active ? 'success' : 'destructive'}>{plan.active ? 'Ativo' : 'Inativo'}</Badge></div>
                <p className="text-sm text-muted-foreground">{plan.description || 'Sem descrição.'}</p>
                <p className="text-xs text-muted-foreground">R$ {(plan.priceCents / 100).toFixed(2)} · {plan.maxUsers ?? 'Ilimitado'} usuários · {plan.churches} igreja(s) usando</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => { setEditingId(plan.id); setForm(formFromPlan(plan)); }}><Pencil /> Editar</Button>
                <Button variant="ghost" size="sm" className="text-destructive" onClick={() => void deletePlan(plan)} disabled={plan.churches > 0}><Trash2 /> Excluir</Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
