'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { materialsApi, type Material } from '../api/materials.api';
import { materialFormSchema, type MaterialFormValues } from './material-form.schema';
import { MaterialFormUI } from './material-form-ui';

const categories = ['Limpeza', 'Cantina', 'Louvor', 'Escritório', 'Outros'];
const units = ['unidades', 'litros', 'kg', 'metros', 'caixas', 'pacotes', 'rolos', 'jogos'];

export function MaterialForm({ material, onSuccess }: { material?: Material; onSuccess: () => void }) {
  const form = useForm<MaterialFormValues>({
    resolver: zodResolver(materialFormSchema),
    defaultValues: { name: material?.name ?? '', category: material?.category ?? 'Outros', quantity: material?.quantity ?? 0, minQuantity: material?.minQuantity ?? 0, unit: material?.unit ?? 'unidades' },
  });
  const onSubmit = async (values: MaterialFormValues) => {
    try {
      if (material) await materialsApi.update(material.id, values); else await materialsApi.create(values);
      toast.success(material ? 'Material atualizado.' : 'Material criado.');
      onSuccess();
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Erro ao salvar material.'); }
  };
  return <MaterialFormUI form={form} editing={Boolean(material)} categories={categories} units={units} onSubmit={onSubmit} />;
}
