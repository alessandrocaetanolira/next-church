'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUIStore } from '@/features/ui/store';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Baby, HeartPulse, Plus, Search, Send } from 'lucide-react';
import { toast } from 'sonner';
import { hasActionPermission } from '@/lib/access-control';
import { deleteChild as deleteChildRequest, listKidsOptions, notifyChildResponsibles, publishKidsFeed, type KidsChild, type KidsGroupOption, type KidsMemberOption } from '@/services/kids/kids-api';
import { KidsWebTable } from '@/features/kids/components/KidsWebTable';
import { WebPageLayout } from '@/components/shared/web';

type ChildItem = KidsChild;
type MemberOption = KidsMemberOption;
type GroupOption = KidsGroupOption;

export default function KidsPage() {
  const router = useRouter();
  const setPageTitle = useUIStore((state) => state.setPageTitle);
  const { user } = useAuth();
  const [childrenList, setChildrenList] = useState<ChildItem[]>([]);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [groups, setGroups] = useState<GroupOption[]>([]);
  const [search, setSearch] = useState('');
  const [messageChild, setMessageChild] = useState<ChildItem | null>(null);
  const [postDrawerOpen, setPostDrawerOpen] = useState(false);
  const [messageForm, setMessageForm] = useState({ title: '', message: '' });
  const [sendingMessage, setSendingMessage] = useState(false);
  const [publishingPost, setPublishingPost] = useState(false);
  const [postForm, setPostForm] = useState({
    groupId: '',
    title: '',
    content: '',
    pinDays: '0',
  });
  const canCreate = hasActionPermission(user, 'kids', 'create');
  const canUpdate = hasActionPermission(user, 'kids', 'update');
  const canDelete = hasActionPermission(user, 'kids', 'delete');
  const canPublishToFeed = hasActionPermission(user, 'feed', 'share');

  useEffect(() => {
    setPageTitle('Infantil');
    void loadData();
  }, [setPageTitle]);

  const loadData = async () => {
    try {
      const [kidsPayload, membersPayload, groupsPayload] = await listKidsOptions();

      setChildrenList(Array.isArray(kidsPayload) ? kidsPayload : []);
      setMembers(Array.isArray(membersPayload) ? membersPayload : []);
      setGroups(Array.isArray(groupsPayload) ? groupsPayload : []);
      setPostForm((current) => ({
        ...current,
        groupId: current.groupId || (Array.isArray(groupsPayload) && groupsPayload[0]?.id ? groupsPayload[0].id : ''),
      }));
    } catch {
      toast.error('Erro ao carregar módulo infantil.');
    }
  };

  const visibleChildren = useMemo(() => {
    const query = search.trim().toLowerCase();
    return childrenList.filter((child) => {
      if (!query) return true;
      return (
        child.name.toLowerCase().includes(query) ||
        (child.allergies ?? '').toLowerCase().includes(query) ||
        (child.notes ?? '').toLowerCase().includes(query)
      );
    });
  }, [childrenList, search]);

  const deleteChild = async (id: string) => {
    if (!confirm('Remover esta criança?')) return;
    try {
      await deleteChildRequest(id);
      toast.success('Cadastro removido.');
      await loadData();
    } catch {
      toast.error('Erro ao remover cadastro.');
    }
  };

  const sendPrivateMessage = async () => {
    if (!messageChild) return;
    if (!messageForm.title.trim() || !messageForm.message.trim()) {
      toast.error('Título e mensagem são obrigatórios.');
      return;
    }

    setSendingMessage(true);
    try {
      await notifyChildResponsibles(messageChild.id, {
          title: messageForm.title.trim(),
          message: messageForm.message.trim(),
        });

      toast.success('Mensagem privada enviada aos responsáveis.');
      setMessageChild(null);
      setMessageForm({ title: '', message: '' });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao enviar mensagem.');
    } finally {
      setSendingMessage(false);
    }
  };

  const publishToFeed = async () => {
    if (!postForm.groupId || !postForm.content.trim()) {
      toast.error('Grupo e conteúdo são obrigatórios.');
      return;
    }

    setPublishingPost(true);
    try {
      await publishKidsFeed({
          type: 'event',
          share: true,
          title: postForm.title.trim() || undefined,
          content: postForm.content.trim(),
          visibility: 'group',
          groupId: postForm.groupId,
          postAsGroup: true,
          pinDays: Number(postForm.pinDays) || 0,
        });

      toast.success('Aviso publicado no feed do grupo infantil.');
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

  return (
    <WebPageLayout>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar criança..." className="pl-9" />
        </div>
        <div className="flex gap-2">
          {canPublishToFeed ? (
            <Button variant="outline" onClick={() => setPostDrawerOpen(true)}>
              <Send className="mr-2 h-4 w-4" />
              Publicar no Feed
            </Button>
          ) : null}
          {canCreate ? <Button onClick={() => router.push('/kids/new')}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Criança
          </Button> : null}
        </div>
      </div>

      <div className="hidden md:block"><KidsWebTable childrenList={visibleChildren} groups={groups} canUpdate={canUpdate} canDelete={canDelete} onEdit={(child) => router.push(`/kids/${child.id}/edit`)} onNotify={(child) => { setMessageChild(child); setMessageForm({ title: `Aviso sobre ${child.name}`, message: '' }); }} onDelete={(id) => void deleteChild(id)} /></div>
      <div className="grid gap-4 md:hidden">
        {visibleChildren.map((child) => (
          <Card key={child.id} className="border-border">
            <CardContent className="space-y-3 pt-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Baby className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold">{child.name}</p>
                    <p className="text-xs text-muted-foreground">{child.birthDate ? String(child.birthDate).slice(0, 10) : 'Sem nascimento informado'}</p>
                  </div>
                </div>
                <Badge variant={child.canDoPhysicalActivities === false ? 'destructive' : 'secondary'}>
                  {child.canDoPhysicalActivities === false ? 'Restrição física' : 'Atividades ok'}
                </Badge>
              </div>
              <div className="grid gap-2 text-sm text-muted-foreground">
                <p><span className="font-medium text-foreground">Alergias:</span> {child.allergies || 'Nenhuma'}</p>
                <p><span className="font-medium text-foreground">Medicações:</span> {child.medications || 'Nenhuma'}</p>
                <p><span className="font-medium text-foreground">Restrições alimentares:</span> {child.dietaryRestrictions || 'Nenhuma'}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {child.groupIds.map((groupId) => (
                  <Badge key={groupId} variant="outline" className="text-[11px]">
                    {groups.find((group) => group.id === groupId)?.name ?? 'Grupo infantil'}
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                {canUpdate ? <Button variant="outline" className="flex-1" onClick={() => router.push(`/kids/${child.id}/edit`)}>Editar</Button> : null}
                {canUpdate ? <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setMessageChild(child);
                    setMessageForm({
                      title: `Aviso sobre ${child.name}`,
                      message: '',
                    });
                  }}
                >
                  <Send className="mr-2 h-4 w-4" />
                  Avisar
                </Button> : null}
                {canDelete ? <Button variant="destructive" className="flex-1" onClick={() => void deleteChild(child.id)}>Excluir</Button> : null}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {visibleChildren.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <HeartPulse className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">Nenhuma criança cadastrada.</p>
          </CardContent>
        </Card>
      ) : null}


      <Drawer open={postDrawerOpen} onOpenChange={setPostDrawerOpen}>
        <DrawerContent className="max-h-[92vh]">
          <DrawerHeader>
            <DrawerTitle>Publicar Aviso no Feed</DrawerTitle>
          </DrawerHeader>
          <div className="space-y-4 overflow-y-auto px-4 pb-6">
            <div className="space-y-2">
              <Label>Grupo infantil</Label>
              <Select value={postForm.groupId} onValueChange={(value) => setPostForm((current) => ({ ...current, groupId: value }))}>
                <SelectTrigger><SelectValue placeholder="Selecione um grupo" /></SelectTrigger>
                <SelectContent>
                  {groups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Título</Label>
              <Input value={postForm.title} onChange={(event) => setPostForm((current) => ({ ...current, title: event.target.value }))} placeholder="Título do aviso" />
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
              {publishingPost ? 'Publicando...' : 'Publicar em nome do grupo infantil'}
            </Button>
          </div>
        </DrawerContent>
      </Drawer>

      <Drawer open={Boolean(messageChild)} onOpenChange={(open) => {
        if (!open) {
          setMessageChild(null);
          setMessageForm({ title: '', message: '' });
        }
      }}>
        <DrawerContent className="max-h-[92vh]">
          <DrawerHeader>
            <DrawerTitle>
              {messageChild ? `Mensagem privada: ${messageChild.name}` : 'Mensagem privada'}
            </DrawerTitle>
          </DrawerHeader>
          <div className="space-y-4 overflow-y-auto px-4 pb-6">
            <div className="space-y-2">
              <Label>Título</Label>
              <Input value={messageForm.title} onChange={(event) => setMessageForm((current) => ({ ...current, title: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Mensagem</Label>
              <Textarea value={messageForm.message} onChange={(event) => setMessageForm((current) => ({ ...current, message: event.target.value }))} rows={5} />
            </div>
            <Button className="w-full" onClick={() => void sendPrivateMessage()} disabled={sendingMessage}>
              {sendingMessage ? 'Enviando...' : 'Enviar mensagem privada'}
            </Button>
          </div>
        </DrawerContent>
      </Drawer>
    </WebPageLayout>
  );
}
