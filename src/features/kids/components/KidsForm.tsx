'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { createChild, updateChild, type KidsChild, type KidsGroupOption, type KidsMemberOption } from '@/services/kids/kids-api';
import { toast } from 'sonner';

export type KidsFormValue = Omit<KidsChild, 'id'> & { birthDate: string };
export const emptyKidsForm = (): KidsFormValue => ({ name: '', birthDate: '', parentMemberIds: [], allergies: '', medications: '', healthHistory: '', dietaryRestrictions: '', canDoPhysicalActivities: true, notes: '', groupIds: [] });

export function KidsForm({ child, members, groups, onSaved }: { child?: KidsChild | null; members: KidsMemberOption[]; groups: KidsGroupOption[]; onSaved: () => void }) {
  const [form, setForm] = useState<KidsFormValue>(child ? { ...emptyKidsForm(), ...child, birthDate: child.birthDate ? String(child.birthDate).slice(0, 10) : '' } : emptyKidsForm());
  const [saving, setSaving] = useState(false);
  const update = (updates: Partial<KidsFormValue>) => setForm((current) => ({ ...current, ...updates }));
  const save = async () => {
    if (!form.name.trim()) { toast.error('Nome é obrigatório.'); return; }
    setSaving(true);
    try {
      if (child) await updateChild(child.id, { ...form, name: form.name.trim() });
      else await createChild({ ...form, name: form.name.trim() });
      toast.success(child ? 'Cadastro infantil atualizado.' : 'Criança cadastrada.');
      onSaved();
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Erro ao salvar cadastro infantil.'); }
    finally { setSaving(false); }
  };
  return <div className="space-y-5 rounded-xl border border-border bg-card p-4 sm:p-6">
    <div className="space-y-2"><Label>Nome</Label><Input value={form.name} onChange={(event) => update({ name: event.target.value })} /></div>
    <div className="space-y-2"><Label>Nascimento</Label><Input type="date" value={form.birthDate} onChange={(event) => update({ birthDate: event.target.value })} /></div>
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2"><Label>Responsável principal</Label><Select value={form.parentMemberIds[0] ?? ''} onValueChange={(value) => update({ parentMemberIds: value ? [value] : [] })}><SelectTrigger><SelectValue placeholder="Selecione um responsável" /></SelectTrigger><SelectContent>{members.map((member) => <SelectItem key={member.id} value={member.id}>{member.name}</SelectItem>)}</SelectContent></Select></div>
      <div className="space-y-2"><Label>Grupo infantil</Label><Select value={form.groupIds[0] ?? ''} onValueChange={(value) => update({ groupIds: value ? [value] : [] })}><SelectTrigger><SelectValue placeholder="Selecione um grupo" /></SelectTrigger><SelectContent>{groups.map((group) => <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>)}</SelectContent></Select></div>
    </div>
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2"><Label>Alergias</Label><Textarea value={form.allergies ?? ''} onChange={(event) => update({ allergies: event.target.value })} rows={2} /></div>
      <div className="space-y-2"><Label>Medicações</Label><Textarea value={form.medications ?? ''} onChange={(event) => update({ medications: event.target.value })} rows={2} /></div>
      <div className="space-y-2"><Label>Histórico relevante</Label><Textarea value={form.healthHistory ?? ''} onChange={(event) => update({ healthHistory: event.target.value })} rows={2} /></div>
      <div className="space-y-2"><Label>Restrições alimentares</Label><Textarea value={form.dietaryRestrictions ?? ''} onChange={(event) => update({ dietaryRestrictions: event.target.value })} rows={2} /></div>
    </div>
    <div className="space-y-2"><Label>Atividades físicas</Label><Select value={form.canDoPhysicalActivities ? 'yes' : 'no'} onValueChange={(value) => update({ canDoPhysicalActivities: value === 'yes' })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="yes">Pode participar</SelectItem><SelectItem value="no">Possui restrição</SelectItem></SelectContent></Select></div>
    <div className="space-y-2"><Label>Observações</Label><Textarea value={form.notes ?? ''} onChange={(event) => update({ notes: event.target.value })} rows={3} /></div>
    <Button className="w-full" onClick={() => void save()} disabled={saving}>{saving ? 'Salvando...' : child ? 'Salvar alterações' : 'Cadastrar criança'}</Button>
  </div>;
}
