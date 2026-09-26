'use client';

import { ArrowLeft, BarChart3, CalendarDays, Globe2, Image as ImageIcon, MapPin, Tag, Video, X } from 'lucide-react';
import type { FeedPost } from '@/lib/db';
import { Button } from '@/components/ui/button';

type Option = { id: string; name: string; email?: string | null };

interface MobileFeedComposerProps {
  userName: string;
  userInitial: string;
  content: string;
  title: string;
  postType: FeedPost['type'];
  visibility: NonNullable<FeedPost['visibility']>;
  mediaType: 'image' | 'video';
  mediaUrl: string;
  groupId: string;
  targetUserId: string;
  groups: Option[];
  members: Option[];
  canTargetFeed: boolean;
  disabled: boolean;
  onContentChange: (value: string) => void;
  onTitleChange: (value: string) => void;
  onPostTypeChange: (value: FeedPost['type']) => void;
  onVisibilityChange: (value: NonNullable<FeedPost['visibility']>) => void;
  onMediaTypeChange: (value: 'image' | 'video') => void;
  onMediaUrlChange: (value: string) => void;
  onGroupChange: (value: string) => void;
  onTargetUserChange: (value: string) => void;
  onClose: () => void;
  onPublish: () => void;
}

const typeOptions: Array<{ value: FeedPost['type']; label: string }> = [
  { value: 'testimony', label: 'Testemunho' },
  { value: 'announcement', label: 'Aviso' },
  { value: 'event', label: 'Evento' },
  { value: 'verse', label: 'Versículo' },
  { value: 'devotional', label: 'Devocional' },
  { value: 'prayer', label: 'Pedido de oração' },
];

