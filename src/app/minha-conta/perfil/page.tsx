'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { ImagePlus, Save, UserRound, Mail, Phone, LockKeyhole, Globe2 } from 'lucide-react';
import { toast } from 'sonner';
import { PageShell, LoadingState } from '@/components/common';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getProfile, updateProfile, uploadProfileAvatar, uploadProfileCover, type UserProfile } from '@/services/profile/profile-api';
import { maskPhone } from '@/lib/utils';
import { FullscreenMediaViewer } from '@/components/shared/FullscreenMediaViewer';
import { ProfileHero, ProfileInfoRow, ProfileMediaAction, ProfileSection } from '@/components/profile/ProfilePrimitives';

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
  const { update: updateSession } = useSession();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [form, setForm] = useState<ProfileForm>({ name: '', phone: '', birthDate: '', aboutMe: '', maritalStatus: 'single' });
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [coverDataUrl, setCoverDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mediaViewer, setMediaViewer] = useState<'cover' | 'avatar' | null>(null);

  useEffect(() => {
    void getProfile()
      .then((value) => {
        setProfile(value);
        setForm({ name: value.name, phone: maskPhone(value.phone), birthDate: value.birthDate ? value.birthDate.slice(0, 10) : '', aboutMe: value.aboutMe ?? '', maritalStatus: value.maritalStatus || 'single' });
        setAvatarPreview(value.avatarUrl ?? null);
        setCoverPreview(value.coverUrl ?? null);
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

  const handleCoverChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Selecione uma imagem válida.');
      return;
    }
    try {
      const dataUrl = await readDataUrl(file);
      setCoverDataUrl(dataUrl);
      setCoverPreview(dataUrl);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível carregar a capa.');
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
      let coverUrl = profile.coverUrl ?? null;
      if (coverDataUrl) coverUrl = (await uploadProfileCover(coverDataUrl)).url;
      const updated = await updateProfile({ ...form, name: form.name.trim(), avatarUrl, coverUrl });
      setProfile(updated);
      setAvatarDataUrl(null);
      setAvatarPreview(updated.avatarUrl ?? null);
      setCoverDataUrl(null);
      setCoverPreview(updated.coverUrl ?? null);
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
      <FullscreenMediaViewer
        open={mediaViewer !== null}
        onOpenChange={(open) => { if (!open) setMediaViewer(null); }}
        src={mediaViewer === 'cover' ? coverPreview : avatarPreview}
        alt={mediaViewer === 'cover' ? 'Capa do perfil' : 'Foto do perfil'}
        kind={mediaViewer ?? 'cover'}
        actions={<label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-black/45 px-3 py-2 text-sm font-medium text-white hover:bg-black/70"><ImagePlus className="h-4 w-4" />Alterar imagem<input type="file" accept="image/*" className="hidden" onChange={mediaViewer === 'cover' ? handleCoverChange : handleAvatarChange} /></label>}
      />
      <form onSubmit={save} className="space-y-6">
        <ProfileHero name={form.name} email={profile.email} initials={profileInitials} avatarUrl={avatarPreview} coverUrl={coverPreview} onViewAvatar={() => setMediaViewer('avatar')} onViewCover={() => setMediaViewer('cover')} onAvatarChange={handleAvatarChange} onCoverChange={handleCoverChange} />

        <div className="grid gap-3 sm:grid-cols-2">
          <ProfileMediaAction icon={UserRound} title="Foto do perfil" description="Visível para outros membros da igreja." onClick={() => setMediaViewer('avatar')} />
          <ProfileMediaAction icon={ImagePlus} title="Capa do perfil" description="Use uma imagem horizontal para destacar seu perfil." tone="violet" onClick={() => setMediaViewer('cover')} />
        </div>

        <ProfileSection title="Informações pessoais">
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <ProfileInfoRow icon={UserRound} label="Nome"><Input id="profile-name" aria-label="Nome" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} className="mt-1 h-8 border-0 p-0 shadow-none focus-visible:ring-0" /></ProfileInfoRow>
            <ProfileInfoRow icon={Mail} label="E-mail" value={profile.email} />
            <ProfileInfoRow icon={Phone} label="Telefone"><Input id="profile-phone" aria-label="Telefone" type="tel" inputMode="tel" autoComplete="tel" maxLength={15} value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: maskPhone(event.target.value) }))} placeholder="(00) 00000-0000" className="mt-1 h-8 border-0 p-0 shadow-none focus-visible:ring-0" /></ProfileInfoRow>
            <ProfileInfoRow icon={UserRound} label="Nascimento"><Input id="profile-birth-date" aria-label="Nascimento" type="date" value={form.birthDate ?? ''} onChange={(event) => setForm((current) => ({ ...current, birthDate: event.target.value }))} className="mt-1 h-8 border-0 p-0 shadow-none focus-visible:ring-0" /></ProfileInfoRow>
            <ProfileInfoRow icon={UserRound} label="Estado civil"><Select value={form.maritalStatus} onValueChange={(value) => setForm((current) => ({ ...current, maritalStatus: value }))}><SelectTrigger className="mt-1 h-8 border-0 p-0 shadow-none focus:ring-0"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="single">Solteiro(a)</SelectItem><SelectItem value="married">Casado(a)</SelectItem><SelectItem value="divorced">Divorciado(a)</SelectItem><SelectItem value="widowed">Viúvo(a)</SelectItem></SelectContent></Select></ProfileInfoRow>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm"><Label htmlFor="profile-about">Sobre você</Label><Textarea id="profile-about" rows={4} value={form.aboutMe} onChange={(event) => setForm((current) => ({ ...current, aboutMe: event.target.value }))} placeholder="Conte um pouco sobre você" className="mt-2 resize-none" /></div>
        </ProfileSection>

        <ProfileSection title="Segurança">
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"><ProfileInfoRow icon={LockKeyhole} label="Alterar senha" value="Defina uma nova senha para sua conta." /></div>
        </ProfileSection>

        <ProfileSection title="Preferências">
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"><ProfileInfoRow icon={Globe2} label="Idioma" value="Português (Brasil)" /></div>
        </ProfileSection>

        <Button type="submit" className="w-full" disabled={saving}><Save className="mr-2 h-4 w-4" />{saving ? 'Salvando...' : 'Salvar alterações'}</Button>
      </form>
    </PageShell>
  );
}
