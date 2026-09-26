'use client';

import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Eye, Heart, MessageCircle, Send } from 'lucide-react';
import type { FeedPost } from '@/lib/db';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';

type FeedGroup = { id: string; name: string };

type FeedWebTableProps = {
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

export function FeedWebTable({ posts, groups, currentUserId, canUpdateFeed, commentingOn, commentText, onLike, onComment, onToggleComment, onCommentTextChange }: FeedWebTableProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <Table>
        <TableHeader><TableRow><TableHead>Publicação</TableHead><TableHead>Autor</TableHead><TableHead>Tipo</TableHead><TableHead>Visibilidade</TableHead><TableHead>Data</TableHead><TableHead className="w-[190px] text-right">Ações</TableHead></TableRow></TableHeader>
        <TableBody>
          {posts.map((post) => {
            const liked = currentUserId ? post.likes.includes(currentUserId) : false;
            const groupName = post.groupId ? groups.find((group) => group.id === post.groupId)?.name : null;
            return (
              <>
                <TableRow key={String(post.id)}>
                  <TableCell><div className="max-w-[360px]"><p className="truncate font-medium">{post.title || post.content}</p>{groupName ? <p className="text-xs text-primary">{groupName}</p> : null}<p className="truncate text-sm text-muted-foreground">{post.content}</p></div></TableCell>
                  <TableCell className="whitespace-nowrap">{post.userName}</TableCell>
                  <TableCell><Badge variant="outline">{post.type}</Badge></TableCell>
                  <TableCell>{post.visibility === 'group' ? 'Grupo' : post.visibility === 'individual' ? 'Individual' : 'Todos'}</TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: ptBR })}</TableCell>
                  <TableCell><div className="flex justify-end gap-1"><Button size="sm" variant="outline" aria-label="Visualizar publicação"><Eye className="h-4 w-4" /></Button>{canUpdateFeed ? <><Button size="sm" variant="ghost" className={liked ? 'text-pink-500' : ''} onClick={() => onLike(post)}><Heart className={liked ? 'fill-current' : ''} /><span>{post.likes.length}</span></Button><Button size="sm" variant="ghost" onClick={() => onToggleComment(commentingOn === post.id ? null : post.id ?? null)}><MessageCircle /><span>{post.comments.length}</span></Button></> : null}</div></TableCell>
                </TableRow>
                {canUpdateFeed && commentingOn === post.id ? <TableRow key={`${String(post.id)}-comment`}><TableCell colSpan={6}><div className="flex gap-2"><Textarea value={commentText} onChange={(event) => onCommentTextChange(event.target.value)} placeholder="Escreva um comentário..." rows={1} className="min-h-[36px] resize-none" /><Button size="icon" onClick={() => onComment(post)} disabled={!commentText.trim()}><Send className="h-4 w-4" /></Button></div></TableCell></TableRow> : null}
              </>
            );
          })}
          {posts.length === 0 ? <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">Nenhuma publicação encontrada.</TableCell></TableRow> : null}
        </TableBody>
      </Table>
    </div>
  );
}
