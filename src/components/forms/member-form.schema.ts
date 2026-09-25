import { z } from 'zod';

export const memberFormSchema = z.object({
  name: z.string().trim().min(2, 'Informe o nome.'),
  email: z.string().trim().email('Informe um email válido.'),
  phone: z.string().trim().min(8, 'Informe um telefone válido.'),
  parentPhone: z.string().trim(),
  birthDate: z.string(),
  conversionDate: z.string(),
  baptismDate: z.string(),
  previousChurch: z.string().trim(),
  aboutMe: z.string().trim(),
  maritalStatus: z.enum(['single', 'married', 'divorced', 'widowed']),
  approved: z.enum(['true', 'false']),
});

export type MemberFormValues = z.infer<typeof memberFormSchema>;
