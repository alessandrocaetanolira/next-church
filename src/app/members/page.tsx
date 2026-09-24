'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUIStore } from '@/features/ui/store';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/DataTable';
import { Card, CardContent } from '@/components/ui/card';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { toast } from 'sonner';
import { Eye, Plus, QrCode } from 'lucide-react';
import { MemberForm } from '@/components/forms/MemberForm';
import { EmptyState, LoadingState, PageHeader, PageShell, SearchField } from '@/components/common';
import { hasActionPermission } from '@/lib/access-control';
import { listMembers } from '@/services/members/members-api';

type MemberRole = 'ADMIN' | 'PASTOR' | 'LEADER' | 'MEMBER';

interface ManagedMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  parentPhone?: string | null;
  birthDate?: string | null;
  conversionDate?: string | null;
  baptismDate?: string | null;
  previousChurch?: string | null;
  aboutMe?: string | null;
  maritalStatus?: string | null;
  approved: boolean;
  userId: string | null;
  role: MemberRole | null;
  permissions: string[];
  hasAccess: boolean;
}

const roleLabels: Record<MemberRole, string> = {
  ADMIN: 'Admin',
  PASTOR: 'Pastor',
  LEADER: 'Líder',
  MEMBER: 'Membro',
};

const maritalStatusLabels: Record<string, string> = {
  single: 'Solteiro(a)',
  married: 'Casado(a)',
  divorced: 'Divorciado(a)',
  widowed: 'Viúvo(a)',
};

export default function MembersPage() {
  const router = useRouter();
  const setPageTitle = useUIStore((state) => state.setPageTitle);
  const { user } = useAuth();
  const canCreate = hasActionPermission(user, 'members', 'create');
  const [members, setMembers] = useState<ManagedMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [memberDrawerOpen, setMemberDrawerOpen] = useState(false);
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

  const columns = [
    { key: 'name', header: 'Nome', render: (m: ManagedMember) => m.name },
    { key: 'email', header: 'Email', render: (m: ManagedMember) => m.email },
    { key: 'phone', header: 'Telefone', render: (m: ManagedMember) => m.phone },
    {
      key: 'details',
      header: 'Dados',
      render: (m: ManagedMember) => [
        m.parentPhone ? `Resp.: ${m.parentPhone}` : null,
        m.maritalStatus ? `Estado civil: ${maritalStatusLabels[m.maritalStatus] ?? m.maritalStatus}` : null,
      ].filter(Boolean).join(' • ') || '-',
    },
    {
      key: 'approved',
      header: 'Cadastro',
      render: (m: ManagedMember) => (
        <Badge variant={m.approved ? 'success' : 'secondary'}>
          {m.approved ? 'Aprovado' : 'Pendente'}
        </Badge>
      ),
    },
    {
      key: 'role',
      header: 'Perfil',
      render: (m: ManagedMember) => (
        <Badge variant={m.role ? 'outline' : 'secondary'}>
          {m.role ? roleLabels[m.role] : 'Sem acesso'}
        </Badge>
      ),
    },
  ];

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
          {canCreate ? <Button onClick={() => setMemberDrawerOpen(true)}>
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
          <div className="grid gap-3 lg:hidden">
            {filteredMembers.map((member) => (
              <Card key={member.id}>
                <CardContent className="space-y-3 p-4">
                  <div>
                    <p className="font-medium">{member.name}</p>
                    <p className="text-sm text-muted-foreground">{member.email}</p>
                    <p className="text-sm text-muted-foreground">{member.phone}</p>
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
            ))}
            {filteredMembers.length === 0 ? (
              <EmptyState title="Nenhum membro encontrado." />
            ) : null}
          </div>

          <div className="hidden lg:block">
            <DataTable
              columns={columns}
              data={filteredMembers}
              actions={(member: ManagedMember) => (
                <Button size="sm" variant="outline" onClick={() => router.push(`/members/${member.id}`)}>
                  <Eye className="mr-2 h-4 w-4" />
                  Detalhes
                </Button>
              )}
            />
          </div>
        </>
      )}

      <Drawer open={memberDrawerOpen} onOpenChange={setMemberDrawerOpen}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader>
            <DrawerTitle>Adicionar Membro</DrawerTitle>
          </DrawerHeader>
          <div className="overflow-y-auto px-4 pb-6">
            <MemberForm
              onSuccess={() => {
                setMemberDrawerOpen(false);
                void fetchMembers();
              }}
            />
          </div>
        </DrawerContent>
      </Drawer>

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
