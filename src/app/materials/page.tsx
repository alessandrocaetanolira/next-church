'use client';

import { useEffect, useMemo, useState } from 'react';
import { useUIStore } from '@/features/ui/store';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTable, type Column } from '@/components/DataTable';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Minus, AlertTriangle, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ConfirmDeleteDialog, Notice, PageHeader, PageShell, SearchField } from '@/components/common';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { hasActionPermission, hasAnyActionPermission } from '@/lib/access-control';
import { createMaterial, deleteMaterial, listMaterials, updateMaterial, updateMaterialQuantity, type Material } from '@/services/materials/materials-api';

type MaterialItem = Material;

const categories = ['Limpeza', 'Cantina', 'Louvor', 'Escritório', 'Outros'];
const units = ['unidades', 'litros', 'kg', 'metros', 'caixas', 'pacotes', 'rolos', 'jogos'];

export default function MaterialsPage() {
  const setPageTitle = useUIStore((state) => state.setPageTitle);
  const { user } = useAuth();
  const canManage = hasActionPermission(user, 'materials', 'manage');
  const canCreate = canManage || hasActionPermission(user, 'materials', 'create');
  const canUpdate = canManage || hasActionPermission(user, 'materials', 'update');
  const canDelete = canManage || hasActionPermission(user, 'materials', 'delete');
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [search, setSearch] = useState('');
  const [editingMaterial, setEditingMaterial] = useState<MaterialItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', category: 'Outros', quantity: '0', minQuantity: '0', unit: 'unidades' });

  const fetchMaterials = async () => {
    try {
      const data = await listMaterials();
      setMaterials(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Erro ao carregar materiais.');
    }
  };

  useEffect(() => {
    setPageTitle('Materiais');
    void fetchMaterials();
  }, [setPageTitle]);

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
      await updateMaterialQuantity(material.id, quantity);
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
      const input = {
          name: form.name.trim(),
          category: form.category,
          quantity: Number(form.quantity) || 0,
          minQuantity: Number(form.minQuantity) || 0,
          unit: form.unit,
        };
      if (editingMaterial) await updateMaterial(editingMaterial.id, input);
      else await createMaterial(input);
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
      await deleteMaterial(deleteId);
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
          {canUpdate && <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => void updateQuantity(material, -1)}><Minus className="w-3 h-3" /></Button>}
          <span className="font-medium w-16 text-center">{material.quantity} {material.unit}</span>
          {canUpdate && <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => void updateQuantity(material, 1)}><Plus className="w-3 h-3" /></Button>}
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
    <PageShell>
      <PageHeader
        title="Materiais"
        description="Controle itens, quantidades mínimas e reposições por categoria."
        actions={
          <SearchField
            placeholder="Buscar materiais..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            containerClassName="w-full sm:w-80"
          />
        }
      />

      <div className="flex justify-end">
        {canCreate && <Button onClick={() => openDialog()}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Material
        </Button>}
      </div>

      {materials.some((material) => material.quantity <= material.minQuantity) ? (
        <Notice
          variant="destructive"
          icon={<AlertTriangle className="h-5 w-5" />}
          title="Estoque baixo"
          description={`${materials.filter((material) => material.quantity <= material.minQuantity).length} item(s) precisam de reposição.`}
        />
      ) : null}

      <DataTable
        data={filteredMaterials}
        columns={columns}
        pageSize={10}
        actions={(material) => (
          <div className="flex items-center gap-1">
            {canUpdate && <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openDialog(material)}>
              <Edit className="w-4 h-4" />
            </Button>}
            {canDelete && <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setDeleteId(material.id)}>
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>}
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
          </div>
        </DrawerContent>
      </Drawer>

      <ConfirmDeleteDialog
        open={Boolean(deleteId)}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null);
        }}
        onConfirm={() => void handleDelete()}
        title="Excluir material"
        description="O material será removido da listagem. Esta ação não pode ser desfeita."
      />
    </PageShell>
  );
}
