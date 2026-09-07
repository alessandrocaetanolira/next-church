import { auth } from '@/auth';
import { getTenantClient } from '@/lib/prisma-factory';
import { PastoralManagement } from '@/features/pastoral/components/PastoralManagement';
import { redirect } from 'next/navigation';
import { ensureTenantSchemaExtensions } from '@/lib/tenant-schema';
import { PageShell } from '@/components/common/PageShell';

type PendingMemberRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  birthDate: Date | string | null;
  conversionDate: Date | string | null;
  baptismDate: Date | string | null;
  previousChurch: string | null;
  aboutMe: string | null;
  maritalStatus: string | null;
  createdAt: Date | string;
};

type JoinRequestRow = {
  id: string;
  memberId: string;
  memberName: string;
  teamId: string;
  teamName: string;
  status: string;
  createdAt: Date | string;
};

type ActiveMemberRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  teamIds: string | null;
};

type TeamRow = {
  id: string;
  name: string;
};

export default async function PastoralPage() {
  const session = await auth();
  if (!session) redirect('/auth/login');
  
  if (!session.user?.tenantId) return <div>Acesso Negado</div>;

  const prisma = getTenantClient(session.user.tenantId);
  await ensureTenantSchemaExtensions(prisma);
  
  const [members, sales, tasks, announcements, pendingMembers, pendingJoinRequests, activeMembers, teams] = await Promise.all([
    prisma.member.count(),
    prisma.sale.count({ 
        where: { createdAt: { gte: new Date(new Date().setHours(0,0,0,0)) } } 
    }),
    prisma.task.count({ where: { status: 'pending' } }),
    prisma.feedPost.findMany({
      where: { deletedAt: null, type: 'announcement' },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    prisma.$queryRawUnsafe<PendingMemberRow[]>(
      `
        SELECT
          id, name, email, phone, birthDate, conversionDate, baptismDate, previousChurch, aboutMe, maritalStatus, createdAt
        FROM "Member"
        WHERE approved = 0 AND deletedAt IS NULL
        ORDER BY createdAt DESC
      `
    ),
    prisma.$queryRawUnsafe<JoinRequestRow[]>(
      `
        SELECT id, memberId, memberName, teamId, teamName, status, createdAt
        FROM "TeamJoinRequest"
        WHERE status = 'pending' AND deletedAt IS NULL
        ORDER BY createdAt DESC
      `
    ),
    prisma.$queryRawUnsafe<ActiveMemberRow[]>(
      `
        SELECT id, name, email, phone, teamIds
        FROM "Member"
        WHERE deletedAt IS NULL AND approved = 1
        ORDER BY name ASC
      `
    ),
    prisma.$queryRawUnsafe<TeamRow[]>(
      `
        SELECT id, name
        FROM "Team"
        WHERE deletedAt IS NULL
        ORDER BY name ASC
      `
    )
  ]);

  return (
    <PageShell className="space-y-6">
      <PastoralManagement
        tenantSlug={session.user.tenantSlug ?? session.user.tenantId}
        stats={{ members, sales, tasks }}
        announcements={announcements.map((post) => ({
          id: post.id,
          title: post.reference || 'Aviso pastoral',
          content: post.content,
          createdByName: post.userName,
          createdAt: post.createdAt.toISOString(),
        }))}
        pendingMembers={pendingMembers.map((member) => ({
          id: member.id,
          name: member.name,
          email: member.email,
          phone: member.phone,
          previousChurch: member.previousChurch,
          aboutMe: member.aboutMe,
          maritalStatus: member.maritalStatus,
          createdAt: member.createdAt instanceof Date ? member.createdAt.toISOString() : String(member.createdAt),
          birthDate: member.birthDate instanceof Date ? member.birthDate.toISOString() : member.birthDate,
          conversionDate: member.conversionDate instanceof Date ? member.conversionDate.toISOString() : member.conversionDate,
          baptismDate: member.baptismDate instanceof Date ? member.baptismDate.toISOString() : member.baptismDate,
        }))}
        pendingJoinRequests={pendingJoinRequests.map((request) => ({
          id: request.id,
          memberId: request.memberId,
          memberName: request.memberName,
          teamId: request.teamId,
          teamName: request.teamName,
          status: request.status,
          createdAt: request.createdAt instanceof Date ? request.createdAt.toISOString() : String(request.createdAt),
        }))}
        activeMembers={activeMembers.map((member) => ({
          id: member.id,
          name: member.name,
          email: member.email,
          phone: member.phone,
          teamIds: typeof member.teamIds === 'string'
            ? member.teamIds.split(',').map((teamId: string) => teamId.trim()).filter(Boolean)
            : [],
        }))}
        teams={teams.map((team) => ({
          id: String(team.id),
          name: String(team.name),
        }))}
      />
    </PageShell>
  );
}
