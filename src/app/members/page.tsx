'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUIStore } from '@/features/ui/store';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SharedFlatList } from '@/components/SharedFlatList';
import { Card, CardContent } from '@/components/ui/card';
import { DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { toast } from 'sonner';
import { Crown, Filter, MoreVertical, Plus, QrCode, Share2 } from 'lucide-react';
import { EmptyState, ErrorState, LoadingState, PageHeader, SearchField } from '@/components/common';
import { WebPageLayout } from '@/components/shared/web';
import { canViewMemberPresence, hasActionPermission } from '@/lib/access-control';
import { membersApi } from '@/features/members/api/members.api';
import { presenceApi } from '@/services/presence-api';
import { MembersWebTable } from '@/features/members/components/MembersWebTable';
import { maritalStatusLabels, roleLabels, type ManagedMember, type MemberPresence } from '@/features/members/components/member-display';
import { RegistrationShareCard } from '@/features/pastoral/components/RegistrationShareCard';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useDrawer } from '@/components/providers/DrawerProvider';

type MemberRoleFilter = 'all' | 'ADMIN' | 'PASTOR' | 'LEADER' | 'MEMBER';
type MemberApprovalFilter = 'all' | 'approved' | 'pending';

function MemberFiltersDrawer({
  initialRole,
  initialApproval,
  onApply,
  onClose,
}: {
  initialRole: MemberRoleFilter;
  initialApproval: MemberApprovalFilter;
  onApply: (role: MemberRoleFilter, approval: MemberApprovalFilter) => void;
  onClose: () => void;
}) {
  const [role, setRole] = useState<MemberRoleFilter>(initialRole);
  const [approval, setApproval] = useState<MemberApprovalFilter>(initialApproval);
  const roles = [
    ['all', 'Todos os perfis'],
    ['ADMIN', 'Administradores'],
    ['PASTOR', 'Pastores'],
    ['LEADER', 'Líderes'],
    ['MEMBER', 'Membros'],
  ] as const;
  const approvals = [
    ['all', 'Todos'],
    ['approved', 'Aprovados'],
    ['pending', 'Pendentes'],
  ] as const;

  return (
    <>
      <DrawerHeader className="text-left">
        <DrawerTitle>Filtrar membros</DrawerTitle>
      </DrawerHeader>
      <div className="space-y-5 px-4 pb-6">
        <section className="space-y-2">
          <h3 className="text-sm font-medium">Perfil de acesso</h3>
          <div className="grid grid-cols-2 gap-2">
            {roles.map(([value, label]) => <Button key={value} type="button" variant={role === value ? 'default' : 'outline'} className="h-auto min-h-10 justify-start whitespace-normal px-3 py-2 text-left" onClick={() => setRole(value)}>{label}</Button>)}
          </div>
        </section>
        <section className="space-y-2">
          <h3 className="text-sm font-medium">Situação</h3>
          <div className="grid grid-cols-3 gap-2">
            {approvals.map(([value, label]) => <Button key={value} type="button" variant={approval === value ? 'default' : 'outline'} className="h-auto min-h-10 whitespace-normal px-2 py-2 text-xs" onClick={() => setApproval(value)}>{label}</Button>)}
          </div>
        </section>
        <div className="flex gap-2 pt-1">
          <Button type="button" variant="outline" className="flex-1" onClick={() => { setRole('all'); setApproval('all'); }}>Limpar</Button>
          <Button type="button" className="flex-1" onClick={() => { onApply(role, approval); onClose(); }}>Aplicar filtros</Button>
        </div>
      </div>
    </>
  );
}

