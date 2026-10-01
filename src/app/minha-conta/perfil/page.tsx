'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Camera, ImagePlus, Save, X } from 'lucide-react';
import { toast } from 'sonner';
import { PageShell, LoadingState } from '@/components/common';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getProfile, updateProfile, uploadProfileAvatar, uploadProfileCover, type UserProfile } from '@/services/profile/profile-api';
import { maskPhone } from '@/lib/utils';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';

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
      <Dialog open={mediaViewer !== null} onOpenChange={(open) => { if (!open) setMediaViewer(null); }}>
        <DialogContent className="h-[100dvh] w-full max-w-none rounded-none border-0 bg-black p-0 text-white sm:rounded-none [&>button:last-child]:hidden">
          <DialogTitle className="sr-only">{mediaViewer === 'cover' ? 'Capa do perfil' : 'Foto do perfil'}</DialogTitle>
          <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between p-4 pt-[max(1rem,env(safe-area-inset-top))]">
            <Button type="button" variant="ghost" size="icon" className="rounded-full bg-black/45 text-white hover:bg-black/70 hover:text-white" onClick={() => setMediaViewer(null)} aria-label="Fechar imagem"><X className="h-5 w-5" /></Button>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-black/45 px-3 py-2 text-sm font-medium text-white hover:bg-black/70">
              <ImagePlus className="h-4 w-4" />Alterar imagem
              <input type="file" accept="image/*" className="hidden" onChange={mediaViewer === 'cover' ? handleCoverChange : handleAvatarChange} />
            </label>
          </div>
          <div className="flex h-full w-full items-center justify-center p-4">
            <img src={mediaViewer === 'cover' ? coverPreview ?? '' : avatarPreview ?? ''} alt={mediaViewer === 'cover' ? 'Capa do perfil' : 'Foto do perfil'} className={mediaViewer === 'cover' ? 'max-h-full w-full object-contain' : 'max-h-[70vh] max-w-[90vw] rounded-full object-contain'} />
          </div>
        </DialogContent>
      </Dialog>
      <form onSubmit={save} className="space-y-5">
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="relative aspect-[3/1] min-h-32 bg-muted">
            {coverPreview ? <button type="button" className="block h-full w-full cursor-zoom-in text-left" onClick={() => setMediaViewer('cover')} aria-label="Ver capa do perfil em tela cheia"><img src={coverPreview} alt="Capa do perfil" className="h-full w-full object-cover" /></button> : <label className="flex h-full w-full cursor-pointer items-center justify-center gap-2 text-sm text-muted-foreground hover:bg-muted/70"><ImagePlus className="h-5 w-5" />Carregar imagem<input type="file" accept="image/*" className="hidden" onChange={handleCoverChange} /></label>}
          </div>
          <div className="flex items-center justify-between gap-3 px-4 py-3"><div><p className="font-medium">Capa do perfil</p><p className="text-xs text-muted-foreground">Use uma imagem horizontal para destacar seu perfil.</p></div>{coverPreview ? <label className="inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10"><ImagePlus className="h-4 w-4" />Alterar<input type="file" accept="image/*" className="hidden" onChange={handleCoverChange} /></label> : null}</div>
        </div>
        <div className="flex flex-col items-center gap-3 rounded-xl border border-border p-5 sm:flex-row">
          {avatarPreview ? <button type="button" className="cursor-zoom-in rounded-full" onClick={() => setMediaViewer('avatar')} aria-label="Ver foto do perfil em tela cheia"><Avatar className="h-24 w-24 border border-border"><AvatarImage src={avatarPreview} alt={form.name} /><AvatarFallback className="bg-primary/10 text-2xl text-primary">{profileInitials}</AvatarFallback></Avatar></button> : <label className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-full border border-dashed border-border text-xs text-muted-foreground hover:bg-muted/60"><Camera className="h-5 w-5" />Carregar<input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} /></label>}
          <div className="text-center sm:text-left"><p className="font-medium">Foto do perfil</p><p className="mt-1 text-xs text-muted-foreground">Sua foto ficará visível para outros membros da igreja.</p><label className="mt-3 inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-primary hover:underline"><Camera className="h-4 w-4" />{avatarPreview ? 'Alterar foto' : 'Carregar foto'}<input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} /></label></div>
        </div>

        <div className="space-y-2"><Label htmlFor="profile-name">Nome</Label><Input id="profile-name" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} /></div>
        <div className="space-y-2"><Label>E-mail</Label><Input value={profile.email} disabled /><p className="text-xs text-muted-foreground">O e-mail de acesso não pode ser alterado nesta tela.</p></div>
        <div className="space-y-2"><Label htmlFor="profile-phone">Telefone</Label><Input id="profile-phone" type="tel" inputMode="tel" autoComplete="tel" maxLength={15} value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: maskPhone(event.target.value) }))} placeholder="(00) 00000-0000" /></div>
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
