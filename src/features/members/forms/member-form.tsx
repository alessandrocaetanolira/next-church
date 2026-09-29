'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { membersApi } from '../api/members.api';
import { memberFormSchema, type MemberFormValues } from './member-form.schema';
import type { MemberFormMember } from './member-form.types';
import { MemberFormUI } from './member-form-ui';
import { maskPhone } from '@/lib/utils';

export function MemberForm({ onSuccess, member }: { onSuccess: () => void; member?: MemberFormMember }) {
  const form = useForm<MemberFormValues>({
    resolver: zodResolver(memberFormSchema),
    defaultValues: {
      name: member?.name ?? '', email: member?.email ?? '', phone: maskPhone(member?.phone), parentPhone: maskPhone(member?.parentPhone),
      birthDate: member?.birthDate?.slice(0, 10) ?? '', conversionDate: member?.conversionDate?.slice(0, 10) ?? '', baptismDate: member?.baptismDate?.slice(0, 10) ?? '',
      previousChurch: member?.previousChurch ?? '', aboutMe: member?.aboutMe ?? '', maritalStatus: (member?.maritalStatus as MemberFormValues['maritalStatus']) ?? 'single', approved: member?.approved === false ? 'false' : 'true',
    },
  });

  const onSubmit = async (values: MemberFormValues) => {
    try {
      const input = { ...values, approved: values.approved === 'true' };
      if (member) await membersApi.update(member.id, input); else await membersApi.create(input);
      toast.success(member ? 'Membro atualizado!' : 'Membro cadastrado!');
      onSuccess();
    } catch { toast.error(member ? 'Erro ao atualizar membro' : 'Erro ao cadastrar membro'); }
  };

  return <MemberFormUI form={form} editing={Boolean(member)} onSubmit={onSubmit} />;
}
