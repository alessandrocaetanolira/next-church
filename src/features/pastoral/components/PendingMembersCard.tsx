'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Check, Clock, UserRound, X } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiRequest } from '@/services/api/client';

type PendingMember = {
  id: string;
  name: string;
  email: string;
  phone: string;
  createdAt: string;
  birthDate?: string | null;
  conversionDate?: string | null;
  baptismDate?: string | null;
  previousChurch?: string | null;
  aboutMe?: string | null;
  maritalStatus?: string | null;
};

const maritalStatusLabel: Record<string, string> = {
  single: 'Solteiro(a)',
  married: 'Casado(a)',
  divorced: 'Divorciado(a)',
  widowed: 'Viúvo(a)',
};

function formatDate(value?: string | null, pattern = 'dd/MM/yyyy') {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : format(date, pattern, { locale: ptBR });
}

export function PendingMembersCard() {
  const [members, setMembers] = useState<PendingMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    void apiRequest<{ members?: PendingMember[] }>('/api/pastoral/pending')
      .then((response) => {
        if (active) setMembers(Array.isArray(response.members) ? response.members : []);
      })
      .catch(() => {
        if (active) toast.error('Não foi possível carregar os membros pendentes.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    setProcessingId(id);
    try {
      await apiRequest(`/api/pastoral/members/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ action }),
      });
      setMembers((current) => current.filter((member) => member.id !== id));
      toast.success(action === 'approve' ? 'Membro aprovado.' : 'Cadastro recusado.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível processar o cadastro.');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <UserRound className="h-4 w-4 text-primary" />
          Membros pendentes
        </CardTitle>
        {!loading && members.length > 0 ? <Badge>{members.length}</Badge> : null}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
            <Clock className="h-4 w-4 animate-pulse" />
            Carregando solicitações...
          </div>
        ) : members.length === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">Nenhum membro aguardando aprovação.</p>
        ) : (
          <div className="space-y-3">
            {members.map((member) => (
              <div key={member.id} className="rounded-lg border border-border/70 p-3 sm:p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold">{member.name}</p>
                      <Badge variant="outline" className="text-[10px]">Aguardando aprovação</Badge>
                    </div>
                    <div className="grid gap-x-4 gap-y-1 text-xs text-muted-foreground sm:grid-cols-2">
                      <span className="truncate">E-mail: {member.email}</span>
                      <span>Telefone: {member.phone || 'Não informado'}</span>
                      <span>Solicitado em: {formatDate(member.createdAt, "dd/MM/yyyy 'às' HH:mm")}</span>
                      {formatDate(member.birthDate) ? <span>Nascimento: {formatDate(member.birthDate)}</span> : null}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button size="sm" disabled={processingId === member.id} onClick={() => void handleAction(member.id, 'approve')}>
                      <Check className="mr-1.5 h-4 w-4" />
                      Aprovar
                    </Button>
                    <Button size="sm" variant="outline" disabled={processingId === member.id} onClick={() => void handleAction(member.id, 'reject')}>
                      <X className="mr-1.5 h-4 w-4" />
                      Recusar
                    </Button>
                  </div>
                </div>
                {(member.conversionDate || member.baptismDate || member.previousChurch || member.maritalStatus || member.aboutMe) ? (
                  <div className="mt-3 space-y-2 border-t border-border/60 pt-3">
                    <div className="flex flex-wrap gap-1.5">
                      {formatDate(member.conversionDate) ? <Badge variant="secondary" className="text-[10px]">Conversão: {formatDate(member.conversionDate)}</Badge> : null}
                      {formatDate(member.baptismDate) ? <Badge variant="secondary" className="text-[10px]">Batismo: {formatDate(member.baptismDate)}</Badge> : null}
                      {member.maritalStatus ? <Badge variant="secondary" className="text-[10px]">{maritalStatusLabel[member.maritalStatus] ?? member.maritalStatus}</Badge> : null}
                      {member.previousChurch ? <Badge variant="secondary" className="max-w-full truncate text-[10px]">Igreja anterior: {member.previousChurch}</Badge> : null}
                    </div>
                    {member.aboutMe ? <p className="rounded-md bg-muted/40 p-2 text-xs leading-relaxed text-muted-foreground">{member.aboutMe}</p> : null}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
