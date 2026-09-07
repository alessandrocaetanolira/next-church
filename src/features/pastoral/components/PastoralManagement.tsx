'use client';

import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { SummaryCards } from '@/features/pastoral/components/SummaryCards';
import { Clock, Megaphone, Pin, Plus, Trash2, UserCheck, UserX, Users } from 'lucide-react';
import { toast } from 'sonner';

interface PendingMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  birthDate: string | null;
  conversionDate: string | null;
  baptismDate: string | null;
  previousChurch: string | null;
  aboutMe: string | null;
  maritalStatus: string | null;
  createdAt: string;
}

interface JoinRequest {
  id: string;
  memberId: string;
  memberName: string;
  teamId: string;
  teamName: string;
  status: string;
  createdAt: string;
}

interface AnnouncementItem {
  id: string;
  title: string;
  content: string;
  createdByName: string;
  createdAt: string;
}

interface ActiveMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  teamIds: string[];
}

interface TeamItem {
  id: string;
  name: string;
}

interface PastoralManagementProps {
  tenantSlug: string;
  stats: {
    members: number;
    sales: number;
    tasks: number;
  };
  announcements: AnnouncementItem[];
  pendingMembers: PendingMember[];
  pendingJoinRequests: JoinRequest[];
  activeMembers: ActiveMember[];
  teams: TeamItem[];
}

const maritalStatusLabel: Record<string, string> = {
  single: 'Solteiro(a)',
  married: 'Casado(a)',
  divorced: 'Divorciado(a)',
  widowed: 'Viúvo(a)',
};

