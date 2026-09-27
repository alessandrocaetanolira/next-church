'use client';

import { Camera, Globe2, ImagePlus, Tag, X } from 'lucide-react';
import type { FeedPost } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { getYouTubeEmbedUrl } from '@/lib/youtube';

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
  onImageUpload: (dataUrl: string) => Promise<void>;
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
  { value: 'social_project', label: 'Projeto social' },
];

export function MobileFeedComposer(props: MobileFeedComposerProps) {
  const requiresTitle = ['announcement', 'event', 'social_project'].includes(props.postType);
  const canPublish = Boolean(props.content.trim()) && (!props.canTargetFeed || props.visibility !== 'group' || Boolean(props.groupId)) && (!props.canTargetFeed || props.visibility !== 'individual' || Boolean(props.targetUserId));
  const youtubeUrl = props.content.match(/https?:\/\/[^\s]+/g)?.map((value) => value.replace(/[),.]+$/, '')).map(getYouTubeEmbedUrl).find(Boolean) ?? null;

  const handleImageFile = (file?: File) => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') void props.onImageUpload(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const image = Array.from(event.clipboardData.files).find((file) => file.type.startsWith('image/'));
    if (!image) return;
    event.preventDefault();
    handleImageFile(image);
  };

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-background md:hidden">
      <header className="sticky top-0 z-10 flex h-16 items-end justify-between border-b border-border bg-background/95 px-4 pb-2 pt-safe backdrop-blur">
        <button type="button" onClick={props.onClose} className="text-sm text-foreground">Cancelar</button>
        <h1 className="text-base font-bold">Nova publicação</h1>
        <Button type="button" size="sm" className="h-8 rounded-lg px-3 text-xs" disabled={!canPublish || props.disabled} onClick={props.onPublish}>Publicar</Button>
      </header>

      <main className="space-y-4 px-4 pb-8 pt-4">
        <div className="flex min-w-0 items-center justify-between gap-2.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">{props.userInitial}</div>
            <span className="truncate text-sm font-medium">{props.userName}</span>
          </div>
          <label className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
            <Globe2 className="h-4 w-4" />
            <select value={props.visibility} onChange={(event) => props.onVisibilityChange(event.target.value as NonNullable<FeedPost['visibility']>)} className="max-w-[105px] bg-transparent text-right text-xs outline-none">
              <option value="public">Todos</option>
              <option value="group">Grupo</option>
              <option value="individual">Individual</option>
            </select>
          </label>
        </div>

        <div className="scrollbar-hide flex gap-2 overflow-x-auto pb-1">
          <label className="flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-border px-3 text-[11px] text-muted-foreground transition-colors hover:border-primary/40">
            <ImagePlus className="h-4 w-4" strokeWidth={1.8} />
            Galeria
            <input type="file" accept="image/*" className="hidden" onChange={(event) => { handleImageFile(event.target.files?.[0]); event.currentTarget.value = ''; }} />
          </label>
          {typeOptions.map((option) => {
            const active = props.postType === option.value;
            const Icon = Tag;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => props.onPostTypeChange(option.value)}
                className={`flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[11px] transition-colors ${active ? 'border-primary bg-primary/10 font-medium text-primary' : 'border-border text-muted-foreground hover:border-primary/40'}`}
              >
                <Icon className="h-4 w-4" strokeWidth={1.8} />
                {option.label}
              </button>
            );
          })}
          <label className="flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-border px-3 text-[11px] text-muted-foreground transition-colors hover:border-primary/40">
            <Camera className="h-4 w-4" strokeWidth={1.8} />
            Câmera
            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(event) => { handleImageFile(event.target.files?.[0]); event.currentTarget.value = ''; }} />
          </label>
        </div>

        {requiresTitle ? <input value={props.title} onChange={(event) => props.onTitleChange(event.target.value)} placeholder="Título da publicação" className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary" /> : null}
        <div className="relative rounded-xl border border-border bg-background">
          <textarea value={props.content} onChange={(event) => props.onContentChange(event.target.value)} onPaste={handlePaste} maxLength={500} rows={5} placeholder="No que você está pensando? Cole uma imagem ou link do YouTube..." className="w-full resize-none rounded-xl bg-transparent px-3 py-3 text-base outline-none placeholder:text-muted-foreground" />
          <span className="absolute bottom-2 right-3 text-[11px] text-muted-foreground">{props.content.length}/500</span>
        </div>

        <div className="space-y-2">
          {props.mediaUrl && props.mediaType === 'image' ? <div className="relative overflow-hidden rounded-xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={props.mediaUrl} alt="Prévia da publicação" className="h-40 w-full object-cover" />
            <button type="button" onClick={() => props.onMediaUrlChange('')} className="absolute right-2 top-2 rounded-full bg-black/70 p-1.5 text-white"><X className="h-3.5 w-3.5" /></button>
          </div> : null}
          {youtubeUrl ? <div className="overflow-hidden rounded-xl border border-border bg-black aspect-video"><iframe src={youtubeUrl} title="Prévia do vídeo do YouTube" className="h-full w-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen /></div> : null}
        </div>

        <div className="space-y-1 border-t border-border pt-1">
          {props.canTargetFeed && props.visibility === 'group' ? <label className="flex items-center gap-2 border-b border-border py-3"><Tag className="h-4 w-4" /><span className="flex-1 text-sm">Grupo</span><select value={props.groupId} onChange={(event) => props.onGroupChange(event.target.value)} className="max-w-[160px] bg-transparent text-right text-sm text-muted-foreground outline-none"><option value="">Selecionar</option>{props.groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select></label> : null}
          {props.canTargetFeed && props.visibility === 'individual' ? <label className="flex items-center gap-2 border-b border-border py-3"><Tag className="h-4 w-4" /><span className="flex-1 text-sm">Destinatário</span><select value={props.targetUserId} onChange={(event) => props.onTargetUserChange(event.target.value)} className="max-w-[160px] bg-transparent text-right text-sm text-muted-foreground outline-none"><option value="">Selecionar</option>{props.members.map((member) => <option key={member.id} value={member.email ?? member.id}>{member.name}</option>)}</select></label> : null}
        </div>
      </main>
    </div>
  );
}
