'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useUIStore } from '@/features/ui/store';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { hasActionPermission } from '@/lib/access-control';
import { Heart, Send, Target } from 'lucide-react';
import { toast } from 'sonner';
import { listFundraising, listGroups, publishGroupPost } from '@/services/groups/groups-api';

type FundraisingItem = {
  id: string;
  name: string;
  targetQty: number;
  currentQty: number;
  unit: string;
};

type Goal = {
  id: string;
  title: string;
  description?: string | null;
  targetAmount: number;
  currentAmount: number;
  items: FundraisingItem[];
};

type GroupItem = {
  id: string;
  name: string;
  description?: string | null;
  members: Array<{ memberId: string }>;
};

export default function SocialProjectsPage() {
  const setPageTitle = useUIStore((state) => state.setPageTitle);
  const { user } = useAuth();
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [goalsByGroup, setGoalsByGroup] = useState<Record<string, Goal[]>>({});
  const [postDrawerOpen, setPostDrawerOpen] = useState(false);
  const [publishingPost, setPublishingPost] = useState(false);
  const [postForm, setPostForm] = useState({
    groupId: '',
    title: '',
    content: '',
    pinDays: '0',
  });
  const canPublishToFeed = hasActionPermission(user, 'feed', 'share');

  useEffect(() => {
    setPageTitle('Projetos Sociais');
    void loadData();
  }, [setPageTitle]);

  const loadData = async () => {
    try {
      const groupsPayload = await listGroups<GroupItem[]>('social_project');
      const nextGroups = Array.isArray(groupsPayload) ? groupsPayload : [];
      setGroups(nextGroups);
      setPostForm((current) => ({
        ...current,
        groupId: current.groupId || nextGroups[0]?.id || '',
      }));

      const entries = await Promise.all(
        nextGroups.map(async (group: GroupItem) => {
          const payload = await listFundraising<Goal[]>(group.id);
          return [group.id, Array.isArray(payload) ? payload : []] as const;
        }),
      );

      setGoalsByGroup(Object.fromEntries(entries));
    } catch {
      toast.error('Erro ao carregar projetos sociais.');
    }
  };

  const publishToFeed = async () => {
    if (!postForm.groupId || !postForm.content.trim()) {
      toast.error('Grupo e conteúdo são obrigatórios.');
      return;
    }

    setPublishingPost(true);
    try {
      await publishGroupPost({
          type: 'social_project',
          share: true,
          title: postForm.title.trim() || undefined,
          content: postForm.content.trim(),
          visibility: 'group',
          groupId: postForm.groupId,
          postAsGroup: true,
          pinDays: Number(postForm.pinDays) || 0,
        });

      toast.success('Publicação enviada para o feed do projeto social.');
      setPostDrawerOpen(false);
      setPostForm((current) => ({
        ...current,
        title: '',
        content: '',
        pinDays: '0',
      }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao publicar aviso.');
    } finally {
      setPublishingPost(false);
    }
  };

  const projectCards = useMemo(
    () =>
      groups.map((group) => ({
        group,
        goals: goalsByGroup[group.id] ?? [],
      })),
    [goalsByGroup, groups],
  );

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4">
      {canPublishToFeed ? (
        <div className="flex justify-end">
          <Button variant="outline" onClick={() => setPostDrawerOpen(true)}>
            <Send className="mr-2 h-4 w-4" />
            Publicar no Feed
          </Button>
        </div>
      ) : null}
      {projectCards.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Heart className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">Nenhum projeto social cadastrado.</p>
          </CardContent>
        </Card>
      ) : (
        projectCards.map(({ group, goals }) => (
          <div key={group.id} className="space-y-3">
            <div className="flex items-center gap-2">
              <Heart className="h-4 w-4 text-pink-500" />
              <Link href={`/groups/${group.id}`} className="font-semibold hover:text-primary">
                {group.name}
              </Link>
              <Badge variant="secondary" className="text-[10px]">{group.members.length} membros</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{group.description || 'Sem descrição cadastrada.'}</p>

            {goals.length === 0 ? (
              <Card>
                <CardContent className="py-6 text-center text-sm text-muted-foreground">
                  Nenhuma meta de arrecadação.
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {goals.map((goal) => {
                  const percentage = goal.targetAmount > 0 ? Math.min(100, (goal.currentAmount / goal.targetAmount) * 100) : 0;
                  return (
                    <Card key={goal.id}>
                      <CardContent className="space-y-3 pt-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium">{goal.title}</p>
                            <p className="text-sm text-muted-foreground">{goal.description || 'Sem descrição.'}</p>
                          </div>
                          <Target className="h-4 w-4 text-primary" />
                        </div>
                        <Progress value={percentage} className="h-2" />
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Arrecadado: R$ {goal.currentAmount.toFixed(2)}</span>
                          <span>Meta: R$ {goal.targetAmount.toFixed(2)}</span>
                        </div>
                        {goal.items.length > 0 ? (
                          <div className="space-y-2">
                            {goal.items.map((item) => {
                              const itemPercentage = item.targetQty > 0 ? Math.min(100, (item.currentQty / item.targetQty) * 100) : 0;
                              return (
                                <div key={item.id} className="space-y-1 rounded-lg bg-muted/40 p-2">
                                  <div className="flex items-center justify-between text-xs">
                                    <span>{item.name}</span>
                                    <span className="text-muted-foreground">{item.currentQty}/{item.targetQty} {item.unit}</span>
                                  </div>
                                  <Progress value={itemPercentage} className="h-1.5" />
                                </div>
                              );
                            })}
                          </div>
                        ) : null}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        ))
      )}

      <Drawer open={postDrawerOpen} onOpenChange={setPostDrawerOpen}>
        <DrawerContent className="max-h-[92vh]">
          <DrawerHeader>
            <DrawerTitle>Publicar no Feed</DrawerTitle>
          </DrawerHeader>
          <div className="space-y-4 overflow-y-auto px-4 pb-6">
            <div className="space-y-2">
              <Label>Projeto social</Label>
              <Select value={postForm.groupId} onValueChange={(value) => setPostForm((current) => ({ ...current, groupId: value }))}>
                <SelectTrigger><SelectValue placeholder="Selecione um projeto" /></SelectTrigger>
                <SelectContent>
                  {groups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
            <Button className="w-full" onClick={() => void publishToFeed()} disabled={publishingPost}>
              {publishingPost ? 'Publicando...' : 'Publicar em nome do projeto social'}
            </Button>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
