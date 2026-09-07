'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface MemberFormProps {
  onSuccess: () => void;
  member?: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    parentPhone?: string | null;
    birthDate?: string | null;
    conversionDate?: string | null;
    baptismDate?: string | null;
    previousChurch?: string | null;
    aboutMe?: string | null;
    maritalStatus?: string | null;
    approved?: boolean;
  };
}

interface MemberFormState {
  name: string;
  email: string;
  phone: string;
  parentPhone: string;
  birthDate: string;
  conversionDate: string;
  baptismDate: string;
  previousChurch: string;
  aboutMe: string;
  maritalStatus: string;
  approved: string;
}

export function MemberForm({ onSuccess, member }: MemberFormProps) {
  const [formData, setFormData] = useState<MemberFormState>({
    name: member?.name ?? '',
    email: member?.email ?? '',
    phone: member?.phone ?? '',
    parentPhone: member?.parentPhone ?? '',
    birthDate: member?.birthDate ? member.birthDate.slice(0, 10) : '',
    conversionDate: member?.conversionDate ? member.conversionDate.slice(0, 10) : '',
    baptismDate: member?.baptismDate ? member.baptismDate.slice(0, 10) : '',
    previousChurch: member?.previousChurch ?? '',
    aboutMe: member?.aboutMe ?? '',
    maritalStatus: member?.maritalStatus ?? 'single',
    approved: member?.approved === false ? 'false' : 'true',
  });

  const updateField = <K extends keyof MemberFormState>(key: K, value: MemberFormState[K]) => {
    setFormData((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(member ? `/api/members/${member.id}` : '/api/members', {
      method: member ? 'PUT' : 'POST',
      body: JSON.stringify({
        ...formData,
        approved: formData.approved === 'true',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    if (res.ok) {
      toast.success(member ? 'Membro atualizado!' : 'Membro cadastrado!');
      onSuccess();
    } else {
      toast.error(member ? 'Erro ao atualizar membro' : 'Erro ao cadastrar membro');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Nome</Label>
        <Input required value={formData.name} onChange={e => updateField('name', e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Email</Label>
        <Input type="email" required value={formData.email} onChange={e => updateField('email', e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Telefone</Label>
        <Input required value={formData.phone} onChange={e => updateField('phone', e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Telefone do Responsável</Label>
        <Input value={formData.parentPhone} onChange={e => updateField('parentPhone', e.target.value)} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Nascimento</Label>
          <Input type="date" value={formData.birthDate} onChange={e => updateField('birthDate', e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Estado Civil</Label>
          <Select value={formData.maritalStatus} onValueChange={(value) => updateField('maritalStatus', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="single">Solteiro(a)</SelectItem>
              <SelectItem value="married">Casado(a)</SelectItem>
              <SelectItem value="divorced">Divorciado(a)</SelectItem>
              <SelectItem value="widowed">Viúvo(a)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Data de Conversão</Label>
          <Input type="date" value={formData.conversionDate} onChange={e => updateField('conversionDate', e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Data de Batismo</Label>
          <Input type="date" value={formData.baptismDate} onChange={e => updateField('baptismDate', e.target.value)} />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Igreja Anterior</Label>
        <Input value={formData.previousChurch} onChange={e => updateField('previousChurch', e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Sobre</Label>
        <Textarea rows={4} value={formData.aboutMe} onChange={e => updateField('aboutMe', e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Status do Cadastro</Label>
        <Select value={formData.approved} onValueChange={(value) => updateField('approved', value)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="true">Aprovado</SelectItem>
            <SelectItem value="false">Pendente</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" className="w-full">{member ? 'Salvar Alterações' : 'Salvar'}</Button>
    </form>
  );
}
