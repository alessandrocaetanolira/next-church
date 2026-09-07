import { Metadata } from 'next';
import { TaskList } from '@/features/schedules/components/TaskList';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { hasPermission } from '@/lib/access-control';

export const metadata: Metadata = {
  title: 'Escalas | Church App',
  description: 'Gestão de escalas e tarefas',
};

import { PageTitle } from '@/components/PageTitle';

export default async function SchedulesPage() {
  const session = await auth();
  
  if (!session) {
    redirect('/auth/login');
  }

  if (!hasPermission(session.user, 'tasks')) {
    redirect('/');
  }

  return (
    <div className="container mx-auto p-4 space-y-4">
      <PageTitle title="Escalas" />
      <div className="flex justify-end">
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nova Escala
        </Button>
      </div>
      <main>
        <TaskList />
      </main>
    </div>
  );
}
