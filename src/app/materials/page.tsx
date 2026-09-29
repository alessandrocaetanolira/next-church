'use client';

import { useEffect, useMemo, useState } from 'react';
import { useUIStore } from '@/features/ui/store';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Plus, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmDeleteDialog, Notice, PageHeader, SearchField } from '@/components/common';
import { WebPageLayout } from '@/components/shared/web';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { hasActionPermission, hasAnyActionPermission } from '@/lib/access-control';
import { materialsApi, type Material } from '@/features/materials/api/materials.api';
import { MaterialFormCreate, MaterialFormEdit } from '@/features/materials/forms';
import { MaterialsWebTable } from '@/features/materials/components/MaterialsWebTable';

type MaterialItem = Material;

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

  const fetchMaterials = async () => {
    try {
      const data = await materialsApi.list();
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

  const updateQuantity = async (material: MaterialItem, delta: number) => {
    const quantity = Math.max(0, material.quantity + delta);
    try {
      await materialsApi.updateQuantity(material.id, quantity);
      await fetchMaterials();
      toast.success('Quantidade atualizada.');
    } catch {
      toast.error('Erro ao atualizar material.');
    }
  };

  const openDialog = (material?: MaterialItem) => {
    setEditingMaterial(material ?? null);
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await materialsApi.remove(deleteId);
      setDeleteId(null);
      await fetchMaterials();
      toast.success('Material removido.');
    } catch {
      toast.error('Erro ao excluir material.');
    }
  };

  return (
    <WebPageLayout>
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

      <MaterialsWebTable
        materials={filteredMaterials}
        canUpdate={canUpdate}
        canDelete={canDelete}
        onUpdateQuantity={(material, delta) => void updateQuantity(material, delta)}
        onEdit={openDialog}
        onDelete={setDeleteId}
      />

      <Drawer open={dialogOpen} onOpenChange={setDialogOpen}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader>
            <DrawerTitle>{editingMaterial ? 'Editar Material' : 'Novo Material'}</DrawerTitle>
          </DrawerHeader>
          <div className="overflow-y-auto px-4 pb-6">
            {editingMaterial
              ? <MaterialFormEdit material={editingMaterial} onSuccess={() => { setDialogOpen(false); setEditingMaterial(null); void fetchMaterials(); }} />
              : <MaterialFormCreate onSuccess={() => { setDialogOpen(false); void fetchMaterials(); }} />}
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
    </WebPageLayout>
  );
}
