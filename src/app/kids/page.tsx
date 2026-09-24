'use client';

import { useEffect, useMemo, useState } from 'react';
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
import { createChild, deleteChild as deleteChildRequest, listKidsOptions, notifyChildResponsibles, publishKidsFeed, updateChild, type KidsChild, type KidsGroupOption, type KidsMemberOption } from '@/services/kids/kids-api';

type ChildItem = KidsChild;
type MemberOption = KidsMemberOption;
type GroupOption = KidsGroupOption;

const initialForm = {
  name: '',
  birthDate: '',
  parentMemberIds: [] as string[],
  allergies: '',
  medications: '',
  healthHistory: '',
  dietaryRestrictions: '',
  canDoPhysicalActivities: true,
  notes: '',
  groupIds: [] as string[],
};

export default function KidsPage() {
  const setPageTitle = useUIStore((state) => state.setPageTitle);
  const { user } = useAuth();
  const [childrenList, setChildrenList] = useState<ChildItem[]>([]);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [groups, setGroups] = useState<GroupOption[]>([]);
  const [search, setSearch] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingChild, setEditingChild] = useState<ChildItem | null>(null);
  const [messageChild, setMessageChild] = useState<ChildItem | null>(null);
  const [postDrawerOpen, setPostDrawerOpen] = useState(false);
  const [messageForm, setMessageForm] = useState({ title: '', message: '' });
  const [sendingMessage, setSendingMessage] = useState(false);
  const [publishingPost, setPublishingPost] = useState(false);
  const [form, setForm] = useState(initialForm);
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

  const openDrawer = (child?: ChildItem) => {
    setEditingChild(child ?? null);
    setForm(
      child
        ? {
            name: child.name,
            birthDate: child.birthDate ? String(child.birthDate).slice(0, 10) : '',
            parentMemberIds: child.parentMemberIds,
            allergies: child.allergies ?? '',
            medications: child.medications ?? '',
            healthHistory: child.healthHistory ?? '',
            dietaryRestrictions: child.dietaryRestrictions ?? '',
            canDoPhysicalActivities: child.canDoPhysicalActivities !== false,
            notes: child.notes ?? '',
            groupIds: child.groupIds,
          }
        : initialForm,
    );
    setDrawerOpen(true);
  };

  const saveChild = async () => {
    if (!form.name.trim()) {
      toast.error('Nome é obrigatório.');
      return;
    }

    try {
      const input = {
          ...form,
          name: form.name.trim(),
        };
      if (editingChild) await updateChild(editingChild.id, input);
      else await createChild(input);
      toast.success(editingChild ? 'Cadastro infantil atualizado.' : 'Criança cadastrada.');
      setDrawerOpen(false);
      setEditingChild(null);
      setForm(initialForm);
      await loadData();
    } catch {
      toast.error('Erro ao salvar cadastro infantil.');
    }
  };

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
    <div className="mx-auto max-w-5xl space-y-4 p-4">
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
          {canCreate ? <Button onClick={() => openDrawer()}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Criança
          </Button> : null}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
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
                {canUpdate ? <Button variant="outline" className="flex-1" onClick={() => openDrawer(child)}>Editar</Button> : null}
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

      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent className="max-h-[92vh]">
          <DrawerHeader>
            <DrawerTitle>{editingChild ? 'Editar Criança' : 'Nova Criança'}</DrawerTitle>
          </DrawerHeader>
          <div className="space-y-4 overflow-y-auto px-4 pb-6">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Nascimento</Label>
              <Input type="date" value={form.birthDate} onChange={(event) => setForm((current) => ({ ...current, birthDate: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Responsável principal</Label>
              <Select value={form.parentMemberIds[0] ?? ''} onValueChange={(value) => setForm((current) => ({ ...current, parentMemberIds: value ? [value] : [] }))}>
                <SelectTrigger><SelectValue placeholder="Selecione um responsável" /></SelectTrigger>
                <SelectContent>
                  {members.map((member) => (
                    <SelectItem key={member.id} value={member.id}>{member.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Grupo infantil</Label>
              <Select value={form.groupIds[0] ?? ''} onValueChange={(value) => setForm((current) => ({ ...current, groupIds: value ? [value] : [] }))}>
                <SelectTrigger><SelectValue placeholder="Selecione um grupo" /></SelectTrigger>
                <SelectContent>
                  {groups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Alergias</Label>
              <Textarea value={form.allergies} onChange={(event) => setForm((current) => ({ ...current, allergies: event.target.value }))} rows={2} />
            </div>
            <div className="space-y-2">
              <Label>Medicações</Label>
              <Textarea value={form.medications} onChange={(event) => setForm((current) => ({ ...current, medications: event.target.value }))} rows={2} />
            </div>
            <div className="space-y-2">
              <Label>Histórico relevante</Label>
              <Textarea value={form.healthHistory} onChange={(event) => setForm((current) => ({ ...current, healthHistory: event.target.value }))} rows={2} />
            </div>
            <div className="space-y-2">
              <Label>Restrições alimentares</Label>
              <Textarea value={form.dietaryRestrictions} onChange={(event) => setForm((current) => ({ ...current, dietaryRestrictions: event.target.value }))} rows={2} />
            </div>
            <div className="space-y-2">
              <Label>Atividades físicas</Label>
              <Select value={form.canDoPhysicalActivities ? 'yes' : 'no'} onValueChange={(value) => setForm((current) => ({ ...current, canDoPhysicalActivities: value === 'yes' }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Pode participar</SelectItem>
                  <SelectItem value="no">Possui restrição</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} rows={3} />
            </div>
            <Button className="w-full" onClick={() => void saveChild()}>
              {editingChild ? 'Salvar alterações' : 'Cadastrar criança'}
            </Button>
          </div>
        </DrawerContent>
      </Drawer>

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
    </div>
  );
}
