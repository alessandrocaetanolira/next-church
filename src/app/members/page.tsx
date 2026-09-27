'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUIStore } from '@/features/ui/store';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SharedFlatList } from '@/components/SharedFlatList';
import { Card, CardContent } from '@/components/ui/card';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { toast } from 'sonner';
import { Eye, Plus, QrCode } from 'lucide-react';
import { EmptyState, LoadingState, PageHeader, SearchField } from '@/components/common';
import { WebPageLayout } from '@/components/shared/web';
import { hasActionPermission } from '@/lib/access-control';
import { listMembers } from '@/services/members/members-api';
import { MembersWebTable } from '@/features/members/components/MembersWebTable';
import { maritalStatusLabels, roleLabels, type ManagedMember } from '@/features/members/components/member-display';
import { RegistrationShareCard } from '@/features/pastoral/components/RegistrationShareCard';

export default function MembersPage() {
  const router = useRouter();
  const setPageTitle = useUIStore((state) => state.setPageTitle);
  const { user } = useAuth();
  const canCreate = hasActionPermission(user, 'members', 'create');
  const canUpdate = hasActionPermission(user, 'members', 'update');
  const [members, setMembers] = useState<ManagedMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [inviteDrawerOpen, setInviteDrawerOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<ManagedMember | null>(null);

  useEffect(() => {
    setPageTitle('Membros');
    void fetchMembers();
  }, [setPageTitle]);

  const fetchMembers = async () => {
    try {
      const data = await listMembers<ManagedMember[]>();
      setMembers(data);
    } catch {
      toast.error('Erro ao carregar membros');
    } finally {
      setLoading(false);
    }
  };

  const filteredMembers = members.filter((member) => {
    const term = search.toLowerCase();
    return (
      member.name.toLowerCase().includes(term) ||
      member.email.toLowerCase().includes(term) ||
      member.phone.toLowerCase().includes(term)
    );
  });

  return (
    <WebPageLayout>
      <PageHeader
        title="Lista de Membros"
        description="A tela principal fica focada na busca. Edição, permissões e exclusão ficam no detalhe do membro."
        actions={
          <>
          {canCreate ? <Button variant="outline" onClick={() => setInviteDrawerOpen(true)}>
            <QrCode className="mr-2 h-4 w-4" />
            Convidar
          </Button> : null}
          {canCreate ? <Button onClick={() => router.push('/members/new')}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Membro
          </Button> : null}
          </>
        }
      />

      <SearchField
        placeholder="Buscar por nome, email ou telefone..."
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />

      {loading ? (
        <LoadingState />
      ) : (
        <>
          <div className="lg:hidden">
            <SharedFlatList
              data={filteredMembers}
              keyExtractor={(member) => member.id}
              emptyComponent={<EmptyState title="Nenhum membro encontrado." />}
              renderItem={(member) => (
              <Card key={member.id}>
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">
                      {member.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0"><p className="truncate font-medium">{member.name}</p>
                    <p className="text-sm text-muted-foreground">{member.email}</p>
                    <p className="text-sm text-muted-foreground">{member.phone}</p></div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {member.parentPhone ? <Badge variant="outline">Resp.: {member.parentPhone}</Badge> : null}
                    <Badge variant={member.approved ? 'success' : 'secondary'}>
                      {member.approved ? 'Aprovado' : 'Pendente'}
                    </Badge>
                    <Badge variant={member.role ? 'outline' : 'secondary'}>
                      {member.role ? roleLabels[member.role] : 'Sem acesso'}
                    </Badge>
                  </div>
                  <Button className="w-full" variant="outline" onClick={() => setSelectedMember(member)}>
                    <Eye className="mr-2 h-4 w-4" />
                    Ver detalhes
                  </Button>
                </CardContent>
              </Card>
              )}
            />
          </div>

          <div className="hidden lg:block">
            <MembersWebTable members={filteredMembers} onOpenMember={setSelectedMember} />
          </div>
        </>
      )}

      <Drawer open={inviteDrawerOpen} onOpenChange={setInviteDrawerOpen}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader>
            <DrawerTitle>Convidar Novo Membro</DrawerTitle>
          </DrawerHeader>
          <div className="overflow-y-auto px-4 pb-6">
            <RegistrationShareCard tenantSlug={user?.tenantSlug || ''} />
          </div>
        </DrawerContent>
      </Drawer>

      <Drawer open={Boolean(selectedMember)} onOpenChange={(open) => { if (!open) setSelectedMember(null); }}>
        <DrawerContent className="max-h-[90dvh]">
          {selectedMember ? (
            <>
              <DrawerHeader className="text-left">
                <DrawerTitle className="flex flex-wrap items-center gap-2">
                  {selectedMember.name}
                  <Badge variant={selectedMember.role ? 'outline' : 'secondary'} className="text-xs font-normal">
                    {selectedMember.role ? roleLabels[selectedMember.role] : 'Sem acesso'}
                  </Badge>
                </DrawerTitle>
                <p className="text-sm text-muted-foreground">{selectedMember.email} • {selectedMember.phone || 'Sem telefone'}</p>
              </DrawerHeader>
              <div className="space-y-4 overflow-y-auto px-4 pb-8">
                <div className="flex flex-wrap gap-2">
                  <Badge variant={selectedMember.approved ? 'success' : 'secondary'}>{selectedMember.approved ? 'Aprovado' : 'Pendente'}</Badge>
                  <Badge variant="outline">{selectedMember.permissions.length} permissões</Badge>
                </div>
                <div className="grid gap-3 rounded-xl border border-border/50 p-4 text-sm sm:grid-cols-2">
                  <div><span className="text-muted-foreground">Responsável</span><p>{selectedMember.parentPhone || '-'}</p></div>
                  <div><span className="text-muted-foreground">Estado civil</span><p>{selectedMember.maritalStatus ? maritalStatusLabels[selectedMember.maritalStatus] ?? selectedMember.maritalStatus : '-'}</p></div>
                  <div><span className="text-muted-foreground">Nascimento</span><p>{selectedMember.birthDate ? new Date(selectedMember.birthDate).toLocaleDateString('pt-BR') : '-'}</p></div>
                  <div><span className="text-muted-foreground">Igreja anterior</span><p>{selectedMember.previousChurch || '-'}</p></div>
                  <div className="sm:col-span-2"><span className="text-muted-foreground">Sobre</span><p>{selectedMember.aboutMe || '-'}</p></div>
                </div>
                {canUpdate ? <Button className="w-full" onClick={() => router.push(`/members/${selectedMember.id}/edit`)}>Editar membro</Button> : null}
                <Button variant="outline" className="w-full" onClick={() => router.push(`/members/${selectedMember.id}/access`)}>Acesso e permissões</Button>
              </div>
            </>
          ) : null}
        </DrawerContent>
      </Drawer>
    </WebPageLayout>
  );
}
