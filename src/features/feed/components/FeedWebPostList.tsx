'use client';

import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BookOpen, Calendar, Flame, Heart, MessageCircle, Megaphone, MoreHorizontal, PenLine, Pin, Target, Trophy } from 'lucide-react';
import type { FeedPost } from '@/lib/db';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { AppImage } from '@/components/shared';
import { getYouTubeEmbedUrl } from '@/lib/youtube';

const POST_TYPE_CONFIG = {
  announcement: { label: 'Aviso', icon: Megaphone, color: 'text-sky-500' },
  verse: { label: 'Versículo', icon: BookOpen, color: 'text-primary' },
  devotional: { label: 'Devocional', icon: Flame, color: 'text-warning' },
  testimony: { label: 'Testemunho', icon: Heart, color: 'text-pink-500' },
  prayer: { label: 'Pedido de Oração', icon: PenLine, color: 'text-info' },
  quiz_score: { label: 'Quiz', icon: Trophy, color: 'text-warning' },
  event: { label: 'Evento', icon: Calendar, color: 'text-success' },
  social_project: { label: 'Projeto Social', icon: Target, color: 'text-pink-500' },
};

const POST_TYPE_BADGE_CLASS: Record<keyof typeof POST_TYPE_CONFIG, string> = {
  announcement: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-300',
  verse: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300',
  devotional: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300',
  testimony: 'border-pink-200 bg-pink-50 text-pink-700 dark:border-pink-900 dark:bg-pink-950/40 dark:text-pink-300',
  prayer: 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-300',
  quiz_score: 'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900 dark:bg-orange-950/40 dark:text-orange-300',
  event: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300',
  social_project: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300',
};

type FeedGroup = { id: string; name: string };

type FeedWebPostListProps = {
  posts: FeedPost[];
  groups: FeedGroup[];
  currentUserId: string;
  canUpdateFeed: boolean;
  commentingOn: string | number | null;
  onLike: (post: FeedPost) => void;
  onToggleComment: (postId: string | number | null) => void;
  onOpenPost: (post: FeedPost) => void;
};

export function FeedWebPostList({
  posts,
  groups,
  currentUserId,
  canUpdateFeed,
  commentingOn,
  onLike,
  onToggleComment,
  onOpenPost,
}: FeedWebPostListProps) {
  return (
    <>
      {posts.map((post) => {
        const config = POST_TYPE_CONFIG[post.type] ?? POST_TYPE_CONFIG.testimony;
        const Icon = config.icon;
        const liked = currentUserId ? post.likes.includes(currentUserId) : false;

        return (
          <div key={String(post.id)} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <Card className="cursor-pointer overflow-hidden rounded-[22px] border-border/70 bg-card shadow-sm transition-colors hover:border-primary/40" role="link" tabIndex={0} onClick={() => onOpenPost(post)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onOpenPost(post); } }}>
              <CardContent className="space-y-4 p-4 sm:p-5">
                <div className="flex items-start gap-2.5">
                  <Avatar className="h-9 w-9 shrink-0"><AvatarFallback className="bg-primary/10 text-xs text-primary">{post.userName[0]}</AvatarFallback></Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold leading-4">{post.userName}</p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground">
                      <span>{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: ptBR })}</span><span>•</span>
                      <Badge variant="outline" className={cn('h-5 gap-1 rounded-full px-1.5 text-[11px] font-medium', POST_TYPE_BADGE_CLASS[post.type])}><Icon className="h-3 w-3" />{config.label}</Badge>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={(event) => event.stopPropagation()}><MoreHorizontal className="h-5 w-5" /></Button>
                  <div className="hidden flex-wrap justify-end gap-1">
                    {post.pinnedUntil && new Date(post.pinnedUntil).getTime() > Date.now() ? <Badge variant="outline" className="h-6 text-xs"><Pin className="mr-1 h-3 w-3" />Fixado</Badge> : null}
                    <Badge variant="secondary" className="h-6 gap-1 px-2 text-xs"><Icon className={cn('h-3 w-3', config.color)} />{config.label}</Badge>
                    {post.visibility ? <Badge variant="outline" className="h-6 text-xs">{post.visibility === 'public' ? 'Todos' : post.visibility === 'group' ? 'Grupo' : 'Individual'}</Badge> : null}
                  </div>
                </div>

                <div>
                  {post.groupId ? <p className="mb-1 text-xs font-medium text-primary">{groups.find((group) => group.id === post.groupId)?.name ?? 'Grupo'}</p> : null}
                  {post.senderType === 'group' ? <p className="mb-1 text-xs font-medium text-muted-foreground">Publicado em nome do grupo</p> : null}
                  {post.title ? <h3 className="mb-2 text-lg font-semibold text-primary">{post.title}</h3> : null}
                  {post.type === 'verse' && post.reference ? <p className="mb-1 text-base font-medium text-primary">{post.reference}</p> : null}
                  <p className="whitespace-pre-wrap text-base leading-7 text-foreground/90">{post.content}</p>
                  {post.mediaUrl ? <>
                    <div className="relative mt-4 aspect-[16/9] overflow-hidden rounded-2xl border border-border bg-muted/20" onClick={(event) => event.stopPropagation()}>{post.mediaType === 'video' ? (getYouTubeEmbedUrl(post.mediaUrl) ? <iframe src={getYouTubeEmbedUrl(post.mediaUrl) ?? undefined} title="Vídeo do YouTube" className="h-full w-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen /> : <video src={post.mediaUrl} controls className="h-full w-full bg-black object-cover" />) : <AppImage src={post.mediaUrl} alt={post.title || 'Mídia da publicação'} width={1200} height={800} className="h-full w-full object-cover" />}</div>
                    {post.mediaType === 'video' ? <a href={post.mediaUrl} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()} className="mt-1 inline-block text-xs text-primary underline-offset-4 hover:underline">Abrir vídeo externamente</a> : null}
                  </> : null}
                </div>

                {canUpdateFeed ? <div className="mt-1 flex items-center gap-2 border-t-0 pt-0">
                  <Button size="sm" variant="ghost" className={cn('h-10 gap-2 px-2 text-sm', liked && 'text-pink-500 hover:text-pink-600')} onClick={(event) => { event.stopPropagation(); onLike(post); }}><Heart className={cn('h-6 w-6', liked && 'fill-current')} />{post.likes.length > 0 && post.likes.length}</Button>
                  <Button size="sm" variant="ghost" className="h-10 gap-2 px-2 text-sm" onClick={(event) => { event.stopPropagation(); onToggleComment(commentingOn === post.id ? null : post.id ?? null); }}><MessageCircle className="h-6 w-6" />{post.comments.length > 0 && post.comments.length}</Button>
                </div> : null}

              </CardContent>
            </Card>
          </div>
        );
      })}
    </>
  );
}
