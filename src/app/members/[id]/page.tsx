'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Pencil, Shield, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { MemberForm } from '@/components/forms/MemberForm';

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
  role: MemberRole | null;
  permissions: string[];
  hasAccess: boolean;
  createdAt?: string;
  updatedAt?: string;
}

const permissionOptions = [
  { id: 'canteen', label: 'Cantina' },
  { id: 'settings', label: 'Configurações' },
  { id: 'tasks', label: 'Escalas' },
  { id: 'teams', label: 'Grupos' },
  { id: 'materials', label: 'Materiais' },
  { id: 'pastor', label: 'Área Pastoral' },
] as const;

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

const formatDate = (value?: string | null) => {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('pt-BR');
};

export default function MemberDetailsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const memberId = typeof params?.id === 'string' ? params.id : '';

  const [member, setMember] = useState<ManagedMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [accessOpen, setAccessOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [accessRole, setAccessRole] = useState<MemberRole>('MEMBER');
  const [accessPermissions, setAccessPermissions] = useState<string[]>([]);
  const [accessPassword, setAccessPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [savingAccess, setSavingAccess] = useState(false);

  useEffect(() => {
    if (memberId) {
      void loadMember();
    }
  }, [memberId]);

  const loadMember = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/members/${memberId}`);
      if (!response.ok) throw new Error();
      const data: ManagedMember = await response.json();
      setMember(data);
      setAccessRole(data.role ?? 'MEMBER');
      setAccessPermissions(data.permissions ?? []);
      setChangingPassword(!data.hasAccess);
      setAccessPassword('');
    } catch {
      toast.error('Erro ao carregar membro.');
    } finally {
      setLoading(false);
    }
  };

  const togglePermission = (permission: string) => {
    setAccessPermissions((current) =>
      current.includes(permission)
        ? current.filter((item) => item !== permission)
        : [...current, permission]
    );
  };

  const handleSaveAccess = async () => {
    if (!member) return;
    setSavingAccess(true);

    try {
      const response = await fetch(`/api/members/${member.id}/access`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: accessRole,
          permissions: accessPermissions,
          ...(changingPassword ? { password: accessPassword } : {}),
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? 'Erro ao salvar acesso.');
      }

      toast.success('Perfil e permissões atualizados.');
      setAccessOpen(false);
      await loadMember();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao salvar acesso.';
      toast.error(message);
    } finally {
      setSavingAccess(false);
    }
  };

  const handleDeleteMember = async () => {
    if (!member) return;

    try {
      const response = await fetch(`/api/members/${member.id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error();
      toast.success('Membro excluído.');
      router.push('/members');
    } catch {
      toast.error('Erro ao excluir membro.');
    }
  };

  if (loading) {
    return <div className="p-4">Carregando...</div>;
  }

  if (!member) {
    return <div className="p-4">Membro não encontrado.</div>;
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Button variant="ghost" className="h-8 w-fit px-0 text-muted-foreground" onClick={() => router.push('/members')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para membros
          </Button>
          <div>
            <h2 className="text-xl font-bold">{member.name}</h2>
            <p className="text-sm text-muted-foreground">{member.email} • {member.phone}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant={member.approved ? 'success' : 'secondary'}>
              {member.approved ? 'Aprovado' : 'Pendente'}
            </Badge>
            <Badge variant={member.role ? 'outline' : 'secondary'}>
              {member.role ? roleLabels[member.role] : 'Sem acesso'}
            </Badge>
            <Badge variant="outline">{member.permissions.length} permissões</Badge>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" />
            Editar
          </Button>
          <Button variant="outline" onClick={() => setAccessOpen(true)}>
            <Shield className="mr-2 h-4 w-4" />
            Acesso
          </Button>
          <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="mr-2 h-4 w-4" />
            Excluir
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dados Pessoais</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground">Telefone do responsável</p>
              <p className="text-sm">{member.parentPhone || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Estado civil</p>
              <p className="text-sm">{member.maritalStatus ? (maritalStatusLabels[member.maritalStatus] ?? member.maritalStatus) : '-'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Nascimento</p>
              <p className="text-sm">{formatDate(member.birthDate)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Conversão</p>
              <p className="text-sm">{formatDate(member.conversionDate)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Batismo</p>
              <p className="text-sm">{formatDate(member.baptismDate)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Igreja anterior</p>
              <p className="text-sm">{member.previousChurch || '-'}</p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-xs text-muted-foreground">Sobre</p>
              <div className="rounded-xl border border-border bg-muted/30 p-3 text-sm">
                {member.aboutMe || '-'}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Acesso e Permissões</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground">Perfil atual</p>
              <p className="text-sm font-medium">{member.role ? roleLabels[member.role] : 'Sem acesso liberado'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Permissões</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {member.permissions.length > 0 ? member.permissions.map((permission) => (
                  <Badge key={permission} variant="outline">
                    {permissionOptions.find((item) => item.id === permission)?.label ?? permission}
                  </Badge>
                )) : <Badge variant="secondary">Nenhuma permissão extra</Badge>}
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Acesso ao app</p>
              <p className="text-sm">{member.hasAccess ? 'Liberado' : 'Ainda sem login liberado'}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Drawer open={editOpen} onOpenChange={setEditOpen}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader>
            <DrawerTitle>Editar Membro</DrawerTitle>
          </DrawerHeader>
          <div className="overflow-y-auto px-4 pb-6">
            <MemberForm
              member={member}
              onSuccess={() => {
                setEditOpen(false);
                void loadMember();
              }}
            />
          </div>
        </DrawerContent>
      </Drawer>

      <Drawer open={accessOpen} onOpenChange={setAccessOpen}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader>
            <DrawerTitle>Perfil e Permissões</DrawerTitle>
          </DrawerHeader>
          <div className="space-y-4 overflow-y-auto px-4 pb-6">
            <p className="text-sm text-muted-foreground">
              Ajuste o acesso de {member.name} para líder, pastor, admin ou membro.
            </p>
            <div className="space-y-2">
              <Label>Perfil</Label>
              <Select value={accessRole} onValueChange={(value: MemberRole) => setAccessRole(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MEMBER">Membro</SelectItem>
                  <SelectItem value="LEADER">Líder</SelectItem>
                  <SelectItem value="PASTOR">Pastor</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Permissões</Label>
              <div className="flex flex-wrap gap-2">
                {permissionOptions.map((permission) => {
                  const active = accessPermissions.includes(permission.id);
                  return (
                    <Button
                      key={permission.id}
                      type="button"
                      variant={active ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => togglePermission(permission.id)}
                    >
                      {permission.label}
                    </Button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <Label>Senha de Acesso</Label>
                <Button
                  type="button"
                  variant={changingPassword ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setChangingPassword((current) => !current);
                    setAccessPassword('');
                  }}
                >
                  {changingPassword ? 'Cancelar troca' : 'Alterar senha'}
                </Button>
              </div>
              {changingPassword ? (
                <>
                  <Input
                    type="password"
                    placeholder="Defina ou redefina a senha"
                    value={accessPassword}
                    onChange={(event) => setAccessPassword(event.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Obrigatória ao liberar acesso pela primeira vez. Quando este campo estiver fechado, a senha atual é preservada.
                  </p>
                </>
              ) : (
                <p className="text-xs text-muted-foreground">
                  A senha só será alterada quando você usar o botão acima.
                </p>
              )}
            </div>

            <Button className="w-full" onClick={handleSaveAccess} disabled={savingAccess}>
              {savingAccess ? 'Salvando...' : 'Salvar Acesso'}
            </Button>
          </div>
        </DrawerContent>
      </Drawer>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir membro</DialogTitle>
            <DialogDescription>
              Esta ação remove {member.name} da listagem administrativa.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => void handleDeleteMember()}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
