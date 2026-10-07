'use client';

import type { ChangeEvent, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Camera, ImagePlus, ChevronRight } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AppImage } from '@/components/shared';
import { cn } from '@/lib/utils';

type ProfileHeroProps = {
  name: string;
  email: string;
  initials: string;
  avatarUrl: string | null;
  coverUrl: string | null;
  onViewAvatar: () => void;
  onViewCover: () => void;
  onAvatarChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onCoverChange: (event: ChangeEvent<HTMLInputElement>) => void;
};

export function ProfileHero({ name, email, initials, avatarUrl, coverUrl, onViewAvatar, onViewCover, onAvatarChange, onCoverChange }: ProfileHeroProps) {
  return (
    <section className="space-y-4">
      <div className="relative rounded-2xl border border-border bg-card shadow-sm">
        <div className="relative aspect-[2.2/1] min-h-40 overflow-hidden rounded-t-2xl bg-muted">
          {coverUrl ? (
            <button type="button" className="block h-full w-full cursor-zoom-in text-left" onClick={onViewCover} aria-label="Ver capa do perfil em tela cheia">
              <AppImage src={coverUrl} alt="Capa do perfil" className="h-full w-full object-cover" />
            </button>
          ) : (
            <label className="flex h-full w-full cursor-pointer flex-col items-center justify-center gap-2 text-sm text-muted-foreground hover:bg-muted/70">
              <ImagePlus className="h-6 w-6" />
              Carregar capa
              <input type="file" accept="image/*" className="hidden" onChange={onCoverChange} />
            </label>
          )}
          <label className="absolute right-3 top-3 inline-flex cursor-pointer items-center gap-2 rounded-full bg-black/55 px-3 py-2 text-xs font-medium text-white backdrop-blur-sm transition-colors hover:bg-black/70">
            <ImagePlus className="h-4 w-4" />
            Alterar capa
            <input type="file" accept="image/*" className="hidden" onChange={onCoverChange} />
          </label>
        </div>
        <div className="relative flex flex-col items-center px-4 pb-5 pt-14 text-center">
          <button type="button" className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 cursor-zoom-in rounded-full" onClick={onViewAvatar} aria-label="Ver foto do perfil em tela cheia">
            <Avatar className="h-28 w-28 border-4 border-card bg-muted shadow-lg">
              {avatarUrl ? <AvatarImage src={avatarUrl} alt={name} /> : null}
              <AvatarFallback className="bg-primary/10 text-3xl font-bold text-primary">{initials}</AvatarFallback>
            </Avatar>
          </button>
          <label className="absolute left-[calc(50%+2.25rem)] top-14 flex h-10 w-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border-4 border-card bg-background text-muted-foreground shadow-sm" aria-label="Alterar foto do perfil">
            <Camera className="h-4 w-4" />
            <input type="file" accept="image/*" className="hidden" onChange={onAvatarChange} />
          </label>
          <h1 className="text-xl font-bold tracking-tight">{name || 'Meu perfil'}</h1>
          <p className="text-sm text-muted-foreground">{email}</p>
        </div>
      </div>
    </section>
  );
}

type ProfileMediaActionProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  tone?: 'blue' | 'violet' | 'green' | 'amber';
  onClick: () => void;
};

export function ProfileMediaAction({ icon: Icon, title, description, tone = 'blue', onClick }: ProfileMediaActionProps) {
  return (
    <button type="button" onClick={onClick} className="flex min-h-24 w-full items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left shadow-sm transition-colors hover:bg-muted/40">
      <span className={cn('flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl', {
        'bg-blue-500/10 text-blue-600 dark:text-blue-400': tone === 'blue',
        'bg-violet-500/10 text-violet-600 dark:text-violet-400': tone === 'violet',
        'bg-green-500/10 text-green-600 dark:text-green-400': tone === 'green',
        'bg-amber-500/10 text-amber-600 dark:text-amber-400': tone === 'amber',
      })}><Icon className="h-6 w-6" /></span>
      <span className="min-w-0 flex-1"><span className="block font-semibold">{title}</span><span className="mt-1 block text-sm leading-snug text-muted-foreground">{description}</span></span>
      <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
    </button>
  );
}

export function ProfileSection({ title, children }: { title: string; children: ReactNode }) {
  return <section className="space-y-2"><h2 className="px-2 text-lg font-semibold text-muted-foreground">{title}</h2>{children}</section>;
}

export function ProfileInfoRow({ icon: Icon, label, value, children }: { icon: LucideIcon; label: string; value?: string; children?: ReactNode }) {
  return <div className="flex items-center gap-3 border-b border-border/70 p-4 last:border-b-0"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground"><Icon className="h-5 w-5" /></span><span className="min-w-0 flex-1"><span className="block font-semibold">{label}</span>{value ? <span className="mt-1 block truncate text-sm text-muted-foreground">{value}</span> : children}</span><ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" /></div>;
}
