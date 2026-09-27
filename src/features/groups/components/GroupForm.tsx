'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { listMembers, createGroup, updateGroup } from '@/services/groups/groups-api';
import { toast } from 'sonner';

export type GroupType = 'ministry' | 'team' | 'social_project' | 'kids' | 'parking';
export type GroupCapability = 'fundraising' | 'enrollment' | 'communication' | 'scheduling' | 'checkin';
export type GroupFormValue = { name: string; description: string; type: GroupType; capabilities: GroupCapability[]; color: string; icon: string; members: Array<{ memberId: string; role: string }> };

type MemberOption = { id: string; name: string };

export const GROUP_TYPES: { value: GroupType; label: string }[] = [
  { value: 'team', label: 'Equipe' }, { value: 'ministry', label: 'Ministério' }, { value: 'social_project', label: 'Projeto Social' }, { value: 'kids', label: 'Infantil' }, { value: 'parking', label: 'Estacionamento' },
];
export const GROUP_CAPABILITIES: { value: GroupCapability; label: string }[] = [
  { value: 'fundraising', label: 'Arrecadação' }, { value: 'enrollment', label: 'Inscrição' }, { value: 'communication', label: 'Comunicação' }, { value: 'scheduling', label: 'Escala' }, { value: 'checkin', label: 'Check-in' },
];

export const emptyGroupForm = (): GroupFormValue => ({ name: '', description: '', type: 'team', capabilities: [], color: 'primary', icon: 'users', members: [] });

export function GroupForm({ initialValue, groupId, onSaved }: { initialValue?: GroupFormValue; groupId?: string; onSaved: (id?: string) => void }) {
  const [form, setForm] = useState<GroupFormValue>(initialValue ?? emptyGroupForm());
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setForm(initialValue ?? emptyGroupForm()); }, [initialValue]);
  useEffect(() => { void listMembers<MemberOption[]>().then((value) => setMembers(Array.isArray(value) ? value : [])).catch(() => toast.error('Não foi possível carregar os membros.')); }, []);

  const toggleCapability = (capability: GroupCapability) => setForm((current) => ({ ...current, capabilities: current.capabilities.includes(capability) ? current.capabilities.filter((item) => item !== capability) : [...current.capabilities, capability] }));
  const toggleMember = (memberId: string) => setForm((current) => ({ ...current, members: current.members.some((item) => item.memberId === memberId) ? current.members.filter((item) => item.memberId !== memberId) : [...current.members, { memberId, role: 'member' }] }));
  const setMemberRole = (memberId: string, role: string) => setForm((current) => ({ ...current, members: current.members.map((item) => item.memberId === memberId ? { ...item, role } : item) }));

  const save = async () => {
    if (!form.name.trim()) { toast.error('Nome é obrigatório.'); return; }
    setSaving(true);
    try {
      const payload = { ...form, name: form.name.trim(), description: form.description.trim() };
      const result = groupId ? await updateGroup(groupId, payload) : await createGroup(payload);
      toast.success(groupId ? 'Grupo atualizado.' : 'Grupo criado.');
      onSaved(typeof result === 'object' && result && 'id' in result ? String((result as { id: string }).id) : groupId);
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Não foi possível salvar o grupo.'); }
    finally { setSaving(false); }
  };

  return <div className="space-y-5 rounded-xl border border-border bg-card p-4 sm:p-6">
    <div className="space-y-2"><Label>Nome</Label><Input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Nome do grupo" /></div>
    <div className="space-y-2"><Label>Descrição</Label><Textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} rows={3} placeholder="Descreva a finalidade do grupo" /></div>
    <div className="space-y-2"><Label>Tipo</Label><Select value={form.type} onValueChange={(value) => setForm((current) => ({ ...current, type: value as GroupType }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{GROUP_TYPES.map((type) => <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>)}</SelectContent></Select></div>
    <div className="space-y-2"><Label>Capacidades</Label><div className="space-y-2 rounded-xl border border-border p-3">{GROUP_CAPABILITIES.map((capability) => <button key={capability.value} type="button" onClick={() => toggleCapability(capability.value)} className={cn('flex w-full items-center justify-between rounded-lg border px-3 py-2 text-sm', form.capabilities.includes(capability.value) ? 'border-primary bg-primary/5' : 'border-border')}><span>{capability.label}</span><Badge variant={form.capabilities.includes(capability.value) ? 'default' : 'outline'}>{form.capabilities.includes(capability.value) ? 'Ativa' : 'Inativa'}</Badge></button>)}</div></div>
    <div className="space-y-2"><Label>Membros</Label><div className="space-y-3 rounded-xl border border-border p-3">{members.map((member) => { const selected = form.members.some((item) => item.memberId === member.id); return <div key={member.id} className="space-y-2 rounded-lg border border-border p-3"><button type="button" onClick={() => toggleMember(member.id)} className="flex w-full items-center justify-between gap-3 text-sm"><span>{member.name}</span><Badge variant={selected ? 'default' : 'outline'}>{selected ? 'Selecionado' : 'Adicionar'}</Badge></button>{selected ? <Select value={form.members.find((item) => item.memberId === member.id)?.role ?? 'member'} onValueChange={(value) => setMemberRole(member.id, value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="member">Membro</SelectItem><SelectItem value="leader">Líder</SelectItem><SelectItem value="responsible">Responsável</SelectItem></SelectContent></Select> : null}</div>; })}</div></div>
    <Button className="w-full" onClick={() => void save()} disabled={saving}>{saving ? 'Salvando...' : groupId ? 'Salvar alterações' : 'Criar grupo'}</Button>
  </div>;
}
