'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useUIStore } from '@/features/ui/store';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Package, Pin, Plus, Send, Target, Users, UserPlus, X } from 'lucide-react';
import { toast } from 'sonner';
import { generateId } from '@/lib/id';
import { hasPermission } from '@/lib/access-control';
import { cn } from '@/lib/utils';

type GroupMember = {
  id: string;
  memberId: string;
  role: string;
  memberName?: string | null;
  memberEmail?: string | null;
};

type GroupDetail = {
  id: string;
  name: string;
  description?: string | null;
  type: string;
  color?: string | null;
  icon?: string | null;
  capabilities: string[];
  members: GroupMember[];
};

type FeedPost = {
  id: string;
  userName: string;
  title?: string | null;
  type: string;
  content: string;
  senderType?: string | null;
  pinnedUntil?: string | null;
  createdAt: string;
};

type FundraisingItem = {
  id: string;
  name: string;
  targetQty: number;
  currentQty: number;
  unit: string;
};

type FundraisingGoal = {
  id: string;
  title: string;
  description?: string | null;
  targetAmount: number;
  currentAmount: number;
  items: FundraisingItem[];
  deadline?: string | null;
};

type MemberOption = {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  teamIds?: string[];
};

type JoinRequestItem = {
  id: string;
  memberId: string;
  memberName: string;
  teamId: string;
  teamName: string;
  status: string;
  createdAt: string;
};

