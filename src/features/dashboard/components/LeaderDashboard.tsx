'use client';

import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { StatCard } from '@/features/dashboard/components/StatCard';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle2, 
  Clock, 
  DollarSign, 
  AlertTriangle, 
  ShoppingCart, 
  Plus
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { hasActionPermission } from '@/lib/access-control';
import { useDashboardSummary } from '../hooks/use-dashboard-summary';

export function LeaderDashboard() {
  const router = useRouter();
  const { data: session } = useSession();
  const user = session?.user;
  const canOpenCanteen = hasActionPermission(user, 'canteen', 'operate') || hasActionPermission(user, 'canteen', 'sell');
  const canCreateTasks = hasActionPermission(user, 'tasks', 'create');
  const { summary, loading } = useDashboardSummary();

  return (
    <div className="space-y-4 pb-20 sm:space-y-6">
      {/* Welcome Header */}
      <Card className="animate__animated animate__zoomIn border-border bg-card p-4 sm:p-6">
        <h2 className="text-lg font-semibold">Olá, {user?.name?.split(' ')[0]} 👋</h2>
        <p className="text-muted-foreground text-sm mt-1">Aqui está o resumo das atividades da igreja.</p>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        {canOpenCanteen ? <Button variant="outline" className="animate__animated animate__zoomIn h-20 flex-col gap-2 border-border bg-card hover:bg-muted/50" onClick={() => router.push('/cantina')}>
          <ShoppingCart className="w-6 h-6 text-primary" />
          <span className="text-sm font-medium">Abrir Cantina</span>
        </Button> : null}
        {canCreateTasks ? <Button variant="outline" className="animate__animated animate__zoomIn h-20 flex-col gap-2 border-border bg-card hover:bg-muted/50" onClick={() => router.push('/schedules/new')}>
          <Plus className="w-6 h-6 text-success" />
          <span className="text-sm font-medium">Nova Tarefa</span>
        </Button> : null}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        {summary?.tasks ? <StatCard
          title="Concluídas hoje"
          value={summary.tasks.completedToday}
          icon={<CheckCircle2 className="w-5 h-5" />}
          variant="success"
        /> : null}
        {summary?.tasks ? <StatCard
          title="Pendentes hoje"
          value={summary.tasks.pendingToday}
          icon={<Clock className="w-5 h-5" />}
          variant="warning"
        /> : null}
        {summary?.canteen ? <StatCard
          title="Vendas Hoje"
          value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(summary.canteen.salesToday)}
          icon={<DollarSign className="w-5 h-5" />}
          variant="info"
        /> : null}
        {summary?.canteen ? <StatCard
          title="Estoque baixo"
          value={summary.canteen.lowStock}
          icon={<AlertTriangle className="w-5 h-5" />}
          variant="primary"
        /> : null}
        {loading ? <Card className="col-span-2 border-border p-4 text-center text-sm text-muted-foreground">Atualizando resumo…</Card> : null}
      </div>

      {/* Recent Activity / Tasks (Placeholder) */}
      {summary?.tasks ? <div>
        <div className="mb-2 flex items-center justify-between sm:mb-4">
          <h3 className="font-semibold text-foreground">Próximas tarefas</h3>
          <Button variant="ghost" size="sm" className="text-primary" onClick={() => router.push('/schedules')}>
            Ver todas
          </Button>
        </div>
        
        {summary.tasks.upcoming.length === 0 ? <Card className="animate__animated animate__zoomIn border-border border-dashed p-6 text-center text-muted-foreground sm:p-8">
          <CheckCircle2 className="w-12 h-12 mx-auto mb-2 opacity-20" />
          <p>Nenhuma tarefa pendente para hoje!</p>
        </Card> : <div className="space-y-2">
          {summary.tasks.upcoming.map((task) => <Card key={task.id} className="border-border p-3">
            <p className="truncate text-sm font-medium text-foreground">{task.title}</p>
            <p className="mt-1 text-xs text-muted-foreground">{format(new Date(task.date), "dd 'de' MMM, HH:mm", { locale: ptBR })}</p>
          </Card>)}
        </div>}
      </div> : null}
    </div>
  );
}
