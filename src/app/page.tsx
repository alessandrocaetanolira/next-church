'use client';

import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { LeaderDashboard } from '@/features/dashboard/components/LeaderDashboard';
import { MemberDashboard } from '@/features/dashboard/components/MemberDashboard';
import { PageTitle } from '@/components/PageTitle';

export default function Dashboard() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return <div className="p-8 text-center">Carregando...</div>;
  }

  if (!session) {
    redirect('/auth/login');
  }

  const userRole = session.user?.role?.toUpperCase() || 'MEMBER';
  const isLeader = ['ADMIN', 'PASTOR', 'LEADER'].includes(userRole);

  return (
    <div className="p-4 space-y-6 max-w-4xl mx-auto">
      <PageTitle title={isLeader ? "Dashboard" : "Início"} />
      
      {isLeader ? <LeaderDashboard /> : <MemberDashboard />}
    </div>
  );
}
