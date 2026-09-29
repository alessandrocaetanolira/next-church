'use client';

import { AlertTriangle, Edit, Minus, Plus, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { WebDataTable, type Column } from '@/components/shared/web';
import type { Material } from '@/features/materials/api/materials.api';

type StockStatus = 'destructive' | 'warning' | 'success';

interface MaterialsWebTableProps {
  materials: Material[];
  canUpdate: boolean;
  canDelete: boolean;
  onUpdateQuantity: (material: Material, delta: number) => void;
  onEdit: (material: Material) => void;
  onDelete: (id: string) => void;
}

export function MaterialsWebTable({
  materials,
  canUpdate,
  canDelete,
  onUpdateQuantity,
  onEdit,
  onDelete,
}: MaterialsWebTableProps) {
  const getStockStatus = (material: Material): { color: StockStatus; label: string } => {
    const ratio = material.minQuantity > 0 ? material.quantity / material.minQuantity : material.quantity;
    if (ratio <= 1) return { color: 'destructive', label: 'Baixo' };
    if (ratio <= 2) return { color: 'warning', label: 'Atenção' };
    return { color: 'success', label: 'OK' };
  };

  const columns: Column<Material>[] = [
    { key: 'name', header: 'Nome', render: (material) => <div><p className="font-medium">{material.name}</p><p className="text-sm text-muted-foreground">{material.category}</p></div> },
    {
      key: 'quantity',
      header: 'Quantidade',
      render: (material) => (
        <div className="flex items-center gap-2">
          {canUpdate && <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onUpdateQuantity(material, -1)}><Minus className="h-3 w-3" /></Button>}
          <span className="w-16 text-center font-medium">{material.quantity} {material.unit}</span>
          {canUpdate && <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onUpdateQuantity(material, 1)}><Plus className="h-3 w-3" /></Button>}
        </div>
      ),
    },
    { key: 'minQuantity', header: 'Mínimo', render: (material) => <span>{material.minQuantity} {material.unit}</span> },
    {
      key: 'status',
      header: 'Status',
      render: (material) => {
        const status = getStockStatus(material);
        return <Badge variant={status.color}>{status.label}</Badge>;
      },
    },
  ];

  return (
    <WebDataTable
      data={materials}
      columns={columns}
      pageSize={10}
      actions={(material) => (
        <div className="flex items-center gap-1">
          {canUpdate && <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onEdit(material)}><Edit className="h-4 w-4" /></Button>}
          {canDelete && <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onDelete(material.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
        </div>
      )}
    />
  );
}
