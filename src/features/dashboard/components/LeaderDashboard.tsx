'use client';

import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { StatCard } from '@/features/dashboard/components/StatCard';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle2, 
  Clock, 
  DollarSign, 
  AlertTriangle, 
  ShoppingCart, 
  Plus, 
  Users 
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { hasActionPermission } from '@/lib/access-control';

export function LeaderDashboard() {
  const router = useRouter();
  const { data: session } = useSession();
  const user = session?.user;
  const canOpenCanteen = hasActionPermission(user, 'canteen', 'operate') || hasActionPermission(user, 'canteen', 'sell');

  // Mock data for leader view
  // In a real implementation, this would come from `db` or API
  const stats = {
    completedTasks: 12,
    pendingTasks: 5,
    todaySales: 150.00,
    lowStock: 3
  };

  return (
    <div className="space-y-4 pb-20 sm:space-y-6">
      {/* Welcome Header */}
      <Card className="border-border bg-card p-4 sm:p-6">
        <h2 className="text-lg font-semibold">Olá, {user?.name?.split(' ')[0]} 👋</h2>
        <p className="text-muted-foreground text-sm mt-1">Aqui está o resumo das atividades da igreja.</p>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        {canOpenCanteen ? <Button variant="outline" className="h-20 flex-col gap-2 border-border bg-card hover:bg-muted/50" onClick={() => router.push('/cantina')}>
          <ShoppingCart className="w-6 h-6 text-primary" />
          <span className="text-sm font-medium">Abrir Cantina</span>
        </Button> : null}
        <Button variant="outline" className="h-20 flex-col gap-2 border-border bg-card hover:bg-muted/50" onClick={() => router.push('/schedules/new')}>
          <Plus className="w-6 h-6 text-success" />
          <span className="text-sm font-medium">Nova Tarefa</span>
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <StatCard 
          title="Concluídas" 
          value={stats.completedTasks} 
          icon={<CheckCircle2 className="w-5 h-5" />} 
          variant="success" 
        />
        <StatCard 
          title="Pendentes" 
          value={stats.pendingTasks} 
          icon={<Clock className="w-5 h-5" />} 
          variant="warning" 
        />
        <StatCard 
          title="Vendas Hoje" 
          value={`R$ ${stats.todaySales.toFixed(0)}`} 
          icon={<DollarSign className="w-5 h-5" />} 
          variant="info" 
        />
        <StatCard 
          title="Estoque baixo" 
          value={stats.lowStock} 
          icon={<AlertTriangle className="w-5 h-5" />} 
          variant="primary" // Using primary as alert variant not defined in StatCard yet
        />
      </div>

      {/* Recent Activity / Tasks (Placeholder) */}
      <div>
        <div className="mb-2 flex items-center justify-between sm:mb-4">
          <h3 className="font-semibold text-foreground">Próximas tarefas</h3>
          <Button variant="ghost" size="sm" className="text-primary" onClick={() => router.push('/schedules')}>
            Ver todas
          </Button>
        </div>
        
        <Card className="border-border border-dashed p-6 text-center text-muted-foreground sm:p-8">
          <CheckCircle2 className="w-12 h-12 mx-auto mb-2 opacity-20" />
          <p>Nenhuma tarefa pendente para hoje!</p>
        </Card>
      </div>
    </div>
  );
}
