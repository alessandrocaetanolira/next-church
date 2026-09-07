'use client';

import { useEffect, useMemo, useState } from 'react';
import { useUIStore } from '@/features/ui/store';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTable, type Column } from '@/components/DataTable';
import { Card, CardContent } from '@/components/ui/card';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Minus, Package, AlertTriangle, Edit, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type MaterialItem = {
  id: string;
  name: string;
  category: string;
  quantity: number;
  minQuantity: number;
  unit: string;
};

const categories = ['Limpeza', 'Cantina', 'Louvor', 'Escritório', 'Outros'];
const units = ['unidades', 'litros', 'kg', 'metros', 'caixas', 'pacotes', 'rolos', 'jogos'];

export default function MaterialsPage() {
  const setPageTitle = useUIStore((state) => state.setPageTitle);
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [search, setSearch] = useState('');
  const [editingMaterial, setEditingMaterial] = useState<MaterialItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', category: 'Outros', quantity: '0', minQuantity: '0', unit: 'unidades' });

  useEffect(() => {
    setPageTitle('Materiais');
    void fetchMaterials();
  }, [setPageTitle]);

  const fetchMaterials = async () => {
    try {
      const response = await fetch('/api/materials');
      if (!response.ok) throw new Error();
      const data = await response.json();
      setMaterials(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Erro ao carregar materiais.');
    }
  };

  const filteredMaterials = useMemo(
    () => materials.filter((material) => material.name.toLowerCase().includes(search.toLowerCase()) || material.category.toLowerCase().includes(search.toLowerCase())),
    [materials, search]
  );

  const getStockStatus = (material: MaterialItem) => {
    const ratio = material.minQuantity > 0 ? material.quantity / material.minQuantity : material.quantity;
    if (ratio <= 1) return { color: 'destructive', label: 'Baixo' };
    if (ratio <= 2) return { color: 'warning', label: 'Atenção' };
    return { color: 'success', label: 'OK' };
  };

  const updateQuantity = async (material: MaterialItem, delta: number) => {
    const quantity = Math.max(0, material.quantity + delta);
    try {
      const response = await fetch(`/api/materials/${material.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity }),
      });
      if (!response.ok) throw new Error();
      await fetchMaterials();
      toast.success('Quantidade atualizada.');
    } catch {
      toast.error('Erro ao atualizar material.');
    }
  };

  const openDialog = (material?: MaterialItem) => {
    setEditingMaterial(material ?? null);
    setForm({
      name: material?.name ?? '',
      category: material?.category ?? 'Outros',
      quantity: String(material?.quantity ?? 0),
      minQuantity: String(material?.minQuantity ?? 0),
      unit: material?.unit ?? 'unidades',
    });
    setDialogOpen(true);
  };

  const saveMaterial = async () => {
    if (!form.name.trim()) {
      toast.error('Nome é obrigatório.');
      return;
    }

    try {
      const response = await fetch(editingMaterial ? `/api/materials/${editingMaterial.id}` : '/api/materials', {
        method: editingMaterial ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          category: form.category,
          quantity: Number(form.quantity) || 0,
          minQuantity: Number(form.minQuantity) || 0,
          unit: form.unit,
        }),
      });
      if (!response.ok) throw new Error();
      setDialogOpen(false);
      setEditingMaterial(null);
      await fetchMaterials();
      toast.success(editingMaterial ? 'Material atualizado.' : 'Material criado.');
    } catch {
      toast.error('Erro ao salvar material.');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const response = await fetch(`/api/materials/${deleteId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error();
      setDeleteId(null);
      await fetchMaterials();
      toast.success('Material removido.');
    } catch {
      toast.error('Erro ao excluir material.');
    }
  };

  const columns: Column<MaterialItem>[] = [
    { key: 'name', header: 'Nome', render: (material) => <div><p className="font-medium">{material.name}</p><p className="text-sm text-muted-foreground">{material.category}</p></div> },
    {
      key: 'quantity',
      header: 'Quantidade',
      render: (material) => (
        <div className="flex items-center gap-2">
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => void updateQuantity(material, -1)}><Minus className="w-3 h-3" /></Button>
          <span className="font-medium w-16 text-center">{material.quantity} {material.unit}</span>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => void updateQuantity(material, 1)}><Plus className="w-3 h-3" /></Button>
        </div>
      ),
    },
    { key: 'minQuantity', header: 'Mínimo', render: (material) => <span>{material.minQuantity} {material.unit}</span> },
    {
      key: 'status',
      header: 'Status',
      render: (material) => {
        const status = getStockStatus(material);
        return <Badge variant={status.color === 'success' ? 'default' : 'destructive'} className={cn(status.color === 'warning' && 'bg-amber-500 text-white', status.color === 'success' && 'bg-green-600 text-white')}>{status.label}</Badge>;
      },
    },
  ];

  return (
    <div className="p-4 space-y-4 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar materiais..." value={search} onChange={(event) => setSearch(event.target.value)} className="pl-9" />
        </div>
        <Button onClick={() => openDialog()}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Material
        </Button>
      </div>

      {materials.some((material) => material.quantity <= material.minQuantity) ? (
        <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-destructive" />
          <div>
            <p className="font-medium text-destructive">Estoque baixo!</p>
            <p className="text-sm text-muted-foreground">{materials.filter((material) => material.quantity <= material.minQuantity).length} item(s) precisam de reposição</p>
          </div>
        </div>
      ) : null}

      <DataTable
        data={filteredMaterials}
        columns={columns}
        pageSize={10}
        actions={(material) => (
          <div className="flex items-center gap-1">
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openDialog(material)}>
              <Edit className="w-4 h-4" />
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setDeleteId(material.id)}>
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </div>
        )}
      />

      <Drawer open={dialogOpen} onOpenChange={setDialogOpen}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader>
            <DrawerTitle>{editingMaterial ? 'Editar Material' : 'Novo Material'}</DrawerTitle>
          </DrawerHeader>
          <div className="space-y-4 overflow-y-auto px-4 pb-6">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Nome do material" />
            </div>
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={form.category} onValueChange={(value) => setForm((current) => ({ ...current, category: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{categories.map((category) => <SelectItem key={category} value={category}>{category}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Quantidade</Label>
                <Input type="number" min="0" value={form.quantity} onChange={(event) => setForm((current) => ({ ...current, quantity: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Qtd Mínima</Label>
                <Input type="number" min="0" value={form.minQuantity} onChange={(event) => setForm((current) => ({ ...current, minQuantity: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Unidade</Label>
                <Select value={form.unit} onValueChange={(value) => setForm((current) => ({ ...current, unit: value }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{units.map((unit) => <SelectItem key={unit} value={unit}>{unit}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <Button className="w-full" onClick={saveMaterial}>
              {editingMaterial ? 'Salvar Alterações' : 'Criar Material'}
            </Button>
            {deleteId ? (
              <Button variant="destructive" className="w-full" onClick={() => void handleDelete()}>
                Excluir
              </Button>
            ) : null}
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
