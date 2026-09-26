'use client';

import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useEffect, useState } from 'react';
import { Heart, Image as ImageIcon, MoreHorizontal, Send, X } from 'lucide-react';
import type { FeedPost } from '@/lib/db';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';

interface MobileCommentsDrawerProps {
  post: FeedPost | null;
  open: boolean;
  commentText: string;
  onCommentTextChange: (value: string) => void;
  onComment: (post: FeedPost) => void;
  onClose: () => void;
}

export function MobileCommentsDrawer({ post, open, commentText, onCommentTextChange, onComment, onClose }: MobileCommentsDrawerProps) {
  const [keyboardInset, setKeyboardInset] = useState(0);

  useEffect(() => {
    if (!open || typeof window === 'undefined' || !window.visualViewport) {
      setKeyboardInset(0);
      return;
    }

    const viewport = window.visualViewport;
    const updateKeyboardInset = () => {
      // O visual viewport encolhe quando o teclado virtual aparece. Subir o
      // drawer pela diferença mantém o campo sempre acima do teclado.
      const inset = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
      setKeyboardInset(inset);
    };

    updateKeyboardInset();
    viewport.addEventListener('resize', updateKeyboardInset);
    viewport.addEventListener('scroll', updateKeyboardInset);

    return () => {
      viewport.removeEventListener('resize', updateKeyboardInset);
      viewport.removeEventListener('scroll', updateKeyboardInset);
    };
  }, [open]);

  return (
    <Drawer open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DrawerContent
        className="max-h-[82dvh] rounded-t-[28px] overscroll-contain md:hidden"
        style={{
          bottom: keyboardInset ? `${keyboardInset}px` : undefined,
          maxHeight: keyboardInset ? `calc(82dvh - ${keyboardInset}px)` : undefined,
        }}
      >
        {post ? (
          <>
            <DrawerHeader className="flex flex-row items-center justify-between border-b border-border px-5 py-4 text-left">
              <DrawerTitle className="text-2xl">Comentários <span className="ml-1 text-muted-foreground">{post.comments.length}</span></DrawerTitle>
              <Button variant="ghost" size="icon" onClick={onClose} aria-label="Fechar comentários"><X className="h-6 w-6" /></Button>
            </DrawerHeader>
            <div className="min-h-0 flex-1 overflow-y-auto px-5">
              {post.comments.length === 0 ? <p className="py-10 text-center text-sm text-muted-foreground">Ainda não há comentários.</p> : post.comments.map((comment) => (
                <article key={comment.id} className="flex gap-3 border-b border-border py-4">
                  <Avatar className="h-10 w-10 shrink-0"><AvatarFallback className="bg-primary/10 text-primary">{comment.userName[0]}</AvatarFallback></Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2"><strong className="text-base">{comment.userName}</strong><span className="text-sm text-muted-foreground">{formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale: ptBR })}</span><MoreHorizontal className="ml-auto h-5 w-5 text-muted-foreground" /></div>
                    <p className="mt-1 text-base leading-6">{comment.content}</p>
                    <div className="mt-2 flex items-center gap-5 text-sm text-muted-foreground"><button type="button" className="flex items-center gap-1 text-pink-500"><Heart className="h-5 w-5" />Curtir</button><button type="button">Responder</button></div>
                  </div>
                </article>
              ))}
            </div>
            <div className="shrink-0 flex items-center gap-3 border-t border-border bg-background px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <Avatar className="h-10 w-10 shrink-0"><AvatarFallback className="bg-primary/10 text-primary">A</AvatarFallback></Avatar>
              <div className="flex min-w-0 flex-1 items-center gap-2 rounded-full bg-muted/60 px-4 py-2"><input value={commentText} onChange={(event) => onCommentTextChange(event.target.value)} onFocus={(event) => { const input = event.currentTarget; requestAnimationFrame(() => input.scrollIntoView({ block: 'nearest' })); }} placeholder="Escreva um comentário..." className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground" /><ImageIcon className="h-5 w-5 shrink-0 text-muted-foreground" /><Button size="icon" className="h-8 w-8 shrink-0 rounded-full" onClick={() => onComment(post)} disabled={!commentText.trim()} aria-label="Enviar comentário"><Send className="h-4 w-4" /></Button></div>
            </div>
          </>
        ) : null}
      </DrawerContent>
    </Drawer>
  );
}
