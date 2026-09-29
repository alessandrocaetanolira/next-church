import { z } from 'zod';

export const parkingFormSchema = z.object({
  groupId: z.string().min(1, 'Selecione o grupo.'),
  label: z.string().trim().min(1, 'Informe a identificação da vaga.'),
  status: z.string().min(1),
  occupiedByMemberId: z.string(),
  occupiedByName: z.string(),
  notes: z.string(),
});
export type ParkingFormValues = z.infer<typeof parkingFormSchema>;
