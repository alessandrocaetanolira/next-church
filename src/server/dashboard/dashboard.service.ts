import type { TaskScope } from '@/server/tasks/tasks.policy';
import { DashboardRepository } from './dashboard.repository';

export function saoPauloDayRange(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now);
  const value = (type: string) => parts.find((part) => part.type === type)?.value;
  const date = `${value('year')}-${value('month')}-${value('day')}`;
  const start = new Date(`${date}T00:00:00-03:00`);
  return { start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000) };
}

export class DashboardService {
  constructor(private readonly repository: DashboardRepository) {}

  async getSummary(input: { taskScope: TaskScope | null; includeCanteen: boolean }, now = new Date()) {
    const range = saoPauloDayRange(now);
    const teamIds = input.taskScope && !input.taskScope.hasGlobalAccess
      ? input.taskScope.accessibleTeamIds
      : undefined;

    const tasks = input.taskScope?.allowed
      ? await Promise.all([
        this.repository.countCompletedTasks(range, teamIds),
        this.repository.countPendingTasks(range, teamIds),
        this.repository.listUpcomingTasks(range.start, teamIds),
      ]).then(([completedToday, pendingToday, upcoming]) => ({
        completedToday,
        pendingToday,
        upcoming: upcoming.map((task) => ({ ...task, date: task.date.toISOString() })),
      }))
      : null;

    const canteen = input.includeCanteen
      ? await Promise.all([this.repository.sumSales(range), this.repository.countLowStockProducts()])
        .then(([salesToday, lowStock]) => ({ salesToday, lowStock }))
      : null;

    return { tasks, canteen };
  }
}
