'use client';

import { Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { WebDataTable } from '@/components/shared/web';
import { maritalStatusLabels, roleLabels, type ManagedMember } from './member-display';

interface MembersWebTableProps {
  members: ManagedMember[];
  onOpenMember: (member: ManagedMember) => void;
}

export function MembersWebTable({ members, onOpenMember }: MembersWebTableProps) {
  const columns = [
    { key: 'name', header: 'Nome', render: (member: ManagedMember) => member.name },
    { key: 'email', header: 'Email', render: (member: ManagedMember) => member.email },
    { key: 'phone', header: 'Telefone', render: (member: ManagedMember) => member.phone },
    {
      key: 'details',
      header: 'Dados',
      render: (member: ManagedMember) => [
        member.parentPhone ? `Resp.: ${member.parentPhone}` : null,
        member.maritalStatus ? `Estado civil: ${maritalStatusLabels[member.maritalStatus] ?? member.maritalStatus}` : null,
      ].filter(Boolean).join(' • ') || '-',
    },
    {
      key: 'approved',
      header: 'Cadastro',
      render: (member: ManagedMember) => (
        <Badge variant={member.approved ? 'success' : 'secondary'}>
          {member.approved ? 'Aprovado' : 'Pendente'}
        </Badge>
      ),
    },
    {
      key: 'role',
      header: 'Perfil',
      render: (member: ManagedMember) => (
        <Badge variant={member.role ? 'outline' : 'secondary'}>
          {member.role ? roleLabels[member.role] : 'Sem acesso'}
        </Badge>
      ),
    },
  ];

  return (
    <WebDataTable
      columns={columns}
      data={members}
      actions={(member: ManagedMember) => (
        <Button size="sm" variant="outline" onClick={() => onOpenMember(member)}>
          <Eye className="mr-2 h-4 w-4" />
          Detalhes
        </Button>
      )}
    />
  );
}
