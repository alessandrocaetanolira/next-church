'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowLeft, BookOpen, Calendar, Flame, Heart, MessageCircle, Megaphone, PenLine, Target, Trophy } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AppImage } from '@/components/shared';
import { LoadingState } from '@/components/common';
import { WebPageLayout } from '@/components/shared/web';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { addFeedComment, getFeedPost, toggleFeedLike } from '@/services/feed/feed-api';
import type { FeedPost } from '@/lib/db';
import { MobileCommentsDrawer } from '@/features/feed/components/MobileCommentsDrawer';
import { toast } from 'sonner';

const POST_TYPE_CONFIG = {
  announcement: { label: 'Aviso', icon: Megaphone }, verse: { label: 'Versículo', icon: BookOpen }, devotional: { label: 'Devocional', icon: Flame },
  testimony: { label: 'Testemunho', icon: Heart }, prayer: { label: 'Pedido de Oração', icon: PenLine }, quiz_score: { label: 'Quiz', icon: Trophy },
  event: { label: 'Evento', icon: Calendar }, social_project: { label: 'Projeto Social', icon: Target },
};

export default function FeedPostPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user, isOffline } = useAuth();
  const [post, setPost] = useState<FeedPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [commentsOpen, setCommentsOpen] = useState(false);

  useEffect(() => {
    let active = true;
    void getFeedPost(params.id).then((item) => { if (active) setPost(item); }).catch(() => { if (active) toast.error('Não foi possível carregar a publicação.'); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [params.id]);

  const handleLike = async () => {
    if (!post?.id || isOffline) return toast.info('Curtidas exigem conexão.');
    try { setPost(await toggleFeedLike(post.id)); } catch { toast.error('Não foi possível registrar a curtida.'); }
  };

  const handleComment = async (currentPost: FeedPost) => {
    if (!currentPost.id || !commentText.trim() || isOffline) return;
    try { setPost(await addFeedComment(currentPost.id, commentText.trim())); setCommentText(''); } catch { toast.error('Não foi possível comentar.'); }
  };

  if (loading) return <LoadingState className="min-h-[60vh]" label="Carregando publicação..." />;
  if (!post) return <WebPageLayout><p className="py-12 text-center text-muted-foreground">Publicação não encontrada.</p></WebPageLayout>;

  const config = POST_TYPE_CONFIG[post.type] ?? POST_TYPE_CONFIG.testimony;
  const Icon = config.icon;

  return (
    <WebPageLayout>
      <div className="mx-auto max-w-3xl">
        <Button variant="ghost" className="mb-3 gap-2" onClick={() => router.back()}><ArrowLeft className="h-4 w-4" />Voltar ao Feed</Button>
        <Card className="overflow-hidden rounded-[22px] border-border/70 shadow-sm">
          <CardContent className="space-y-5 p-4 sm:p-6">
            <div className="flex items-start gap-3">
              <Avatar className="h-12 w-12"><AvatarFallback className="bg-primary/10 text-base text-primary">{post.userName[0]}</AvatarFallback></Avatar>
              <div className="min-w-0 flex-1"><p className="text-base font-bold">{post.userName}</p><div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground"><span>{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: ptBR })}</span><span>•</span><Badge variant="outline" className="gap-1 rounded-full"><Icon className="h-3.5 w-3.5" />{config.label}</Badge></div></div>
            </div>
            {post.title ? <h1 className="text-2xl font-bold text-primary">{post.title}</h1> : null}
            {post.reference ? <p className="font-medium text-primary">{post.reference}</p> : null}
            <p className="whitespace-pre-wrap text-base leading-7">{post.content}</p>
            {post.mediaUrl ? <div className="overflow-hidden rounded-2xl border border-border bg-muted/20">{post.mediaType === 'video' ? <video src={post.mediaUrl} controls className="max-h-[70vh] w-full bg-black object-contain" /> : <AppImage src={post.mediaUrl} alt={post.title || 'Mídia da publicação'} width={1200} height={800} className="h-auto max-h-[70vh] w-full object-contain" />}</div> : null}
            <div className="flex items-center gap-2 border-t border-border pt-3">
              <Button variant="ghost" className="gap-2" onClick={() => void handleLike()}><Heart className={post.likes.includes(user?.email ?? '') ? 'fill-current text-pink-500' : ''} />{post.likes.length}</Button>
              <Button variant="ghost" className="gap-2" onClick={() => setCommentsOpen(true)}><MessageCircle />{post.comments.length}</Button>
            </div>
          </CardContent>
        </Card>
      </div>
      <MobileCommentsDrawer post={post} open={commentsOpen} commentText={commentText} onCommentTextChange={setCommentText} onComment={handleComment} onClose={() => setCommentsOpen(false)} />
    </WebPageLayout>
  );
}
