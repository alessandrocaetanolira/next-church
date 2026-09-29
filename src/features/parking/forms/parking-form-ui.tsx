'use client';
import type { UseFormReturn } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { ParkingGroup, ParkingMember } from '../api/parking.api';
import type { ParkingFormValues } from './parking-form.schema';

export function ParkingFormUI({ form, groups, members, editing, onSubmit }: { form: UseFormReturn<ParkingFormValues>; groups: ParkingGroup[]; members: ParkingMember[]; editing: boolean; onSubmit: (values: ParkingFormValues) => void | Promise<void> }) {
  const { register, setValue, watch, formState: { errors, isSubmitting } } = form;
  const error = (name: keyof ParkingFormValues) => errors[name]?.message ? <p className="text-xs text-destructive">{String(errors[name]?.message)}</p> : null;
  return <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
    <div className="space-y-2"><Label>Grupo</Label><Select value={watch('groupId')} onValueChange={(value) => setValue('groupId', value, { shouldValidate: true })}><SelectTrigger><SelectValue placeholder="Selecione um grupo" /></SelectTrigger><SelectContent>{groups.map((group) => <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>)}</SelectContent></Select>{error('groupId')}</div>
    <div className="space-y-2"><Label>Identificação da vaga</Label><Input {...register('label')} placeholder="Ex.: A-01" />{error('label')}</div>
    <div className="space-y-2"><Label>Status</Label><Select value={watch('status')} onValueChange={(value) => setValue('status', value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="free">Livre</SelectItem><SelectItem value="occupied">Ocupada</SelectItem></SelectContent></Select></div>
    {watch('status') !== 'free' ? <div className="space-y-2"><Label>Responsável</Label><Select value={watch('occupiedByMemberId')} onValueChange={(value) => setValue('occupiedByMemberId', value)}><SelectTrigger><SelectValue placeholder="Selecione um membro" /></SelectTrigger><SelectContent>{members.map((member) => <SelectItem key={member.id} value={member.id}>{member.name}</SelectItem>)}</SelectContent></Select></div> : null}
    <div className="space-y-2"><Label>Observações</Label><Textarea rows={3} {...register('notes')} /></div>
    <Button type="submit" className="w-full" disabled={isSubmitting}>{editing ? 'Salvar alterações' : 'Criar vaga'}</Button>
  </form>;
}
