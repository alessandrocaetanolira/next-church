'use client';

import type { UseFormReturn } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { MemberFormValues } from './member-form.schema';

export function MemberFormUI({ form, editing, onSubmit }: { form: UseFormReturn<MemberFormValues>; editing: boolean; onSubmit: (values: MemberFormValues) => void | Promise<void> }) {
  const { register, setValue, watch, formState: { errors, isSubmitting } } = form;
  const fieldError = (name: keyof MemberFormValues) => errors[name]?.message ? <p className="text-xs text-destructive">{String(errors[name]?.message)}</p> : null;
  return <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
    <div className="space-y-2"><Label>Nome</Label><Input {...register('name')} />{fieldError('name')}</div>
    <div className="space-y-2"><Label>Email</Label><Input type="email" {...register('email')} />{fieldError('email')}</div>
    <div className="space-y-2"><Label>Telefone</Label><Input {...register('phone')} />{fieldError('phone')}</div>
    <div className="space-y-2"><Label>Telefone do Responsável</Label><Input {...register('parentPhone')} /></div>
    <div className="grid gap-4 md:grid-cols-2"><div className="space-y-2"><Label>Nascimento</Label><Input type="date" {...register('birthDate')} /></div><div className="space-y-2"><Label>Estado Civil</Label><Select value={watch('maritalStatus')} onValueChange={(value) => setValue('maritalStatus', value as MemberFormValues['maritalStatus'], { shouldValidate: true })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="single">Solteiro(a)</SelectItem><SelectItem value="married">Casado(a)</SelectItem><SelectItem value="divorced">Divorciado(a)</SelectItem><SelectItem value="widowed">Viúvo(a)</SelectItem></SelectContent></Select></div></div>
    <div className="grid gap-4 md:grid-cols-2"><div className="space-y-2"><Label>Data de Conversão</Label><Input type="date" {...register('conversionDate')} /></div><div className="space-y-2"><Label>Data de Batismo</Label><Input type="date" {...register('baptismDate')} /></div></div>
    <div className="space-y-2"><Label>Igreja Anterior</Label><Input {...register('previousChurch')} /></div>
    <div className="space-y-2"><Label>Sobre</Label><Textarea rows={4} {...register('aboutMe')} /></div>
    <div className="space-y-2"><Label>Status do Cadastro</Label><Select value={watch('approved')} onValueChange={(value) => setValue('approved', value as MemberFormValues['approved'], { shouldValidate: true })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="true">Aprovado</SelectItem><SelectItem value="false">Pendente</SelectItem></SelectContent></Select></div>
    <Button type="submit" className="w-full" disabled={isSubmitting}>{editing ? 'Salvar Alterações' : 'Salvar'}</Button>
  </form>;
}
