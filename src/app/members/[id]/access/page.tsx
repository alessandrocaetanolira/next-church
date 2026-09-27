'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { LoadingState, PageShell } from '@/components/common';
import { getMember, updateMemberAccess } from '@/services/members/members-api';
import { hasActionPermission } from '@/lib/access-control';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { permissionOptions } from '@/features/members/components/member-permissions';

type MemberAccess = {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'PASTOR' | 'LEADER' | 'MEMBER' | null;
  permissions: string[];
  hasAccess: boolean;
};

const roles = [
  ['MEMBER', 'Membro'],
  ['LEADER', 'Líder'],
  ['PASTOR', 'Pastor'],
  ['ADMIN', 'Admin'],
] as const;

export default function MemberAccessPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const canManageAccess = hasActionPermission(user, 'members', 'manage_access');
  const [member, setMember] = useState<MemberAccess | null>(null);
  const [role, setRole] = useState<MemberAccess['role']>('MEMBER');
  const [permissions, setPermissions] = useState<string[]>([]);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!params.id) return;
    void getMember<MemberAccess>(params.id).then((data) => {
      setMember(data);
      setRole(data.role ?? 'MEMBER');
      setPermissions(data.permissions ?? []);
    }).catch(() => toast.error('Erro ao carregar acesso do membro.')).finally(() => setLoading(false));
  }, [params.id]);

  const permissionGroups = useMemo(() => permissionOptions.reduce<Record<string, typeof permissionOptions[number][]>>((groups, item) => {
    const [module] = item.id.split(':');
    (groups[module] ??= []).push(item);
    return groups;
  }, {}), []);

  const togglePermission = (permission: string) => setPermissions((current) => current.includes(permission) ? current.filter((item) => item !== permission) : [...current, permission]);

  const save = async () => {
    if (!member) return;
    setSaving(true);
    try {
      await updateMemberAccess(member.id, { role, permissions, password });
      toast.success('Acesso atualizado.');
      setPassword('');
      setMember((current) => current ? { ...current, role, permissions, hasAccess: true } : current);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível atualizar o acesso.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingState className="min-h-[60vh]" label="Carregando acesso..." />;
  if (!member) return <PageShell><p className="py-10 text-center text-muted-foreground">Membro não encontrado.</p></PageShell>;
  if (!canManageAccess) return <PageShell><p className="py-10 text-center text-muted-foreground">Você não tem permissão para administrar acessos.</p></PageShell>;

  return (
    <PageShell size="narrow">
      <div className="flex items-center gap-3 border-b border-border pb-4">
        <div><h1 className="text-xl font-semibold">Acesso e permissões</h1><p className="text-sm text-muted-foreground">{member.name} · {member.email}</p></div>
      </div>
      <div className="space-y-6">
        <div className="space-y-2"><Label>Perfil</Label><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{roles.map(([value, label]) => <Button key={value} type="button" variant={role === value ? 'default' : 'outline'} onClick={() => setRole(value)}>{role === value ? <Check className="mr-2 h-4 w-4" /> : null}{label}</Button>)}</div></div>
        <div className="space-y-4"><div><Label>Permissões</Label><p className="text-sm text-muted-foreground">Selecione os módulos e ações disponíveis para este membro.</p></div>{Object.entries(permissionGroups).map(([module, items]) => <section key={module} className="space-y-2 rounded-xl border p-3"><h2 className="text-sm font-semibold capitalize">{module.replace('_', ' ')}</h2><div className="flex flex-wrap gap-2">{items.map((item) => <Button key={item.id} type="button" size="sm" variant={permissions.includes(item.id) ? 'default' : 'outline'} onClick={() => togglePermission(item.id)}>{permissions.includes(item.id) ? <Check className="mr-1 h-3.5 w-3.5" /> : null}{item.label}</Button>)}</div></section>)}</div>
        <div className="space-y-2"><Label htmlFor="member-access-password">Senha {member.hasAccess ? '(opcional)' : '(obrigatória)'}</Label><Input id="member-access-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder={member.hasAccess ? 'Deixe vazio para manter a atual' : 'Defina uma senha'} /></div>
        <div className="flex items-center justify-between gap-3"><Badge variant={member.hasAccess ? 'success' : 'secondary'}>{member.hasAccess ? 'Acesso liberado' : 'Sem acesso'}</Badge><Button onClick={() => void save()} disabled={saving}>{saving ? 'Salvando...' : 'Salvar acesso'}</Button></div>
      </div>
    </PageShell>
  );
}
