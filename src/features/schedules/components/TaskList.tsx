'use client';

import { useTasks } from '../hooks/use-tasks';
import { useTeams } from '../hooks/use-teams';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function TaskList() {
  const { tasks, isLoading: isLoadingTasks, deleteTask } = useTasks();
  const { teams, isLoading: isLoadingTeams } = useTeams();

  if (isLoadingTasks || isLoadingTeams) {
    return <div className="text-center py-8 text-muted-foreground">Carregando escalas...</div>;
  }

  if (tasks.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">Nenhuma tarefa agendada.</div>;
  }

  // Agrupar por data
  const groupedTasks = tasks.reduce((acc, task) => {
    const dateKey = format(new Date(task.date), 'yyyy-MM-dd');
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(task);
    return acc;
  }, {} as Record<string, typeof tasks>);

  return (
    <div className="space-y-6">
      {Object.entries(groupedTasks).map(([dateKey, dayTasks]) => (
        <div key={dateKey} className="space-y-2">
          <h3 className="font-semibold text-lg text-muted-foreground capitalize">
            {format(new Date(dateKey + 'T12:00:00'), "EEEE, d 'de' MMMM", { locale: ptBR })}
          </h3>
          <div className="grid gap-3">
            {dayTasks.map((task) => {
              const team = teams.find(t => t.id === task.teamId);
              return (
                <Card key={task.id} className="relative overflow-hidden">
                  <div 
                    className="absolute left-0 top-0 bottom-0 w-1.5" 
                    style={{ backgroundColor: team?.color || '#ccc' }} 
                  />
                  <CardContent className="p-4 pl-6 flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{task.title}</span>
                        {team && (
                          <Badge variant="outline" className="text-xs font-normal" style={{ borderColor: team.color, color: team.color }}>
                            {team.name}
                          </Badge>
                        )}
                      </div>
                      {task.description && (
                        <p className="text-sm text-muted-foreground line-clamp-1">{task.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(task.date), 'HH:mm')} • {task.type}
                      </p>
                    </div>
                    
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-muted-foreground hover:text-destructive h-8 w-8"
                      onClick={() => deleteTask(task.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
