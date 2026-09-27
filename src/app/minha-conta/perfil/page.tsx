'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ArrowLeft, Camera, Save } from 'lucide-react';
import { toast } from 'sonner';
import { PageShell, LoadingState } from '@/components/common';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getProfile, updateProfile, uploadProfileAvatar, type UserProfile } from '@/services/profile/profile-api';

type ProfileForm = Pick<UserProfile, 'name' | 'phone' | 'birthDate' | 'aboutMe' | 'maritalStatus'>;

function initials(name: string) {
  return name.split(' ').filter(Boolean).map((part) => part[0]).join('').toUpperCase().slice(0, 2) || 'U';
}

function readDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Imagem inválida.'));
    reader.onerror = () => reject(new Error('Não foi possível ler a imagem.'));
    reader.readAsDataURL(file);
  });
}

export default function UserProfilePage() {
  const router = useRouter();
  const { update: updateSession } = useSession();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [form, setForm] = useState<ProfileForm>({ name: '', phone: '', birthDate: '', aboutMe: '', maritalStatus: 'single' });
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void getProfile()
      .then((value) => {
        setProfile(value);
        setForm({ name: value.name, phone: value.phone ?? '', birthDate: value.birthDate ? value.birthDate.slice(0, 10) : '', aboutMe: value.aboutMe ?? '', maritalStatus: value.maritalStatus || 'single' });
        setAvatarPreview(value.avatarUrl ?? null);
      })
      .catch((error) => toast.error(error instanceof Error ? error.message : 'Não foi possível carregar seu perfil.'))
      .finally(() => setLoading(false));
  }, []);

  const profileInitials = useMemo(() => initials(form.name), [form.name]);

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Selecione uma imagem válida.');
      return;
    }
    try {
      const dataUrl = await readDataUrl(file);
      setAvatarDataUrl(dataUrl);
      setAvatarPreview(dataUrl);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível carregar o avatar.');
    }
  };

  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!profile || !form.name.trim()) {
      toast.error('Nome é obrigatório.');
      return;
    }
    setSaving(true);
    try {
      let avatarUrl = profile.avatarUrl ?? null;
      if (avatarDataUrl) avatarUrl = (await uploadProfileAvatar(avatarDataUrl)).url;
      const updated = await updateProfile({ ...form, name: form.name.trim(), avatarUrl });
      setProfile(updated);
      setAvatarDataUrl(null);
      setAvatarPreview(updated.avatarUrl ?? null);
      await updateSession();
      toast.success('Perfil atualizado.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível salvar o perfil.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingState className="min-h-[60vh]" label="Carregando perfil..." />;
  if (!profile) return <PageShell size="narrow"><p className="py-10 text-center text-muted-foreground">Perfil não encontrado.</p></PageShell>;

  return (
    <PageShell size="narrow">
      <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Perfil do usuário</h1>
          <p className="text-sm text-muted-foreground">Atualize suas informações pessoais e sua foto.</p>
        </div>
        <Button type="button" variant="ghost" className="-ml-2 self-start sm:ml-0 sm:self-auto" onClick={() => router.push('/minha-conta')}>
          <ArrowLeft className="mr-2 h-4 w-4" />Voltar para minha conta
        </Button>
      </div>

      <form onSubmit={save} className="space-y-5">
        <div className="flex flex-col items-center gap-3 rounded-xl border border-border p-5 sm:flex-row">
          <Avatar className="h-24 w-24 border border-border">
            {avatarPreview ? <AvatarImage src={avatarPreview} alt={form.name} /> : null}
            <AvatarFallback className="bg-primary/10 text-2xl text-primary">{profileInitials}</AvatarFallback>
          </Avatar>
          <div className="text-center sm:text-left">
            <p className="font-medium">Foto do perfil</p>
            <p className="mt-1 text-xs text-muted-foreground">A imagem será convertida automaticamente para WebP.</p>
            <label className="mt-3 inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-primary hover:underline">
              <Camera className="h-4 w-4" />Alterar foto
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </label>
          </div>
        </div>

        <div className="space-y-2"><Label htmlFor="profile-name">Nome</Label><Input id="profile-name" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} /></div>
        <div className="space-y-2"><Label>E-mail</Label><Input value={profile.email} disabled /><p className="text-xs text-muted-foreground">O e-mail de acesso não pode ser alterado nesta tela.</p></div>
        <div className="space-y-2"><Label htmlFor="profile-phone">Telefone</Label><Input id="profile-phone" value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} /></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2"><Label htmlFor="profile-birth-date">Nascimento</Label><Input id="profile-birth-date" type="date" value={form.birthDate ?? ''} onChange={(event) => setForm((current) => ({ ...current, birthDate: event.target.value }))} /></div>
          <div className="space-y-2"><Label>Estado civil</Label><Select value={form.maritalStatus} onValueChange={(value) => setForm((current) => ({ ...current, maritalStatus: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="single">Solteiro(a)</SelectItem><SelectItem value="married">Casado(a)</SelectItem><SelectItem value="divorced">Divorciado(a)</SelectItem><SelectItem value="widowed">Viúvo(a)</SelectItem></SelectContent></Select></div>
        </div>
        <div className="space-y-2"><Label htmlFor="profile-about">Sobre você</Label><Textarea id="profile-about" rows={5} value={form.aboutMe} onChange={(event) => setForm((current) => ({ ...current, aboutMe: event.target.value }))} placeholder="Conte um pouco sobre você" /></div>
        <Button type="submit" className="w-full" disabled={saving}><Save className="mr-2 h-4 w-4" />{saving ? 'Salvando...' : 'Salvar alterações'}</Button>
      </form>
    </PageShell>
  );
}
