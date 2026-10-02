'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowLeft, Gamepad2, MessageCircle, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AppImage } from '@/components/shared/AppImage';
import { FullscreenMediaViewer } from '@/components/shared/FullscreenMediaViewer';
import { getPublicMemberProfile, type PublicMemberProfile } from '@/services/members/public-profile-api';

function whatsapp(phone?: string | null) {
  const digits = (phone ?? '').replace(/\D/g, '');
  return digits ? `https://wa.me/${digits.startsWith('55') ? digits : `55${digits}`}` : null;
}

export default function PublicMemberProfilePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [profile, setProfile] = useState<PublicMemberProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [mediaViewer, setMediaViewer] = useState<'cover' | 'avatar' | null>(null);
  useEffect(() => { if (!params.id) return; void getPublicMemberProfile(params.id).then(setProfile).catch(() => setProfile(null)).finally(() => setLoading(false)); }, [params.id]);
  if (loading) return <div className="p-6 text-center text-muted-foreground">Carregando perfil...</div>;
  if (!profile) return <div className="p-6 text-center text-muted-foreground">Perfil não encontrado.</div>;
  const phoneLink = whatsapp(profile.phone);
  const initials = profile.name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();
  const engagement = profile.engagement;
  return <main className="min-h-screen bg-background"><FullscreenMediaViewer open={mediaViewer !== null} onOpenChange={(open) => { if (!open) setMediaViewer(null); }} src={mediaViewer === 'cover' ? profile.coverUrl : profile.avatarUrl} alt={mediaViewer === 'cover' ? 'Capa do perfil' : 'Foto do perfil'} kind={mediaViewer ?? 'cover'} /><div className="relative h-48 bg-muted sm:h-64"><div className="absolute inset-0 overflow-hidden">{profile.coverUrl ? <button type="button" className="block h-full w-full cursor-zoom-in text-left" onClick={() => setMediaViewer('cover')} aria-label="Ver capa do perfil em tela cheia"><AppImage src={profile.coverUrl} alt="Capa do perfil" className="h-full w-full object-cover" /></button> : null}<div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" /></div><Button variant="ghost" size="icon" className="absolute left-3 top-3 text-white hover:bg-white/15" onClick={() => router.back()} aria-label="Voltar"><ArrowLeft className="h-5 w-5" /></Button><button type="button" className="absolute bottom-0 left-1/2 translate-x-[-50%] translate-y-1/2 cursor-zoom-in rounded-full text-left" onClick={() => profile.avatarUrl && setMediaViewer('avatar')} aria-label="Ver foto do perfil em tela cheia"><Avatar className="h-28 w-28 border-4 border-background bg-muted shadow-lg"><AvatarImage src={profile.avatarUrl ?? undefined} alt={profile.name} /><AvatarFallback className="bg-primary/10 text-3xl font-bold text-primary">{initials}</AvatarFallback></Avatar></button></div><section className="relative mx-auto max-w-lg px-4 pb-8 pt-16 sm:px-6"><div><h1 className="truncate text-xl font-bold">{profile.name}</h1><p className="text-sm text-muted-foreground">{profile.role === 'ADMIN' ? 'Administrador' : profile.role === 'PASTOR' ? 'Pastor' : 'Membro'}</p></div><Card className="mt-5"><CardContent className="space-y-4 p-5"><p className="whitespace-pre-wrap text-sm leading-relaxed">{profile.aboutMe || 'Este membro ainda não adicionou uma descrição.'}</p>{phoneLink ? <Button asChild variant="outline" className="w-full"><a href={phoneLink} target="_blank" rel="noreferrer"><MessageCircle className="mr-2 h-4 w-4" />Conversar pelo WhatsApp</a></Button> : null}</CardContent></Card>{engagement ? <Card className="mt-4"><CardContent className="grid grid-cols-3 gap-3 p-4 text-center"><div><Trophy className="mx-auto mb-1 h-4 w-4 text-warning" /><p className="text-lg font-bold">{engagement.points}</p><p className="text-[11px] text-muted-foreground">Pontos</p></div><div><p className="text-lg font-bold">{engagement.rank ? `#${engagement.rank}` : '—'}</p><p className="text-[11px] text-muted-foreground">Ranking</p></div><div><Gamepad2 className="mx-auto mb-1 h-4 w-4 text-primary" /><p className="text-lg font-bold">{engagement.gamesPlayed}</p><p className="text-[11px] text-muted-foreground">Partidas</p></div></CardContent></Card> : null}</section></main>;
}