export default function GroupDetailPage() {
  const params = useParams<{ id: string }>();
  const groupId = params?.id;
  const router = useRouter();
  const setPageTitle = useUIStore((state) => state.setPageTitle);
  const { user } = useAuth();
  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [pendingRequests, setPendingRequests] = useState<JoinRequestItem[]>([]);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [goals, setGoals] = useState<FundraisingGoal[]>([]);
  const [goalDrawerOpen, setGoalDrawerOpen] = useState(false);
  const [groupDrawerOpen, setGroupDrawerOpen] = useState(false);
  const [postDrawerOpen, setPostDrawerOpen] = useState(false);
  const [savingGoal, setSavingGoal] = useState(false);
  const [savingGroup, setSavingGroup] = useState(false);
  const [savingPost, setSavingPost] = useState(false);
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);
  const [goalForm, setGoalForm] = useState({
    title: '',
    description: '',
    targetAmount: '',
    deadline: '',
    items: [] as FundraisingItem[],
  });
  const [groupForm, setGroupForm] = useState({
    name: '',
    description: '',
    color: 'primary',
    icon: 'users',
    members: [] as Array<{ memberId: string; role: string }>,
  });
  const [postForm, setPostForm] = useState({
    title: '',
    content: '',
    pinDays: '0',
  });

  const isTeam = group?.type === 'team';
  const canAccessSchedules = hasPermission(user, 'tasks');
  const canAccessMaterials = hasPermission(user, 'materials');
  const isLeader = Boolean(group?.members.some((member) => member.memberId === user?.linkedMemberId && ['leader', 'responsible'].includes(member.role)));
  const canManage = ['ADMIN', 'PASTOR'].includes(user?.role?.toUpperCase() ?? '') || isLeader;

  useEffect(() => {
    if (!groupId) return;
    void loadData();
  }, [groupId, user?.linkedMemberId]);

  useEffect(() => {
    setPageTitle(group?.name ?? 'Grupo');
  }, [group?.name, setPageTitle]);

  const loadData = async () => {
    if (!groupId) return;

    try {
      const requestsFetch = isTeam || !group
        ? fetch('/api/teams/join-requests', { cache: 'no-store' })
        : Promise.resolve(null);

      const [groupResponse, postsResponse, goalsResponse, membersResponse, requestsResponse] = await Promise.all([
        fetch(`/api/groups/${groupId}`, { cache: 'no-store' }),
        fetch(`/api/feed?groupId=${groupId}`, { cache: 'no-store' }),
        fetch(`/api/groups/${groupId}/fundraising`, { cache: 'no-store' }),
        fetch('/api/members', { cache: 'no-store' }),
        requestsFetch,
      ]);

      if (!groupResponse.ok || !postsResponse.ok || !goalsResponse.ok || !membersResponse.ok || (requestsResponse && !requestsResponse.ok)) {
        throw new Error();
      }

      const [groupPayload, postsPayload, goalsPayload, membersPayload, requestsPayload] = await Promise.all([
        groupResponse.json(),
        postsResponse.json(),
        goalsResponse.json(),
        membersResponse.json(),
        requestsResponse ? requestsResponse.json() : Promise.resolve([]),
      ]);

      setGroup(groupPayload);
      setPosts(Array.isArray(postsPayload.items) ? postsPayload.items : []);
      setGoals(Array.isArray(goalsPayload) ? goalsPayload : []);
      setMembers(Array.isArray(membersPayload) ? membersPayload : []);
      const allRequests = Array.isArray(requestsPayload) ? requestsPayload : [];
      setPendingRequests(allRequests.filter((request) => request.teamId === groupPayload.id && request.status === 'pending'));
    } catch {
      toast.error('Erro ao carregar grupo.');
    }
  };

  useEffect(() => {
    if (!group) return;
    setGroupForm({
      name: group.name,
      description: group.description ?? '',
      color: group.color ?? 'primary',
      icon: group.icon ?? 'users',
      members: group.members.map((member) => ({
        memberId: member.memberId,
        role: member.role,
      })),
    });
  }, [group]);

  const leaders = useMemo(
    () => group?.members.filter((member) => ['leader', 'responsible'].includes(member.role)) ?? [],
    [group?.members],
  );

  const participants = useMemo(
    () => group?.members.filter((member) => member.role === 'member') ?? [],
    [group?.members],
  );

  const selectedMembers = useMemo(
    () =>
      groupForm.members.map((entry) => {
        const member = members.find((item) => item.id === entry.memberId);
        return {
          ...entry,
          name: member?.name ?? 'Membro',
        };
      }),
    [groupForm.members, members]
  );

  const availableMembers = useMemo(
    () => members.filter((member) => !groupForm.members.some((entry) => entry.memberId === member.id)),
    [groupForm.members, members]
  );

  const addGoalItem = () => {
    setGoalForm((current) => ({
      ...current,
      items: [...current.items, { id: generateId(), name: '', targetQty: 0, currentQty: 0, unit: 'un' }],
    }));
  };

  const updateGoalItem = (index: number, updates: Partial<FundraisingItem>) => {
    setGoalForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...updates } : item)),
    }));
  };

  const saveGoal = async () => {
    if (!groupId || !goalForm.title.trim()) {
      toast.error('Título é obrigatório.');
      return;
    }

    setSavingGoal(true);
    try {
      const response = await fetch(`/api/groups/${groupId}/fundraising`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: goalForm.title.trim(),
          description: goalForm.description.trim(),
          targetAmount: Number(goalForm.targetAmount) || 0,
          items: goalForm.items,
          deadline: goalForm.deadline || null,
        }),
      });

      if (!response.ok) throw new Error();
      toast.success('Meta criada.');
      setGoalDrawerOpen(false);
      setGoalForm({ title: '', description: '', targetAmount: '', deadline: '', items: [] });
      await loadData();
    } catch {
      toast.error('Erro ao salvar meta.');
    } finally {
      setSavingGoal(false);
    }
  };

  const toggleMember = (memberId: string) => {
    setGroupForm((current) => ({
      ...current,
      members: current.members.some((member) => member.memberId === memberId)
        ? current.members.filter((member) => member.memberId !== memberId)
        : [...current.members, { memberId, role: 'member' }],
    }));
  };

  const setMemberRole = (memberId: string, role: string) => {
    setGroupForm((current) => ({
      ...current,
      members: current.members.map((member) => (member.memberId === memberId ? { ...member, role } : member)),
    }));
  };

  const removeMember = (memberId: string) => {
    setGroupForm((current) => ({
      ...current,
      members: current.members.filter((member) => member.memberId !== memberId),
    }));
  };

  const saveGroup = async () => {
    if (!groupId || !group) return;
    if (!groupForm.name.trim()) {
      toast.error('Nome é obrigatório.');
      return;
    }

    setSavingGroup(true);
    try {
      const response = await fetch(`/api/groups/${groupId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: groupForm.name.trim(),
          description: groupForm.description.trim(),
          type: group.type,
          color: groupForm.color,
          icon: groupForm.icon,
          capabilities: group.capabilities,
          members: groupForm.members,
        }),
      });

      if (!response.ok) throw new Error();
      toast.success('Grupo atualizado.');
      setGroupDrawerOpen(false);
      await loadData();
    } catch {
      toast.error('Erro ao salvar grupo.');
    } finally {
      setSavingGroup(false);
    }
  };

  const processJoinRequest = async (requestId: string, action: 'approve' | 'reject') => {
    setProcessingRequestId(requestId);
    try {
      const response = await fetch(`/api/teams/join-requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || 'Erro ao processar solicitação.');
      }

      toast.success(action === 'approve' ? 'Solicitação aprovada.' : 'Solicitação recusada.');
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao processar solicitação.');
    } finally {
      setProcessingRequestId(null);
    }
  };

  const publishGroupPost = async () => {
    if (!groupId || !group) return;
    if (!postForm.content.trim()) {
      toast.error('Conteúdo é obrigatório.');
      return;
    }

    setSavingPost(true);
    try {
      const response = await fetch('/api/feed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: group.type === 'social_project' ? 'social_project' : 'event',
          title: postForm.title.trim() || undefined,
          content: postForm.content.trim(),
          visibility: 'group',
          groupId,
          postAsGroup: true,
          pinDays: Number(postForm.pinDays) || 0,
        }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || 'Erro ao publicar no feed.');
      }

      toast.success('Publicação enviada em nome do grupo.');
      setPostDrawerOpen(false);
      setPostForm({ title: '', content: '', pinDays: '0' });
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao publicar no feed.');
    } finally {
      setSavingPost(false);
    }
  };

  const totalMembersLabel = useMemo(() => `${group?.members.length ?? 0} participante(s)`, [group?.members.length]);

  if (!groupId) return null;

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4 pb-28 md:pb-6">
      <Button asChild variant="ghost" className="px-0">
        <Link href="/groups">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para grupos
        </Link>
      </Button>

      {group ? (
        <>
          <Card>
            <CardContent className="space-y-3 pt-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <h2 className="break-words text-2xl font-bold">{group.name}</h2>
                  <p className="break-words text-sm text-muted-foreground">{group.description || 'Sem descrição cadastrada.'}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge className="whitespace-nowrap">{group.type}</Badge>
                  <Badge variant="secondary" className="whitespace-nowrap">{totalMembersLabel}</Badge>
                  {isLeader ? <Badge className="whitespace-nowrap">Responsável</Badge> : null}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {group.capabilities.map((capability) => (
                  <Badge key={capability} variant="outline" className="max-w-full break-words">{capability}</Badge>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {canManage ? (
                  <Button size="sm" variant="outline" className="max-w-full" onClick={() => setGroupDrawerOpen(true)}>
                    <Users className="mr-2 h-4 w-4" />
                    Gerenciar grupo
                  </Button>
                ) : null}
                {canManage ? (
                  <Button size="sm" variant="outline" className="max-w-full" onClick={() => setPostDrawerOpen(true)}>
                    <Send className="mr-2 h-4 w-4" />
                    Publicar no feed
                  </Button>
                ) : null}
                {isTeam && canManage && canAccessSchedules ? (
                  <Button size="sm" variant="outline" className="max-w-full" onClick={() => router.push('/schedules')}>
                    Escalas
                  </Button>
                ) : null}
                {isTeam && canManage && canAccessMaterials ? (
                  <Button size="sm" variant="outline" className="max-w-full" onClick={() => router.push('/materials')}>
                    <Package className="mr-2 h-4 w-4" />
                    Materiais
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-[1.1fr,0.9fr]">
            <div className="space-y-4">
              {isTeam ? (
                <>
                  <Card>
                    <CardContent className="space-y-3 pt-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold">Responsáveis</h3>
                        <Badge variant="outline">{leaders.length}</Badge>
                      </div>
                      {leaders.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Nenhum responsável cadastrado.</p>
                      ) : (
                        leaders.map((member) => (
                          <div key={member.id} className="flex items-center gap-3 rounded-xl border border-primary/10 bg-primary/5 p-3">
                            <Avatar className="h-10 w-10 shrink-0">
                              <AvatarFallback className="bg-primary/10 text-primary text-sm">
                                {(member.memberName || '?').charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <p className="break-words font-medium">{member.memberName || 'Membro sem nome'}</p>
                              <p className="break-all text-xs text-muted-foreground">{member.memberEmail || member.memberId}</p>
                            </div>
                            <Badge variant="outline" className="shrink-0 whitespace-nowrap">Responsável</Badge>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="space-y-3 pt-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold">Participantes</h3>
                        <Badge variant="outline">{participants.length}</Badge>
                      </div>
                      {participants.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Nenhum participante neste grupo.</p>
                      ) : (
                        participants.map((member) => (
                          <div key={member.id} className="flex items-center gap-3 rounded-xl border p-3">
                            <Avatar className="h-10 w-10 shrink-0">
                              <AvatarFallback className="bg-primary/10 text-primary text-sm">
                                {(member.memberName || '?').charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <p className="break-words font-medium">{member.memberName || 'Membro sem nome'}</p>
                              <p className="break-all text-xs text-muted-foreground">{member.memberEmail || member.memberId}</p>
                            </div>
                            <Badge variant="outline" className="shrink-0 whitespace-nowrap">Participante</Badge>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>

                  {canManage ? (
                    <Card>
                      <CardContent className="space-y-3 pt-4">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold">Solicitações pendentes</h3>
                          <Badge variant="outline">{pendingRequests.length}</Badge>
                        </div>
                        {pendingRequests.length === 0 ? (
                          <p className="text-sm text-muted-foreground">Nenhuma solicitação pendente.</p>
                        ) : (
                          pendingRequests.map((request) => (
                            <div key={request.id} className="space-y-3 rounded-xl border p-3">
                              <div>
                                <p className="font-medium">{request.memberName}</p>
                                <p className="text-xs text-muted-foreground">
                                  Solicitado em {new Date(request.createdAt).toLocaleDateString('pt-BR')}
                                </p>
                              </div>
                              <div className="flex flex-col gap-2 sm:flex-row">
                                <Button
                                  size="sm"
                                  onClick={() => void processJoinRequest(request.id, 'approve')}
                                  disabled={processingRequestId === request.id}
                                >
                                  Aprovar
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => void processJoinRequest(request.id, 'reject')}
                                  disabled={processingRequestId === request.id}
                                >
                                  Recusar
                                </Button>
                              </div>
                            </div>
                          ))
                        )}
                      </CardContent>
                    </Card>
                  ) : null}
                </>
              ) : (
                <Card>
                  <CardContent className="space-y-3 pt-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">Membros</h3>
                      <Badge variant="outline">{group.members.length}</Badge>
                    </div>
                    {group.members.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Nenhum membro neste grupo.</p>
                    ) : (
                      group.members.map((member) => (
                        <div key={member.id} className="flex items-center justify-between gap-3 rounded-xl border p-3">
                          <div className="min-w-0">
                            <p className="break-words font-medium">{member.memberName || 'Membro sem nome'}</p>
                            <p className="break-all text-xs text-muted-foreground">{member.memberEmail || member.memberId}</p>
                          </div>
                          <Badge variant={member.role === 'member' ? 'outline' : 'default'} className="shrink-0 whitespace-nowrap">{member.role}</Badge>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardContent className="space-y-3 pt-4">
                  <h3 className="font-semibold">Publicações do grupo</h3>
                  {posts.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhuma publicação neste grupo.</p>
                  ) : (
                    posts.map((post) => (
                      <div key={post.id} className="rounded-xl border p-3">
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <p className="min-w-0 break-words text-sm font-medium">{post.userName}</p>
                          <div className="flex flex-wrap justify-end gap-1">
                            {post.pinnedUntil && new Date(post.pinnedUntil).getTime() > Date.now() ? (
                              <Badge variant="outline" className="shrink-0 whitespace-nowrap">
                                <Pin className="mr-1 h-3 w-3" />
                                Fixado
                              </Badge>
                            ) : null}
                            <Badge variant="secondary" className="shrink-0 whitespace-nowrap">{post.type}</Badge>
                          </div>
                        </div>
                        {post.title ? <h4 className="mb-1 text-sm font-semibold">{post.title}</h4> : null}
                        <p className="break-words text-sm text-muted-foreground">{post.content}</p>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              <Card>
                <CardContent className="space-y-3 pt-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Arrecadação</h3>
                    {canManage ? (
                      <Button size="sm" onClick={() => setGoalDrawerOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Nova meta
                      </Button>
                    ) : null}
                  </div>
                  {goals.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhuma meta cadastrada.</p>
                  ) : (
                    goals.map((goal) => {
                      const percentage = goal.targetAmount > 0 ? Math.min(100, (goal.currentAmount / goal.targetAmount) * 100) : 0;
                      return (
                        <div key={goal.id} className="space-y-3 rounded-xl border p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="break-words font-medium">{goal.title}</p>
                              <p className="break-words text-sm text-muted-foreground">{goal.description || 'Sem descrição.'}</p>
                            </div>
                            <Target className="h-4 w-4 shrink-0 text-primary" />
                          </div>
                          <Progress value={percentage} className="h-2" />
                          <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                            <span>R$ {goal.currentAmount.toFixed(2)}</span>
                            <span>R$ {goal.targetAmount.toFixed(2)}</span>
                          </div>
                          {goal.items.length > 0 ? (
                            <div className="space-y-2">
                              {goal.items.map((item) => (
                                <div key={item.id} className="flex items-center justify-between gap-3 text-xs">
                                  <span className="min-w-0 break-words">{item.name}</span>
                                  <span className="shrink-0 whitespace-nowrap text-muted-foreground">{item.currentQty}/{item.targetQty} {item.unit}</span>
                                </div>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Carregando grupo...
          </CardContent>
        </Card>
      )}

      <Drawer open={groupDrawerOpen} onOpenChange={setGroupDrawerOpen}>
        <DrawerContent className="max-h-[92vh]">
          <DrawerHeader>
            <DrawerTitle>Gerenciar Grupo</DrawerTitle>
          </DrawerHeader>
          <div className="space-y-4 overflow-y-auto px-4 pb-6">
            <div className="rounded-xl border border-primary/15 bg-primary/5 p-3 text-sm text-muted-foreground">
              Admins e pastores podem incluir ou remover participantes e responsáveis de qualquer grupo.
            </div>
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={groupForm.name} onChange={(event) => setGroupForm((current) => ({ ...current, name: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea value={groupForm.description} onChange={(event) => setGroupForm((current) => ({ ...current, description: event.target.value }))} rows={3} />
            </div>

            <div className="space-y-2">
              <Label>Responsáveis e participantes atuais</Label>
              <div className="space-y-3 rounded-xl border p-3">
                {selectedMembers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum membro no grupo.</p>
                ) : (
                  selectedMembers.map((member) => (
                    <div key={member.memberId} className="space-y-2 rounded-lg border p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium">{member.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {member.role === 'member' ? 'Participante' : member.role === 'leader' ? 'Líder' : 'Responsável'}
                          </p>
                        </div>
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeMember(member.memberId)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <Select
                        value={member.role}
                        onValueChange={(value) => setMemberRole(member.memberId, value)}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="member">Membro</SelectItem>
                          <SelectItem value="leader">Líder</SelectItem>
                          <SelectItem value="responsible">Responsável</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Adicionar membros</Label>
              <div className="space-y-3 rounded-xl border p-3">
                {availableMembers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Todos os membros disponíveis já estão neste grupo.</p>
                ) : (
                  availableMembers.map((member) => (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => toggleMember(member.id)}
                      className="flex w-full items-center justify-between gap-3 rounded-lg border p-3 text-left text-sm transition-colors hover:bg-muted/40"
                    >
                      <span>{member.name}</span>
                      <Badge variant="outline">
                        <UserPlus className="mr-1 h-3 w-3" />
                        Adicionar
                      </Badge>
                    </button>
                  ))
                )}
              </div>
            </div>

            <Button className="w-full" onClick={() => void saveGroup()} disabled={savingGroup}>
              {savingGroup ? 'Salvando...' : 'Salvar alterações'}
            </Button>
          </div>
        </DrawerContent>
      </Drawer>

      <Drawer open={goalDrawerOpen} onOpenChange={setGoalDrawerOpen}>
        <DrawerContent className="max-h-[92vh]">
          <DrawerHeader>
            <DrawerTitle>Nova Meta de Arrecadação</DrawerTitle>
          </DrawerHeader>
          <div className="space-y-4 overflow-y-auto px-4 pb-6">
            <div className="space-y-2">
              <Label>Título</Label>
              <Input value={goalForm.title} onChange={(event) => setGoalForm((current) => ({ ...current, title: event.target.value }))} placeholder="Campanha de alimentos" />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea value={goalForm.description} onChange={(event) => setGoalForm((current) => ({ ...current, description: event.target.value }))} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Meta em R$</Label>
                <Input type="number" value={goalForm.targetAmount} onChange={(event) => setGoalForm((current) => ({ ...current, targetAmount: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Prazo</Label>
                <Input type="date" value={goalForm.deadline} onChange={(event) => setGoalForm((current) => ({ ...current, deadline: event.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Itens</Label>
                <Button type="button" variant="outline" size="sm" onClick={addGoalItem}>
                  <Plus className="mr-2 h-4 w-4" />
                  Item
                </Button>
              </div>
              <div className="space-y-3 rounded-xl border p-3">
                {goalForm.items.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum item adicionado.</p> : null}
                {goalForm.items.map((item, index) => (
                  <div key={item.id} className="grid grid-cols-[1.3fr,0.7fr,0.5fr] gap-2">
                    <Input value={item.name} onChange={(event) => updateGoalItem(index, { name: event.target.value })} placeholder="Item" />
                    <Input type="number" value={item.targetQty || ''} onChange={(event) => updateGoalItem(index, { targetQty: Number(event.target.value) || 0 })} placeholder="Meta" />
                    <Input value={item.unit} onChange={(event) => updateGoalItem(index, { unit: event.target.value })} placeholder="Un" />
                  </div>
                ))}
              </div>
            </div>
            <Button className="w-full" onClick={() => void saveGoal()} disabled={savingGoal}>
              {savingGoal ? 'Salvando...' : 'Criar Meta'}
            </Button>
          </div>
        </DrawerContent>
      </Drawer>

      <Drawer open={postDrawerOpen} onOpenChange={setPostDrawerOpen}>
        <DrawerContent className="max-h-[92vh]">
          <DrawerHeader>
            <DrawerTitle>Publicar no Feed</DrawerTitle>
          </DrawerHeader>
          <div className="space-y-4 overflow-y-auto px-4 pb-6">
            <div className="space-y-2">
              <Label>Título</Label>
              <Input value={postForm.title} onChange={(event) => setPostForm((current) => ({ ...current, title: event.target.value }))} placeholder="Título da publicação" />
            </div>
            <div className="space-y-2">
              <Label>Conteúdo</Label>
              <Textarea value={postForm.content} onChange={(event) => setPostForm((current) => ({ ...current, content: event.target.value }))} rows={5} />
            </div>
            <div className="space-y-2">
              <Label>Fixar por quantos dias</Label>
              <Select value={postForm.pinDays} onValueChange={(value) => setPostForm((current) => ({ ...current, pinDays: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Não fixar</SelectItem>
                  <SelectItem value="1">1 dia</SelectItem>
                  <SelectItem value="3">3 dias</SelectItem>
                  <SelectItem value="7">7 dias</SelectItem>
                  <SelectItem value="15">15 dias</SelectItem>
                  <SelectItem value="30">30 dias</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={() => void publishGroupPost()} disabled={savingPost}>
              {savingPost ? 'Publicando...' : 'Publicar em nome do grupo'}
            </Button>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
