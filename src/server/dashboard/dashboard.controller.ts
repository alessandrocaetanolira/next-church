import { DashboardPolicy } from './dashboard.policy';
import { DashboardService } from './dashboard.service';
import type { TaskScope } from '@/server/tasks/tasks.policy';

type DashboardUser = Parameters<typeof DashboardPolicy.canViewTasks>[0];

export function getDashboardSummary(input: {
  user: DashboardUser;
  taskScope: TaskScope;
  service: DashboardService;
}) {
  const canViewTasks = DashboardPolicy.canViewTasks(input.user);
  const taskScope = canViewTasks && input.taskScope.allowed ? input.taskScope : null;
  return input.service.getSummary({
    taskScope,
    includeCanteen: DashboardPolicy.canViewCanteen(input.user),
  });
}
