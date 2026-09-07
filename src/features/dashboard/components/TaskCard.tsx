/**
 * features/dashboard/components/TaskCard.tsx
 * 
 * Componente de cartão de tarefa/escala.
 * Exibe informações sobre a tarefa, status, tipo e membros atribuídos.
 * Suporta interações de swipe para ações rápidas.
 * 
 * @param {TaskCardProps} props - Propriedades do componente.
 * @returns {JSX.Element} Cartão de Tarefa estilizado.
 */

"use client";

import { useAuth } from '@/features/auth/hooks/useAuth';
import { SwipeableCard } from './SwipeableCard';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Calendar, Lock } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

/** Representação da tarefa conforme o modelo de negócio */
interface Task {
  id: string;
  title: string;
  description: string;
  teamId: string;
  assignedTo: string[];
  date: string | Date;
  status: 'pending' | 'in_progress' | 'completed';
  type: 'cleaning' | 'canteen' | 'band' | 'other' | string;
}

/** Propriedades do TaskCard */
interface TaskCardProps {
  /** Objeto da tarefa */
  task: Task;
  /** Callback para marcar como concluída */
  onComplete?: () => void;
  /** Callback para exclusão */
  onDelete?: () => void;
  /** Callback para edição */
  onEdit?: () => void;
}

/** Cores de status baseadas nas variáveis de luz do Design System */
const statusColors: Record<string, string> = {
  pending: 'bg-warning-light text-warning border-warning/20',
  in_progress: 'bg-info-light text-info border-info/20',
  completed: 'bg-success-light text-success border-success/20',
};

const statusLabels: Record<string, string> = {
  pending: 'Pendente',
  in_progress: 'Em andamento',
  completed: 'Concluído',
};

/** Cores por tipo de tarefa */
const typeColors: Record<string, string> = {
  cleaning: 'bg-success text-success-foreground',
  canteen: 'bg-warning text-warning-foreground',
  band: 'bg-primary text-primary-foreground',
  other: 'bg-muted text-muted-foreground',
};

const typeLabels: Record<string, string> = {
  cleaning: 'Limpeza',
  canteen: 'Cantina',
  band: 'Louvor',
  other: 'Outros',
};

/**
 * TaskCard Component
 */
export function TaskCard({ task, onComplete, onDelete, onEdit }: TaskCardProps) {
  const { user } = useAuth();
  
  // Verificação de permissão: admin ou se o usuário está atribuído à tarefa
  const isAdmin = user?.role === 'ADMIN';
  const isAssigned = user?.id ? task.assignedTo.includes(user.id) : false;
  const canModify = isAdmin || isAssigned;

  return (
    <SwipeableCard
      onComplete={canModify ? onComplete : undefined}
      onDelete={isAdmin ? onDelete : undefined}
      onEdit={isAdmin ? onEdit : undefined}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Badge className={cn('text-[10px] h-5 px-2 font-bold uppercase', typeColors[task.type] || typeColors.other)}>
                {typeLabels[task.type] || task.type}
              </Badge>
              <Badge variant="outline" className={cn('text-[10px] h-5 px-2 font-bold uppercase', statusColors[task.status])}>
                {statusLabels[task.status]}
              </Badge>
              {!canModify && (
                <Lock className="w-3 h-3 text-muted-foreground ml-1" />
              )}
            </div>
            <h3 className="font-bold text-foreground truncate leading-tight">{task.title}</h3>
            <p className="text-xs text-muted-foreground line-clamp-2 mt-1 leading-relaxed">
              {task.description}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/50">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
            <Calendar className="w-3.5 h-3.5" />
            <span>{format(new Date(task.date), "dd 'de' MMM", { locale: ptBR })}</span>
          </div>

          <div className="flex items-center -space-x-2">
            {/* Placeholder para membros (Será alimentado via props futuramente se necessário) */}
            <Avatar className="w-6 h-6 border-2 border-card shadow-sm">
              <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-bold">
                +
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </div>
    </SwipeableCard>
  );
}
