'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { parkingApi, type ParkingGroup, type ParkingMember, type ParkingSpot } from '../api/parking.api';
import { parkingFormSchema, type ParkingFormValues } from './parking-form.schema';
import { ParkingFormUI } from './parking-form-ui';

export function ParkingForm({ spot, groups, members, defaultGroupId, onSuccess }: { spot?: ParkingSpot; groups: ParkingGroup[]; members: ParkingMember[]; defaultGroupId?: string; onSuccess: () => void }) {
  const form = useForm<ParkingFormValues>({ resolver: zodResolver(parkingFormSchema), defaultValues: { groupId: spot?.groupId ?? defaultGroupId ?? '', label: spot?.label ?? '', status: spot?.status ?? 'free', occupiedByMemberId: spot?.occupiedByMemberId ?? '', occupiedByName: spot?.occupiedByName ?? '', notes: spot?.notes ?? '' } });
  const onSubmit = async (values: ParkingFormValues) => {
    try { const input = { ...values, occupiedAt: values.status === 'free' ? null : new Date().toISOString() }; if (spot) await parkingApi.update(spot.id, input); else await parkingApi.create(input); toast.success(spot ? 'Vaga atualizada.' : 'Vaga criada.'); onSuccess(); }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Erro ao salvar vaga.'); }
  };
  return <ParkingFormUI form={form} groups={groups} members={members} editing={Boolean(spot)} onSubmit={onSubmit} />;
}
