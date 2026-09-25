'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { createMember, updateMember } from '@/services/members/members-api';
import { memberFormSchema, type MemberFormValues } from './member-form.schema';
import { MemberFormUI } from './MemberFormUI';

export interface MemberFormMember {
  id: string; name: string; email?: string; phone?: string; parentPhone?: string | null;
  birthDate?: string | null; conversionDate?: string | null; baptismDate?: string | null;
  previousChurch?: string | null; aboutMe?: string | null; maritalStatus?: string | null; approved?: boolean;
}

export function MemberForm({ onSuccess, member }: { onSuccess: () => void; member?: MemberFormMember }) {
  const form = useForm<MemberFormValues>({
    resolver: zodResolver(memberFormSchema),
    defaultValues: {
      name: member?.name ?? '', email: member?.email ?? '', phone: member?.phone ?? '', parentPhone: member?.parentPhone ?? '',
      birthDate: member?.birthDate?.slice(0, 10) ?? '', conversionDate: member?.conversionDate?.slice(0, 10) ?? '', baptismDate: member?.baptismDate?.slice(0, 10) ?? '',
      previousChurch: member?.previousChurch ?? '', aboutMe: member?.aboutMe ?? '', maritalStatus: (member?.maritalStatus as MemberFormValues['maritalStatus']) ?? 'single', approved: member?.approved === false ? 'false' : 'true',
    },
  });

  const onSubmit = async (values: MemberFormValues) => {
    try {
      const input = { ...values, approved: values.approved === 'true' };
      if (member) await updateMember(member.id, input); else await createMember(input);
      toast.success(member ? 'Membro atualizado!' : 'Membro cadastrado!');
      onSuccess();
    } catch { toast.error(member ? 'Erro ao atualizar membro' : 'Erro ao cadastrar membro'); }
  };

  return <MemberFormUI form={form} editing={Boolean(member)} onSubmit={onSubmit} />;
}
