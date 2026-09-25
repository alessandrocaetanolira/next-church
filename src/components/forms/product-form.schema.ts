import { z } from 'zod';

export const productFormSchema = z.object({
  name: z.string().trim().min(2, 'Informe o nome.'),
  description: z.string().trim(), imageUrl: z.string(),
  price: z.number().min(0, 'Preço inválido.'), cost: z.number().min(0, 'Custo inválido.'),
  stock: z.number().int().min(0, 'Estoque inválido.'), minStock: z.number().int().min(0, 'Estoque mínimo inválido.'),
  category: z.string().trim().min(1, 'Informe a categoria.'), active: z.boolean(), availableToday: z.boolean(),
});
export type ProductFormValues = z.infer<typeof productFormSchema>;
