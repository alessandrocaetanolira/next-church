'use client';
import { Card } from '@/components/ui/card';

export function SummaryCards({ stats }: { stats: { members: number, sales: number, tasks: number } }) {
  return (
    <Card className="animate__animated animate__zoomIn border-border bg-card p-3 sm:p-4">
      <div className="grid grid-cols-3 gap-2 text-center sm:gap-3">
        <div>
          <p className="text-lg font-bold text-foreground">{stats.members}</p>
          <p className="text-[10px] text-muted-foreground sm:text-xs">Membros</p>
        </div>
        <div>
          <p className="text-lg font-bold text-foreground">{stats.sales}</p>
          <p className="text-[10px] text-muted-foreground sm:text-xs">Vendas de hoje</p>
        </div>
        <div>
          <p className="text-lg font-bold text-foreground">{stats.tasks}</p>
          <p className="text-[10px] text-muted-foreground sm:text-xs">Escalas</p>
        </div>
      </div>
    </Card>
  );
}
