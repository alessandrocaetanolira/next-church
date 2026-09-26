import { Metadata } from 'next';
import { TaskList } from '@/features/schedules/components/TaskList';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { hasActionPermission, hasPermission } from '@/lib/access-control';

export const metadata: Metadata = {
  title: 'Escalas | Church App',
  description: 'Gestão de escalas e tarefas',
};

import { WebPageLayout } from '@/components/shared/web';

export default async function SchedulesPage() {
  const session = await auth();
  
  if (!session) {
    redirect('/auth/login');
  }

  if (!hasPermission(session.user, 'tasks')) {
    redirect('/');
  }

  return (
    <WebPageLayout
      title="Escalas"
      description="Organize escalas, tarefas e responsabilidades da equipe."
      actions={hasActionPermission(session.user, 'tasks', 'create') ? <Button><Plus className="mr-2 h-4 w-4" />Nova Escala</Button> : null}
    >
      <TaskList />
    </WebPageLayout>
  );
}
