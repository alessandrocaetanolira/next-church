'use client';

import { useState } from 'react';
import Image from 'next/image';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BookOpen, Calendar, Flame, Heart, MessageCircle, Megaphone, PenLine, Pin, Send, Target, Trophy } from 'lucide-react';
import type { FeedPost } from '@/lib/db';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

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

type FeedGroup = { id: string; name: string };

type FeedWebPostListProps = {
  posts: FeedPost[];
  groups: FeedGroup[];
  currentUserId: string;
  canUpdateFeed: boolean;
  commentingOn: string | number | null;
  commentText: string;
  onLike: (post: FeedPost) => void;
  onComment: (post: FeedPost) => void;
  onToggleComment: (postId: string | number | null) => void;
  onCommentTextChange: (value: string) => void;
};

export function FeedWebPostList({
  posts,
  groups,
  currentUserId,
  canUpdateFeed,
  commentingOn,
  commentText,
  onLike,
  onComment,
  onToggleComment,
  onCommentTextChange,
}: FeedWebPostListProps) {
  return (
    <>
      {posts.map((post) => {
        const config = POST_TYPE_CONFIG[post.type] ?? POST_TYPE_CONFIG.testimony;
        const Icon = config.icon;
        const liked = currentUserId ? post.likes.includes(currentUserId) : false;

        return (
          <div key={String(post.id)} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <Card className="overflow-hidden border-border">
              <CardContent className="space-y-3 pt-4">
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8"><AvatarFallback className="bg-primary/10 text-primary text-xs">{post.userName[0]}</AvatarFallback></Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{post.userName}</p>
                    <p className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: ptBR })}</p>
                  </div>
                  <div className="flex flex-wrap justify-end gap-1">
                    {post.pinnedUntil && new Date(post.pinnedUntil).getTime() > Date.now() ? <Badge variant="outline" className="h-6 text-[10px]"><Pin className="mr-1 h-3 w-3" />Fixado</Badge> : null}
                    <Badge variant="secondary" className="h-6 gap-1 px-2 text-[10px]"><Icon className={cn('h-3 w-3', config.color)} />{config.label}</Badge>
                    {post.visibility ? <Badge variant="outline" className="h-6 text-[10px]">{post.visibility === 'public' ? 'Todos' : post.visibility === 'group' ? 'Grupo' : 'Individual'}</Badge> : null}
                  </div>
                </div>

                <div>
                  {post.groupId ? <p className="mb-1 text-[11px] font-medium text-primary">{groups.find((group) => group.id === post.groupId)?.name ?? 'Grupo'}</p> : null}
                  {post.senderType === 'group' ? <p className="mb-1 text-[11px] font-medium text-muted-foreground">Publicado em nome do grupo</p> : null}
                  {post.title ? <h3 className="mb-2 text-sm font-semibold text-foreground">{post.title}</h3> : null}
                  {post.type === 'verse' && post.reference ? <p className="mb-1 text-xs font-medium text-primary">{post.reference}</p> : null}
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{post.content}</p>
                  {post.mediaUrl ? <div className="relative mt-3 min-h-32 overflow-hidden rounded-xl border border-border bg-muted/20">{post.mediaType === 'video' ? <video src={post.mediaUrl} controls className="max-h-80 w-full bg-black object-cover" /> : <Image src={post.mediaUrl} alt={post.title || 'Mídia da publicação'} width={1200} height={800} unoptimized className="max-h-80 w-full object-cover" />}</div> : null}
                </div>

                {canUpdateFeed ? <div className="mt-2 flex items-center gap-1 border-t border-border pt-1">
                  <Button size="sm" variant="ghost" className={cn('h-8 gap-1 px-2 text-xs', liked && 'text-pink-500 hover:text-pink-600')} onClick={() => onLike(post)}><Heart className={cn('h-3.5 w-3.5', liked && 'fill-current')} />{post.likes.length > 0 && post.likes.length}</Button>
                  <Button size="sm" variant="ghost" className="h-8 gap-1 px-2 text-xs" onClick={() => onToggleComment(commentingOn === post.id ? null : post.id ?? null)}><MessageCircle className="h-3.5 w-3.5" />{post.comments.length > 0 && post.comments.length}</Button>
                </div> : null}

                {post.comments.length > 0 ? <div className="mt-2 space-y-2 border-l-2 border-border pl-4">{post.comments.map((comment) => <div key={comment.id} className="text-xs"><span className="mr-1 font-medium">{comment.userName}</span><span className="text-muted-foreground">{comment.content}</span></div>)}</div> : null}
                {canUpdateFeed && commentingOn === post.id ? <div className="mt-2 flex gap-2"><Textarea value={commentText} onChange={(event) => onCommentTextChange(event.target.value)} placeholder="Escreva um comentário..." rows={1} className="min-h-[36px] flex-1 resize-none text-xs" /><Button size="icon" className="h-9 w-9 shrink-0" onClick={() => onComment(post)} disabled={!commentText.trim()}><Send className="h-3 w-3" /></Button></div> : null}
              </CardContent>
            </Card>
          </div>
        );
      })}
    </>
  );
}