export function MobileFeedComposer(props: MobileFeedComposerProps) {
  const requiresTitle = ['announcement', 'event', 'social_project'].includes(props.postType);
  const canPublish = Boolean(props.content.trim()) && (!props.canTargetFeed || props.visibility !== 'group' || Boolean(props.groupId)) && (!props.canTargetFeed || props.visibility !== 'individual' || Boolean(props.targetUserId));

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-background md:hidden">
      <header className="sticky top-0 z-10 flex h-20 items-end justify-between border-b border-border bg-background/95 px-5 pb-3 pt-safe backdrop-blur">
        <button type="button" onClick={props.onClose} className="text-base text-foreground">Cancelar</button>
        <h1 className="text-lg font-bold">Nova publicação</h1>
        <Button type="button" size="sm" className="rounded-xl px-4" disabled={!canPublish || props.disabled} onClick={props.onPublish}>Publicar</Button>
      </header>

      <main className="space-y-5 px-5 pb-10 pt-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xl font-semibold text-primary">{props.userInitial}</div>
            <span className="truncate text-lg font-medium">{props.userName}</span>
          </div>
          <select aria-label="Categoria da publicação" value={props.postType} onChange={(event) => props.onPostTypeChange(event.target.value as FeedPost['type'])} className="h-12 max-w-[170px] rounded-2xl border border-border bg-background px-3 text-base">
            {typeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </div>

        {requiresTitle ? <input value={props.title} onChange={(event) => props.onTitleChange(event.target.value)} placeholder="Título da publicação" className="h-12 w-full rounded-2xl border border-border bg-background px-4 text-base outline-none focus:border-primary" /> : null}
        <div className="relative rounded-2xl border border-border bg-background">
          <textarea value={props.content} onChange={(event) => props.onContentChange(event.target.value)} maxLength={500} rows={7} placeholder="No que você está pensando?" className="w-full resize-none rounded-2xl bg-transparent px-4 py-4 text-lg outline-none placeholder:text-muted-foreground" />
          <span className="absolute bottom-3 right-4 text-xs text-muted-foreground">{props.content.length}/500</span>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {[
            { value: 'image' as const, label: 'Foto', icon: ImageIcon },
            { value: 'video' as const, label: 'Vídeo', icon: Video },
          ].map(({ value, label, icon: Icon }) => (
            <button key={value} type="button" onClick={() => props.onMediaTypeChange(value)} className={`flex h-28 min-w-[88px] shrink-0 flex-col items-center justify-center gap-3 rounded-[20px] border bg-background text-sm transition-colors ${props.mediaType === value ? 'border-primary bg-primary/10 font-medium text-primary' : 'border-border text-muted-foreground hover:border-primary/40'}`}>
              <Icon className="h-7 w-7" strokeWidth={1.8} /><span>{label}</span>
            </button>
          ))}
          <button type="button" onClick={() => props.onPostTypeChange('event')} className={`flex h-28 min-w-[88px] shrink-0 flex-col items-center justify-center gap-3 rounded-[20px] border bg-background text-sm transition-colors ${props.postType === 'event' ? 'border-primary bg-primary/10 font-medium text-primary' : 'border-border text-muted-foreground hover:border-primary/40'}`}><CalendarDays className="h-7 w-7" strokeWidth={1.8} /><span>Evento</span></button>
          <button type="button" className="flex h-28 min-w-[88px] shrink-0 flex-col items-center justify-center gap-3 rounded-[20px] border border-border bg-background text-sm text-muted-foreground hover:border-primary/40"><BarChart3 className="h-7 w-7" strokeWidth={1.8} /><span>Enquete</span></button>
          <button type="button" className="flex h-28 min-w-[88px] shrink-0 flex-col items-center justify-center gap-3 rounded-[20px] border border-border bg-background text-sm text-muted-foreground hover:border-primary/40"><MapPin className="h-7 w-7" strokeWidth={1.8} /><span>Local</span></button>
        </div>

        <div className="space-y-2">
          <input value={props.mediaUrl} onChange={(event) => props.onMediaUrlChange(event.target.value)} placeholder={props.mediaType === 'image' ? 'URL da foto (opcional)' : 'URL do vídeo (opcional)'} className="h-12 w-full rounded-2xl border border-border bg-background px-4 text-base outline-none focus:border-primary" />
          {props.mediaUrl && props.mediaType === 'image' ? <div className="relative overflow-hidden rounded-2xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={props.mediaUrl} alt="Prévia da publicação" className="h-48 w-full object-cover" />
            <button type="button" onClick={() => props.onMediaUrlChange('')} className="absolute right-3 top-3 rounded-full bg-black/70 p-2 text-white"><X className="h-4 w-4" /></button>
          </div> : null}
        </div>

        <div className="space-y-1 border-t border-border pt-2">
          <label className="flex items-center gap-3 border-b border-border py-4"><Globe2 className="h-6 w-6" /><span className="flex-1">Visibilidade</span><select value={props.visibility} onChange={(event) => props.onVisibilityChange(event.target.value as NonNullable<FeedPost['visibility']>)} className="bg-transparent text-right text-base text-muted-foreground outline-none"><option value="public">Todos</option><option value="group">Grupo</option><option value="individual">Individual</option></select></label>
          {props.canTargetFeed && props.visibility === 'group' ? <label className="flex items-center gap-3 border-b border-border py-4"><Tag className="h-6 w-6" /><span className="flex-1">Grupo</span><select value={props.groupId} onChange={(event) => props.onGroupChange(event.target.value)} className="max-w-[160px] bg-transparent text-right text-base text-muted-foreground outline-none"><option value="">Selecionar</option>{props.groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select></label> : null}
          {props.canTargetFeed && props.visibility === 'individual' ? <label className="flex items-center gap-3 border-b border-border py-4"><Tag className="h-6 w-6" /><span className="flex-1">Destinatário</span><select value={props.targetUserId} onChange={(event) => props.onTargetUserChange(event.target.value)} className="max-w-[160px] bg-transparent text-right text-base text-muted-foreground outline-none"><option value="">Selecionar</option>{props.members.map((member) => <option key={member.id} value={member.email ?? member.id}>{member.name}</option>)}</select></label> : null}
          <div className="flex items-center gap-3 py-4 text-muted-foreground"><ArrowLeft className="h-5 w-5 opacity-0" /><span>Marcar pessoas</span><span className="ml-auto">Adicionar ›</span></div>
        </div>
      </main>
    </div>
  );
}