export function PastoralManagement({
  tenantSlug,
  stats,
  announcements: initialAnnouncements,
  pendingMembers: initialPendingMembers,
  pendingJoinRequests: initialPendingJoinRequests,
  activeMembers,
  teams,
}: PastoralManagementProps) {
  const [announcements, setAnnouncements] = useState(initialAnnouncements);
  const [pendingMembers, setPendingMembers] = useState(initialPendingMembers);
  const [pendingJoinRequests, setPendingJoinRequests] = useState(initialPendingJoinRequests);
  const [announcementDrawerOpen, setAnnouncementDrawerOpen] = useState(false);
  const [savingAnnouncement, setSavingAnnouncement] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: '', content: '' });

  const activeMembersWithTeams = useMemo(
    () =>
      activeMembers.map((member) => ({
        ...member,
        teamNames: member.teamIds
          .map((teamId) => teams.find((team) => team.id === teamId)?.name)
          .filter((value): value is string => Boolean(value)),
      })),
    [activeMembers, teams]
  );

  const handleCreateAnnouncement = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      toast.error('Preencha título e conteúdo.');
      return;
    }

    setSavingAnnouncement(true);
    try {
      const response = await fetch('/api/feed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'announcement',
          reference: form.title.trim(),
          content: form.content.trim(),
        }),
      });

      if (!response.ok) throw new Error();

      const created = await response.json();
      setAnnouncements((current) => [
        {
          id: created.id,
          title: created.reference || form.title.trim(),
          content: created.content,
          createdByName: created.userName,
          createdAt: created.createdAt,
        },
        ...current,
      ]);
      setForm({ title: '', content: '' });
      setAnnouncementDrawerOpen(false);
      toast.success('Aviso publicado.');
    } catch {
      toast.error('Erro ao publicar aviso.');
    } finally {
      setSavingAnnouncement(false);
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    try {
      const response = await fetch(`/api/feed/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error();
      setAnnouncements((current) => current.filter((item) => item.id !== id));
      toast.success('Aviso removido.');
    } catch {
      toast.error('Erro ao remover aviso.');
    }
  };

  const handlePendingMember = async (memberId: string, action: 'approve' | 'reject') => {
    setProcessingId(memberId);
    try {
      const response = await fetch(`/api/pastoral/members/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (!response.ok) throw new Error();
      setPendingMembers((current) => current.filter((member) => member.id !== memberId));
      toast.success(action === 'approve' ? 'Cadastro aprovado.' : 'Cadastro rejeitado.');
    } catch {
      toast.error('Erro ao processar cadastro.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleJoinRequest = async (requestId: string, action: 'approve' | 'reject') => {
    setProcessingId(requestId);
    try {
      const response = await fetch(`/api/teams/join-requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (!response.ok) throw new Error();
      setPendingJoinRequests((current) => current.filter((request) => request.id !== requestId));
      toast.success(action === 'approve' ? 'Solicitação aprovada.' : 'Solicitação rejeitada.');
    } catch {
      toast.error('Erro ao processar solicitação.');
    } finally {
      setProcessingId(null);
    }
  };

  const totalPending = pendingMembers.length + pendingJoinRequests.length;

  return (
    <div className="space-y-6">
      <SummaryCards stats={stats} />

      <Tabs defaultValue="announcements" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="announcements" className="gap-1.5">
            <Megaphone className="h-3.5 w-3.5" />
            Avisos
          </TabsTrigger>
          <TabsTrigger value="requests" className="gap-1.5 relative">
            <Users className="h-3.5 w-3.5" />
            Solicitações
            {totalPending > 0 ? (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] text-destructive-foreground">
                {totalPending}
              </span>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="members" className="gap-1.5">
            <UserCheck className="h-3.5 w-3.5" />
            Membros
          </TabsTrigger>
        </TabsList>

        <TabsContent value="announcements" className="space-y-4">
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Avisos e Eventos</h3>
                <Button size="sm" onClick={() => setAnnouncementDrawerOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Aviso
                </Button>
              </div>

              {announcements.length === 0 ? (
                <Card>
                  <CardContent className="py-10 text-center text-sm text-muted-foreground">
                    Nenhum aviso publicado.
                  </CardContent>
                </Card>
              ) : (
                announcements.map((announcement) => (
                  <Card key={announcement.id} className="border-primary/15">
                    <CardContent className="space-y-2 pt-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Pin className="h-3.5 w-3.5 text-primary" />
                            <h4 className="text-sm font-semibold">{announcement.title}</h4>
                          </div>
                          <p className="text-sm text-muted-foreground">{announcement.content}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => void handleDeleteAnnouncement(announcement.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {announcement.createdByName} · {format(new Date(announcement.createdAt), "dd/MM 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

          </div>
        </TabsContent>

        <TabsContent value="requests" className="space-y-4">
          {pendingMembers.length > 0 ? (
            <div className="space-y-3">
              <h4 className="font-semibold text-sm">Novos membros</h4>
              {pendingMembers.map((member) => (
                <Card key={member.id}>
                  <CardContent className="space-y-3 pt-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="font-medium text-sm">{member.name}</p>
                        <p className="text-xs text-muted-foreground">{member.email} · {member.phone}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {format(new Date(member.createdAt), "dd/MM 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" disabled={processingId === member.id} onClick={() => void handlePendingMember(member.id, 'approve')}>
                          Aprovar
                        </Button>
                        <Button size="sm" variant="outline" disabled={processingId === member.id} onClick={() => void handlePendingMember(member.id, 'reject')}>
                          Recusar
                        </Button>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {member.birthDate ? <Badge variant="outline">Nascimento: {format(new Date(member.birthDate), 'dd/MM/yyyy')}</Badge> : null}
                      {member.conversionDate ? <Badge variant="outline">Conversão: {format(new Date(member.conversionDate), 'dd/MM/yyyy')}</Badge> : null}
                      {member.baptismDate ? <Badge variant="outline">Batismo: {format(new Date(member.baptismDate), 'dd/MM/yyyy')}</Badge> : null}
                      {member.previousChurch ? <Badge variant="outline">Igreja anterior: {member.previousChurch}</Badge> : null}
                      {member.maritalStatus ? <Badge variant="secondary">{maritalStatusLabel[member.maritalStatus] ?? member.maritalStatus}</Badge> : null}
                    </div>

                    {member.aboutMe ? (
                      <div className="rounded-lg bg-muted/40 p-3 text-sm text-muted-foreground">
                        {member.aboutMe}
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : null}

          {pendingJoinRequests.length > 0 ? (
            <div className="space-y-3">
              <h4 className="font-semibold text-sm">Ingresso em times</h4>
              {pendingJoinRequests.map((request) => (
                <Card key={request.id}>
                  <CardContent className="flex items-center justify-between gap-3 pt-4">
                    <div>
                      <p className="font-medium text-sm">{request.memberName}</p>
                      <p className="text-xs text-muted-foreground">Quer entrar em {request.teamName}</p>
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(request.createdAt), "dd/MM 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" disabled={processingId === request.id} onClick={() => void handleJoinRequest(request.id, 'approve')}>
                        Aprovar
                      </Button>
                      <Button size="sm" variant="outline" disabled={processingId === request.id} onClick={() => void handleJoinRequest(request.id, 'reject')}>
                        Recusar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : null}

          {totalPending === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Nenhuma solicitação pendente.
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>

        <TabsContent value="members" className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Membros ativos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {activeMembersWithTeams.map((member) => (
                <div key={member.id} className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
                  <div>
                    <p className="font-medium text-sm">{member.name}</p>
                    <p className="text-xs text-muted-foreground">{member.email} · {member.phone}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {member.teamNames.length > 0 ? member.teamNames.map((teamName) => (
                        <Badge key={`${member.id}-${teamName}`} variant="outline" className="text-[10px]">
                          {teamName}
                        </Badge>
                      )) : <Badge variant="secondary">Sem time</Badge>}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Drawer open={announcementDrawerOpen} onOpenChange={setAnnouncementDrawerOpen}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader>
            <DrawerTitle>Novo Aviso</DrawerTitle>
          </DrawerHeader>
          <div className="space-y-4 overflow-y-auto px-4 pb-6">
            <div className="space-y-2">
              <Label>Título</Label>
              <Input
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                placeholder="Título do aviso"
              />
            </div>
            <div className="space-y-2">
              <Label>Conteúdo</Label>
              <Textarea
                rows={5}
                value={form.content}
                onChange={(event) => setForm((current) => ({ ...current, content: event.target.value }))}
                placeholder="Detalhes do aviso"
              />
            </div>
            <Button className="w-full" onClick={() => void handleCreateAnnouncement()} disabled={savingAnnouncement}>
              {savingAnnouncement ? 'Publicando...' : 'Publicar Aviso'}
            </Button>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
