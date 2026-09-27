'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { LoadingState } from '@/components/common';
import { WebPageLayout } from '@/components/shared/web';
import { useAuth } from '@/features/auth/hooks/useAuth';
import type { FeedComment, FeedPost } from '@/lib/db';
import { addFeedComment, getFeedPost } from '@/services/feed/feed-api';

export default function NewFeedCommentPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, isOffline } = useAuth();
  const replyTo = searchParams.get('replyTo') ?? '';
  const [post, setPost] = useState<FeedPost | null>(null);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    void getFeedPost(params.id)
      .then((item) => { if (active) setPost(item); })
      .catch(() => { if (active) toast.error('Não foi possível carregar a publicação.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [params.id]);

  const referencedComment = useMemo<FeedComment | undefined>(
    () => post?.comments.find((comment) => comment.id === replyTo),
    [post, replyTo],
  );

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!post?.id || !user?.email || !content.trim()) return;
    if (isOffline) {
      toast.info('Comentários exigem conexão.');
      return;
    }

    setSaving(true);
    try {
      await addFeedComment(post.id, content.trim(), referencedComment?.id);
      toast.success(referencedComment ? 'Resposta publicada.' : 'Comentário publicado.');
      router.push(`/feed/${post.id}`);
    } catch {
      toast.error('Não foi possível publicar o comentário.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingState className="min-h-[60vh]" label="Carregando comentário..." />;
  if (!post) return <WebPageLayout><p className="py-12 text-center text-muted-foreground">Publicação não encontrada.</p></WebPageLayout>;

  return (
    <WebPageLayout>
      <div className="mx-auto max-w-2xl space-y-5">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
            <MessageCircle className="h-5 w-5" />
            {referencedComment ? 'Responder comentário' : 'Novo comentário'}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{post.title || 'Comentário na publicação de ' + post.userName}</p>
        </div>
        <div className="space-y-5">
            {referencedComment ? (
              <div className="rounded-lg border border-border/50 bg-muted/30 p-3 text-sm">
                <div className="flex items-center gap-2">
                  <Avatar className="h-7 w-7">{referencedComment.userAvatar ? <AvatarImage src={referencedComment.userAvatar} alt={referencedComment.userName} /> : null}<AvatarFallback className="bg-primary/10 text-primary">{referencedComment.userName[0]}</AvatarFallback></Avatar>
                  <span className="font-medium">{referencedComment.userName}</span>
                </div>
                <p className="mt-2 text-muted-foreground">{referencedComment.content}</p>
              </div>
            ) : null}
            <form onSubmit={handleSubmit} className="space-y-4">
              <Textarea
                autoFocus
                value={content}
                onChange={(event) => setContent(event.target.value)}
                placeholder={referencedComment ? 'Escreva sua resposta...' : 'Escreva seu comentário...'}
                rows={6}
                className="resize-y"
                maxLength={2000}
              />
              <div className="flex justify-end gap-2">
                <Button type="submit" disabled={saving || !content.trim()}>{saving ? 'Publicando...' : 'Publicar comentário'}</Button>
              </div>
            </form>
        </div>
      </div>
    </WebPageLayout>
  );
}
