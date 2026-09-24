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
import { Car, CarFront, Plus, Send } from 'lucide-react';
import { toast } from 'sonner';
import { hasActionPermission } from '@/lib/access-control';
import {
  createParkingSpot,
  deleteParkingSpot,
  listParkingGroups,
  listParkingMembers,
  listParkingSpots,
  notifyParkingResponsible,
  publishParkingFeed,
  updateParkingSpot,
  updateParkingSpotStatus,
  type ParkingGroup,
  type ParkingMember,
  type ParkingSpot,
} from '@/services/parking/parking-api';

type GroupOption = ParkingGroup;
type SpotItem = ParkingSpot;
type MemberOption = ParkingMember;

const initialForm = {
  groupId: '',
  label: '',
  status: 'free',
  occupiedByMemberId: '',
  occupiedByName: '',
  notes: '',
};

export default function ParkingPage() {
  const setPageTitle = useUIStore((state) => state.setPageTitle);
  const { user } = useAuth();
  const [groups, setGroups] = useState<GroupOption[]>([]);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [spots, setSpots] = useState<SpotItem[]>([]);
  const [activeGroupId, setActiveGroupId] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingSpot, setEditingSpot] = useState<SpotItem | null>(null);
  const [messageSpot, setMessageSpot] = useState<SpotItem | null>(null);
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
  const canCreate = hasActionPermission(user, 'parking', 'create');
  const canUpdate = hasActionPermission(user, 'parking', 'update');
  const canDelete = hasActionPermission(user, 'parking', 'delete');
  const canPublishToFeed = hasActionPermission(user, 'feed', 'share');

  useEffect(() => {
    setPageTitle('Estacionamento');
    void loadBaseData();
  }, [setPageTitle]);

  useEffect(() => {
    if (!activeGroupId) return;
    void loadSpots(activeGroupId);
  }, [activeGroupId]);

  const loadBaseData = async () => {
    try {
      const [groupsPayload, membersPayload] = await Promise.all([listParkingGroups(), listParkingMembers()]);
      const nextGroups = Array.isArray(groupsPayload) ? groupsPayload : [];
      setGroups(nextGroups);
      setMembers(Array.isArray(membersPayload) ? membersPayload : []);
      setPostForm((current) => ({
        ...current,
        groupId: current.groupId || nextGroups[0]?.id || '',
      }));
      if (nextGroups[0]?.id) {
        setActiveGroupId((current) => current || nextGroups[0].id);
      }
    } catch {
      toast.error('Erro ao carregar estacionamento.');
    }
  };

  const loadSpots = async (groupId: string) => {
    try {
      const payload = await listParkingSpots(groupId);
      setSpots(Array.isArray(payload) ? payload : []);
    } catch {
      toast.error('Erro ao carregar vagas.');
    }
  };

  const groupedStats = useMemo(() => ({
    total: spots.length,
    free: spots.filter((spot) => spot.status === 'free').length,
    occupied: spots.filter((spot) => spot.status !== 'free').length,
  }), [spots]);

  const openDrawer = (spot?: SpotItem) => {
    setEditingSpot(spot ?? null);
    setForm(
      spot
        ? {
            groupId: spot.groupId,
            label: spot.label,
            status: spot.status,
            occupiedByMemberId: spot.occupiedByMemberId ?? '',
            occupiedByName: spot.occupiedByName ?? '',
            notes: spot.notes ?? '',
          }
        : {
            ...initialForm,
            groupId: activeGroupId,
          },
    );
    setDrawerOpen(true);
  };

  const saveSpot = async () => {
    if (!form.groupId || !form.label.trim()) {
      toast.error('Grupo e vaga são obrigatórios.');
      return;
    }

    try {
      const input = { ...form, occupiedAt: form.status === 'free' ? null : new Date().toISOString() };
      if (editingSpot) await updateParkingSpot(editingSpot.id, input);
      else await createParkingSpot(input);
      toast.success(editingSpot ? 'Vaga atualizada.' : 'Vaga criada.');
      setDrawerOpen(false);
      setEditingSpot(null);
      setForm(initialForm);
      await loadSpots(form.groupId);
    } catch {
      toast.error('Erro ao salvar vaga.');
    }
  };

  const updateStatus = async (spot: SpotItem, status: string) => {
    try {
      await updateParkingSpotStatus(spot.id, {
        status,
        occupiedByMemberId: status === 'free' ? null : spot.occupiedByMemberId,
        occupiedByName: status === 'free' ? null : spot.occupiedByName,
        notes: spot.notes,
        occupiedAt: status === 'free' ? null : new Date().toISOString(),
      });
      await loadSpots(spot.groupId);
    } catch {
      toast.error('Erro ao atualizar vaga.');
    }
  };

  const deleteSpot = async (id: string, groupId: string) => {
    if (!confirm('Remover esta vaga?')) return;
    try {
      await deleteParkingSpot(id);
      toast.success('Vaga removida.');
      await loadSpots(groupId);
    } catch {
      toast.error('Erro ao remover vaga.');
    }
  };

  const sendPrivateMessage = async () => {
    if (!messageSpot) return;
    if (!messageForm.title.trim() || !messageForm.message.trim()) {
      toast.error('Título e mensagem são obrigatórios.');
      return;
    }

    setSendingMessage(true);
    try {
      await notifyParkingResponsible(messageSpot.id, {
        title: messageForm.title.trim(),
        message: messageForm.message.trim(),
      });

      toast.success('Mensagem privada enviada ao responsável pelo veículo.');
      setMessageSpot(null);
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
      await publishParkingFeed({
          type: 'event',
          share: true,
          title: postForm.title.trim() || undefined,
          content: postForm.content.trim(),
          visibility: 'group',
          groupId: postForm.groupId,
          postAsGroup: true,
          pinDays: Number(postForm.pinDays) || 0,
        });

      toast.success('Aviso publicado no feed do grupo de estacionamento.');
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
        <div className="flex gap-3">
          <Select value={activeGroupId} onValueChange={setActiveGroupId}>
            <SelectTrigger className="min-w-56"><SelectValue placeholder="Selecione um grupo" /></SelectTrigger>
            <SelectContent>
              {groups.map((group) => (
                <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
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
            Nova vaga
          </Button> : null}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardContent className="space-y-1 pt-4"><p className="text-sm text-muted-foreground">Total</p><p className="text-2xl font-bold">{groupedStats.total}</p></CardContent></Card>
        <Card><CardContent className="space-y-1 pt-4"><p className="text-sm text-muted-foreground">Livres</p><p className="text-2xl font-bold text-emerald-600">{groupedStats.free}</p></CardContent></Card>
        <Card><CardContent className="space-y-1 pt-4"><p className="text-sm text-muted-foreground">Ocupadas</p><p className="text-2xl font-bold text-amber-600">{groupedStats.occupied}</p></CardContent></Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {spots.map((spot) => (
          <Card key={spot.id}>
            <CardContent className="space-y-3 pt-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <CarFront className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold">{spot.label}</p>
                    <p className="text-xs text-muted-foreground">{groups.find((group) => group.id === spot.groupId)?.name ?? 'Grupo'}</p>
                  </div>
                </div>
                <Badge variant={spot.status === 'free' ? 'secondary' : 'default'}>
                  {spot.status === 'free' ? 'Livre' : 'Ocupada'}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {spot.occupiedByName ? `Uso atual: ${spot.occupiedByName}` : 'Sem ocupação atual.'}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {canUpdate ? <Button variant="outline" onClick={() => openDrawer(spot)}>Editar</Button> : null}
                {canUpdate ? <Button variant={spot.status === 'free' ? 'default' : 'secondary'} onClick={() => void updateStatus(spot, spot.status === 'free' ? 'occupied' : 'free')}>
                  {spot.status === 'free' ? 'Ocupar' : 'Liberar'}
                </Button> : null}
              </div>
              {spot.occupiedByMemberId ? (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setMessageSpot(spot);
                    setMessageForm({
                      title: `Aviso sobre a vaga ${spot.label}`,
                      message: '',
                    });
                  }}
                >
                  <Send className="mr-2 h-4 w-4" />
                  Avisar responsável
                </Button>
              ) : null}
              {canDelete ? <Button variant="destructive" className="w-full" onClick={() => void deleteSpot(spot.id, spot.groupId)}>
                Remover vaga
              </Button> : null}
            </CardContent>
          </Card>
        ))}
      </div>

      {spots.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Car className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">Nenhuma vaga cadastrada.</p>
          </CardContent>
        </Card>
      ) : null}

      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent className="max-h-[92vh]">
          <DrawerHeader>
            <DrawerTitle>{editingSpot ? 'Editar vaga' : 'Nova vaga'}</DrawerTitle>
          </DrawerHeader>
          <div className="space-y-4 overflow-y-auto px-4 pb-6">
            <div className="space-y-2">
              <Label>Grupo</Label>
              <Select value={form.groupId} onValueChange={(value) => setForm((current) => ({ ...current, groupId: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {groups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Vaga</Label>
              <Input value={form.label} onChange={(event) => setForm((current) => ({ ...current, label: event.target.value }))} placeholder="Ex: A1" />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(value) => setForm((current) => ({ ...current, status: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Livre</SelectItem>
                  <SelectItem value="occupied">Ocupada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.status !== 'free' ? (
              <>
                <div className="space-y-2">
                  <Label>Membro</Label>
                  <Select
                    value={form.occupiedByMemberId}
                    onValueChange={(value) => {
                      const member = members.find((item) => item.id === value);
                      setForm((current) => ({
                        ...current,
                        occupiedByMemberId: value,
                        occupiedByName: member?.name ?? '',
                      }));
                    }}
                  >
                    <SelectTrigger><SelectValue placeholder="Selecione um membro" /></SelectTrigger>
                    <SelectContent>
                      {members.map((member) => (
                        <SelectItem key={member.id} value={member.id}>{member.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Observações</Label>
                  <Input value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Placa, referência ou observação" />
                </div>
              </>
            ) : null}
            <Button className="w-full" onClick={() => void saveSpot()}>
              {editingSpot ? 'Salvar alterações' : 'Cadastrar vaga'}
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
              <Label>Grupo de estacionamento</Label>
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
              {publishingPost ? 'Publicando...' : 'Publicar em nome do grupo de estacionamento'}
            </Button>
          </div>
        </DrawerContent>
      </Drawer>

      <Drawer open={Boolean(messageSpot)} onOpenChange={(open) => {
        if (!open) {
          setMessageSpot(null);
          setMessageForm({ title: '', message: '' });
        }
      }}>
        <DrawerContent className="max-h-[92vh]">
          <DrawerHeader>
            <DrawerTitle>
              {messageSpot ? `Mensagem privada: ${messageSpot.label}` : 'Mensagem privada'}
            </DrawerTitle>
          </DrawerHeader>
          <div className="space-y-4 overflow-y-auto px-4 pb-6">
            <div className="space-y-2">
              <Label>Título</Label>
              <Input value={messageForm.title} onChange={(event) => setMessageForm((current) => ({ ...current, title: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Mensagem</Label>
              <Input value={messageForm.message} onChange={(event) => setMessageForm((current) => ({ ...current, message: event.target.value }))} />
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
