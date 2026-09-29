import { z } from 'zod';

export const materialFormSchema = z.object({
  name: z.string().trim().min(2, 'Informe o nome.'),
  category: z.string().trim().min(1, 'Informe a categoria.'),
  quantity: z.number().int().min(0, 'Quantidade inválida.'),
  minQuantity: z.number().int().min(0, 'Quantidade mínima inválida.'),
  unit: z.string().trim().min(1, 'Informe a unidade.'),
});

export type MaterialFormValues = z.infer<typeof materialFormSchema>;
