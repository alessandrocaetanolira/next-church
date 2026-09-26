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
import { EmptyState, LoadingState, PageHeader, PageShell, SearchField } from '@/components/common';
import { hasActionPermission } from '@/lib/access-control';
import { listMembers } from '@/services/members/members-api';
import { MembersWebTable } from '@/features/members/components/MembersWebTable';
import { roleLabels, type ManagedMember } from '@/features/members/components/member-display';

export default function MembersPage() {
  const router = useRouter();
  const setPageTitle = useUIStore((state) => state.setPageTitle);
  const { user } = useAuth();
  const canCreate = hasActionPermission(user, 'members', 'create');
  const [members, setMembers] = useState<ManagedMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [inviteDrawerOpen, setInviteDrawerOpen] = useState(false);

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
    <PageShell>
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
                  <Button className="w-full" variant="outline" onClick={() => router.push(`/members/${member.id}`)}>
                    <Eye className="mr-2 h-4 w-4" />
                    Ver detalhes
                  </Button>
                </CardContent>
              </Card>
              )}
            />
          </div>

          <div className="hidden lg:block">
            <MembersWebTable members={filteredMembers} onOpenMember={(member) => router.push(`/members/${member.id}`)} />
          </div>
        </>
      )}

      <Drawer open={inviteDrawerOpen} onOpenChange={setInviteDrawerOpen}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader>
            <DrawerTitle>Convidar Novo Membro</DrawerTitle>
          </DrawerHeader>
          <div className="overflow-y-auto px-4 pb-6">
            <p className="text-sm text-muted-foreground">
              O link e o QR Code do cadastro da igreja agora ficam em Configurações.
            </p>
          </div>
        </DrawerContent>
      </Drawer>
    </PageShell>
  );
}
