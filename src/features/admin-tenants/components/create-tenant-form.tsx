'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function CreateTenantForm({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const onSubmit = async (data: any) => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(err || 'Erro ao criar igreja');
      }

      toast.success('Igreja criada e banco provisionado com sucesso!');
      reset();
      setOpen(false);
      onCreated();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Nova Igreja
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Criar Nova Igreja</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Nome da Igreja</Label>
            <Input id="name" placeholder="Ex: Igreja Central" {...register('name', { required: true })} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="slug">Slug (Identificador na URL)</Label>
            <Input
              id="slug"
              placeholder="ex: igreja-central"
              {...register('slug', {
                required: true,
                pattern: /^[a-z0-9-]+$/,
                onChange: (event) => {
                  event.target.value = normalizeSlug(event.target.value);
                },
              })}
            />
            <p className="text-[10px] text-muted-foreground">Apenas letras minúsculas, números e hifens.</p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="adminEmail">Email do Administrador</Label>
            <Input id="adminEmail" type="email" placeholder="admin@igreja.com" {...register('adminEmail', { required: true })} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="adminPassword">Senha Inicial</Label>
            <Input id="adminPassword" type="password" {...register('adminPassword', { required: true, minLength: 6 })} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? 'Provisionando...' : 'Criar Igreja'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