export default function MembersPage() {
  const router = useRouter();
  const setPageTitle = useUIStore((state) => state.setPageTitle);
  const { user } = useAuth();
  const { openDrawer, closeDrawer } = useDrawer();
  const canCreate = hasActionPermission(user, 'members', 'create');
  const canUpdate = hasActionPermission(user, 'members', 'update');
  const canViewPresence = canViewMemberPresence(user);
  const [members, setMembers] = useState<ManagedMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<MemberRoleFilter>('all');
  const [approvalFilter, setApprovalFilter] = useState<MemberApprovalFilter>('all');
  const [presence, setPresence] = useState<MemberPresence>({});

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await membersApi.list();
      setMembers(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível carregar os membros.';
      setLoadError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setPageTitle('Membros');
    void fetchMembers();
  }, [fetchMembers, setPageTitle]);

  useEffect(() => {
    if (!canViewPresence) {
      setPresence({});
      return;
    }
    void presenceApi.list().then(({ presence: records }) => {
      setPresence(Object.fromEntries(records.map((record) => [record.userId, { lastSeenAt: record.lastSeenAt }])));
    }).catch(() => undefined);
    const handlePresence = (event: Event) => {
      const detail = (event as CustomEvent<{ type?: string; presence?: Array<{ userId: string; lastSeenAt: string }>; userId?: string; lastSeenAt?: string }>).detail;
      if (detail?.type === 'presence.snapshot') {
        setPresence(Object.fromEntries((detail.presence ?? []).map((record) => [record.userId, { lastSeenAt: record.lastSeenAt }])));
      } else if (detail?.type === 'presence.updated' && detail.userId && detail.lastSeenAt) {
        setPresence((current) => ({ ...current, [detail.userId as string]: { lastSeenAt: detail.lastSeenAt as string } }));
      } else if (detail?.type === 'presence.removed' && detail.userId) {
        setPresence((current) => { const next = { ...current }; delete next[detail.userId as string]; return next; });
      }
    };
    window.addEventListener('church:presence-updated', handlePresence);
    return () => window.removeEventListener('church:presence-updated', handlePresence);
  }, [canViewPresence]);

  const filteredMembers = members.filter((member) => {
    const term = search.toLowerCase();
    return (
      member.name.toLowerCase().includes(term) ||
      member.email.toLowerCase().includes(term) ||
      member.phone.toLowerCase().includes(term)
    )
      && (roleFilter === 'all' || member.role === roleFilter)
      && (approvalFilter === 'all' || (approvalFilter === 'approved' ? member.approved : !member.approved));
  });

  const roleCount = (role: Exclude<MemberRoleFilter, 'all'>) => members.filter((member) => member.role === role).length;
  const hasActiveFilters = roleFilter !== 'all' || approvalFilter !== 'all';

  const openInviteDrawer = () => {
    openDrawer({
      contentClassName: 'max-h-[90dvh]',
      content: (
        <>
          <DrawerHeader>
            <DrawerTitle>Convidar novo membro</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-6">
            <RegistrationShareCard tenantSlug={user?.tenantSlug || ''} />
          </div>
        </>
      ),
    });
  };

  const openMemberDrawer = (member: ManagedMember) => {
    openDrawer({
      contentClassName: 'max-h-[90dvh]',
      content: (
        <>
          <DrawerHeader className="text-left">
            <DrawerTitle className="flex flex-wrap items-center gap-2">
              {member.name}
              <Badge variant={member.role ? 'outline' : 'secondary'} className="text-xs font-normal">
                {member.role ? roleLabels[member.role] : 'Sem acesso'}
              </Badge>
            </DrawerTitle>
            <p className="text-sm text-muted-foreground">{member.email} • {member.phone || 'Sem telefone'}</p>
          </DrawerHeader>
          <div className="space-y-4 px-4 pb-8">
            <div className="flex flex-wrap gap-2">
              <Badge variant={member.approved ? 'success' : 'secondary'}>{member.approved ? 'Aprovado' : 'Pendente'}</Badge>
              <Badge variant="outline">{member.permissions.length} permissões</Badge>
            </div>
            <div className="grid gap-3 rounded-xl border border-border/50 p-4 text-sm sm:grid-cols-2">
              <div><span className="text-muted-foreground">Responsável</span><p>{member.parentPhone || '-'}</p></div>
              <div><span className="text-muted-foreground">Estado civil</span><p>{member.maritalStatus ? maritalStatusLabels[member.maritalStatus] ?? member.maritalStatus : '-'}</p></div>
              <div><span className="text-muted-foreground">Nascimento</span><p>{member.birthDate ? new Date(member.birthDate).toLocaleDateString('pt-BR') : '-'}</p></div>
              <div><span className="text-muted-foreground">Igreja anterior</span><p>{member.previousChurch || '-'}</p></div>
              <div className="sm:col-span-2"><span className="text-muted-foreground">Sobre</span><p>{member.aboutMe || '-'}</p></div>
            </div>
            {canUpdate ? <Button className="w-full" onClick={() => { closeDrawer(); router.push(`/members/${member.id}/edit`); }}>Editar membro</Button> : null}
            <Button variant="outline" className="w-full" onClick={() => { closeDrawer(); router.push(`/perfil/${member.id}`); }}>Ver perfil social</Button>
            <Button variant="outline" className="w-full" onClick={() => { closeDrawer(); router.push(`/members/${member.id}/access`); }}>Acesso e permissões</Button>
          </div>
        </>
      ),
    });
  };

  const openFiltersDrawer = () => {
    openDrawer({
      contentClassName: 'max-h-[80dvh]',
      content: <MemberFiltersDrawer initialRole={roleFilter} initialApproval={approvalFilter} onApply={(role, approval) => { setRoleFilter(role); setApprovalFilter(approval); }} onClose={closeDrawer} />,
    });
  };

  return (
    <WebPageLayout className="space-y-3 lg:space-y-6">
      <PageHeader
        title="Membros"
        className="flex-row items-center justify-between gap-3 sm:items-center"
        actions={
          <>
            {canCreate ? <Button type="button" variant="ghost" size="icon" className="h-10 w-10 rounded-full lg:hidden" onClick={openInviteDrawer} aria-label="Compartilhar convite"><Share2 className="h-5 w-5" /></Button> : null}
            <div className="hidden items-center gap-2 lg:flex">
              {canCreate ? <Button variant="outline" onClick={openInviteDrawer}>
                <QrCode className="mr-2 h-4 w-4" />
                Convidar
              </Button> : null}
              {canCreate ? <Button onClick={() => router.push('/members/new')}>
                <Plus className="mr-2 h-4 w-4" />
                Novo Membro
              </Button> : null}
            </div>
          </>
        }
      />

      <div className="space-y-2 lg:hidden">
        <div className="flex items-center gap-2">
          <SearchField containerClassName="min-w-0 flex-1" className="h-12 rounded-xl border-border/70 bg-card pl-10 text-sm" placeholder="Buscar membros..." value={search} onChange={(event) => setSearch(event.target.value)} />
          <Button type="button" variant="outline" size="icon" className={`relative h-12 w-12 shrink-0 rounded-xl bg-card ${hasActiveFilters ? 'border-primary text-primary' : ''}`} onClick={openFiltersDrawer} aria-label="Abrir filtros" aria-pressed={hasActiveFilters}><Filter className="h-4 w-4" />{hasActiveFilters ? <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" /> : null}</Button>
        </div>
        <div className="scrollbar-hide flex gap-1.5 overflow-x-auto pb-0.5">
          {([
            ['all', `Todos (${members.length})`],
            ['ADMIN', `Administradores (${roleCount('ADMIN')})`],
            ['PASTOR', `Pastores (${roleCount('PASTOR')})`],
            ['LEADER', `Líderes (${roleCount('LEADER')})`],
            ['MEMBER', `Membros (${roleCount('MEMBER')})`],
          ] as const).map(([value, label]) => <button key={value} type="button" onClick={() => setRoleFilter(value)} className={`shrink-0 rounded-full border px-3 py-1.5 text-xs transition-colors ${roleFilter === value ? 'border-primary bg-primary/10 font-medium text-primary' : 'border-border bg-card text-muted-foreground'}`}>{label}</button>)}
        </div>
      </div>

      <div className="hidden lg:block"><SearchField placeholder="Buscar por nome, email ou telefone..." value={search} onChange={(event) => setSearch(event.target.value)} /></div>

      {loading ? (
        <LoadingState />
      ) : loadError ? (
        <ErrorState description={loadError} onRetry={() => void fetchMembers()} />
      ) : (
        <>
          <div className="min-w-0 max-w-full lg:hidden">
            <SharedFlatList
              data={filteredMembers}
              keyExtractor={(member) => member.id}
              emptyComponent={<EmptyState title="Nenhum membro encontrado." />}
              renderItem={(member) => (
              <Card key={member.id} className="w-full min-w-0 max-w-full rounded-2xl border-border/70 bg-card shadow-sm">
                <CardContent className="flex min-w-0 items-start gap-2.5 p-3 sm:gap-3 sm:p-4">
                  <div className="relative shrink-0"><Avatar className="h-11 w-11 sm:h-14 sm:w-14"><AvatarImage src={member.avatarUrl ?? undefined} alt={member.name} /><AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">{member.name.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar><span className={`absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-card sm:h-4 sm:w-4 ${member.userId && presence[member.userId] ? 'bg-emerald-500' : 'bg-muted-foreground/40'}`} aria-label={member.userId && presence[member.userId] ? 'Online' : 'Offline'} /></div>
                  <button type="button" className="min-w-0 flex-1 overflow-hidden text-left" onClick={() => openMemberDrawer(member)}><p className="truncate text-base font-semibold sm:text-lg">{member.name}</p><Badge className="mt-1 max-w-full" variant={member.role === 'ADMIN' ? 'warning' : member.role === 'LEADER' ? 'info' : 'secondary'}><Crown className="mr-1 h-3 w-3 shrink-0" />{member.role ? roleLabels[member.role] : 'Membro'}</Badge><p className="mt-1 truncate text-xs text-muted-foreground sm:text-sm">{member.email}</p><p className="truncate text-xs text-muted-foreground sm:text-sm">{member.phone || 'Sem telefone'}</p></button>
                  <Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => openMemberDrawer(member)} aria-label={`Ações de ${member.name}`}><MoreVertical className="h-5 w-5" /></Button>
                </CardContent>
              </Card>
              )}
            />
          </div>

          <div className="hidden lg:block">
            <MembersWebTable members={filteredMembers} onOpenMember={openMemberDrawer} presence={presence} />
          </div>
        </>
      )}

      {canCreate ? <Button type="button" size="lg" className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom,0px))] right-4 z-40 h-16 w-16 rounded-full p-0 shadow-lg lg:hidden" onClick={() => router.push('/members/new')} aria-label="Adicionar membro"><Plus className="h-7 w-7" /><span className="sr-only">Adicionar</span></Button> : null}
    </WebPageLayout>
  );
}
