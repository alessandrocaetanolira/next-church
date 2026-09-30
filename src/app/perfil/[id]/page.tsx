'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowLeft, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AppImage } from '@/components/shared/AppImage';
import { getPublicMemberProfile, type PublicMemberProfile } from '@/services/members/public-profile-api';

function whatsapp(phone?: string | null) {
  const digits = (phone ?? '').replace(/\D/g, '');
  return digits ? `https://wa.me/${digits.startsWith('55') ? digits : `55${digits}`}` : null;
}

export default function PublicMemberProfilePage() {
  const params = useParams<{ id: string }>(); const router = useRouter();
  const [profile, setProfile] = useState<PublicMemberProfile | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { if (!params.id) return; void getPublicMemberProfile(params.id).then(setProfile).catch(() => setProfile(null)).finally(() => setLoading(false)); }, [params.id]);
  if (loading) return <div className="p-6 text-center text-muted-foreground">Carregando perfil...</div>;
  if (!profile) return <div className="p-6 text-center text-muted-foreground">Perfil não encontrado.</div>;
  const phoneLink = whatsapp(profile.phone);
  return <main className="min-h-screen bg-background"><div className="relative h-48 overflow-hidden bg-muted sm:h-64">{profile.coverUrl ? <AppImage src={profile.coverUrl} alt="Capa do perfil" className="h-full w-full object-cover" /> : null}<div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" /><Button variant="ghost" size="icon" className="absolute left-3 top-3 text-white hover:bg-white/15" onClick={() => router.back()}><ArrowLeft className="h-5 w-5" /></Button></div><section className="relative mx-auto -mt-14 max-w-lg px-4 pb-8"><div className="flex items-end gap-3"><div className="h-28 w-28 overflow-hidden rounded-full border-4 border-background bg-muted shadow-lg">{profile.avatarUrl ? <AppImage src={profile.avatarUrl} alt={profile.name} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-3xl font-bold text-muted-foreground">{profile.name.charAt(0)}</div>}</div><div className="pb-2"><h1 className="text-xl font-bold">{profile.name}</h1><p className="text-sm text-muted-foreground">{profile.role === 'ADMIN' ? 'Administrador' : profile.role === 'PASTOR' ? 'Pastor' : 'Membro'}</p></div></div><Card className="mt-5"><CardContent className="space-y-4 p-5"><p className="whitespace-pre-wrap text-sm leading-relaxed">{profile.aboutMe || 'Este membro ainda não adicionou uma descrição.'}</p>{phoneLink ? <Button asChild variant="outline" className="w-full"><a href={phoneLink} target="_blank" rel="noreferrer"><MessageCircle className="mr-2 h-4 w-4" />Conversar pelo WhatsApp</a></Button> : null}</CardContent></Card></section></main>;
}
