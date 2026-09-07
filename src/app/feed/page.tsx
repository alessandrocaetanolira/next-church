'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useUIStore } from '@/features/ui/store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { type FeedPost } from '@/lib/db';
import { Heart, MessageCircle, Send, BookOpen, Flame, Trophy, PenLine, Filter, Megaphone, Calendar, Target, Globe, Pin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const POST_TYPE_CONFIG = {
  announcement: { label: 'Aviso', icon: Megaphone, color: 'text-sky-500' },
  verse: { label: 'Versículo', icon: BookOpen, color: 'text-primary' },
  devotional: { label: 'Devocional', icon: Flame, color: 'text-orange-500' },
  testimony: { label: 'Testemunho', icon: Heart, color: 'text-pink-500' },
  prayer: { label: 'Pedido de Oração', icon: PenLine, color: 'text-blue-500' },
  quiz_score: { label: 'Quiz', icon: Trophy, color: 'text-yellow-500' },
  event: { label: 'Evento', icon: Calendar, color: 'text-emerald-500' },
  social_project: { label: 'Projeto Social', icon: Target, color: 'text-pink-500' },
};

const PAGE_SIZE = 10;

type GroupOption = {
  id: string;
  name: string;
  type: string;
};

type MemberOption = {
  id: string;
  name: string;
  email?: string;
};

function sortFeedPosts(items: FeedPost[]) {
  const now = Date.now();
  return [...items].sort((left, right) => {
    const leftPinned = left.pinnedUntil ? new Date(left.pinnedUntil).getTime() > now : false;
    const rightPinned = right.pinnedUntil ? new Date(right.pinnedUntil).getTime() > now : false;
    if (leftPinned !== rightPinned) return leftPinned ? -1 : 1;

    const leftCreated = new Date(left.createdAt).getTime();
    const rightCreated = new Date(right.createdAt).getTime();
    return rightCreated - leftCreated;
  });
}

export default function FeedPage() {
  const { data: session } = useSession();
  const user = session?.user;
  const role = user?.role?.toUpperCase() ?? 'MEMBER';
  const canPostAnnouncement = ['ADMIN', 'PASTOR'].includes(role);
  const canTargetFeed = ['ADMIN', 'PASTOR'].includes(role);
  const setPageTitle = useUIStore((state) => state.setPageTitle);

  const [newPostContent, setNewPostContent] = useState('');
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostType, setNewPostType] = useState<FeedPost['type']>('testimony');
  const [newMediaUrl, setNewMediaUrl] = useState('');
  const [newMediaType, setNewMediaType] = useState<'image' | 'video'>('image');
  const [newVisibility, setNewVisibility] = useState<NonNullable<FeedPost['visibility']>>('public');
  const [newGroupId, setNewGroupId] = useState('');
  const [newTargetUserId, setNewTargetUserId] = useState('');
  const [notifyResponsibles, setNotifyResponsibles] = useState(false);
  const [composing, setComposing] = useState(false);
  const [commentingOn, setCommentingOn] = useState<string | number | null>(null);
  const [commentText, setCommentText] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [groups, setGroups] = useState<GroupOption[]>([]);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const sortedPosts = useMemo(() => sortFeedPosts(posts), [posts]);

  useEffect(() => {
    setPageTitle('Comunidade');
  }, [setPageTitle]);

  useEffect(() => {
    let active = true;

    const loadOptions = async () => {
      try {
        const [groupsResponse, membersResponse] = await Promise.all([
          fetch('/api/groups', { cache: 'no-store' }),
          fetch('/api/members', { cache: 'no-store' }),
        ]);

        if (!groupsResponse.ok || !membersResponse.ok) throw new Error();

        const [groupsPayload, membersPayload] = await Promise.all([groupsResponse.json(), membersResponse.json()]);
        if (!active) return;

        setGroups(Array.isArray(groupsPayload) ? groupsPayload : []);
        setMembers(Array.isArray(membersPayload) ? membersPayload : []);
      } catch {
        if (active) {
          setGroups([]);
          setMembers([]);
        }
      }
    };

    void loadOptions();
    return () => {
      active = false;
    };
  }, []);

  const loadPosts = useCallback(async (targetPage: number, append: boolean) => {
    const params = new URLSearchParams({
      page: String(targetPage),
      limit: String(PAGE_SIZE),
      type: filterType,
    });

    const response = await fetch(`/api/feed?${params.toString()}`);
    if (!response.ok) throw new Error('Falha ao carregar feed');

    const payload = await response.json();
    const items = Array.isArray(payload.items) ? payload.items : [];

    setPosts((current) => sortFeedPosts(append ? [...current, ...items] : items));
    setHasMore(Boolean(payload.hasMore));
    setPage(targetPage);
  }, [filterType]);

  useEffect(() => {
    let active = true;

    const run = async () => {
      setInitialLoading(true);
      try {
        await loadPosts(1, false);
      } catch {
        if (active) toast.error('Não foi possível carregar o feed.');
      } finally {
        if (active) setInitialLoading(false);
      }
    };

    run();
    return () => {
      active = false;
    };
  }, [loadPosts]);

  const handleLoadMore = async () => {
    if (loadingMore || !hasMore) return;

    setLoadingMore(true);
    try {
      await loadPosts(page + 1, true);
    } catch {
      toast.error('Não foi possível carregar mais publicações.');
    } finally {
      setLoadingMore(false);
    }
  };

  const handlePost = async () => {
    if (!user?.email || !newPostContent.trim()) return;

    const response = await fetch('/api/feed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: newPostType,
        title: newPostTitle.trim() || undefined,
        content: newPostContent.trim(),
        mediaUrl: newMediaUrl.trim() || undefined,
        mediaType: newMediaUrl.trim() ? newMediaType : undefined,
        visibility: canTargetFeed ? newVisibility : 'public',
        groupId: canTargetFeed && newVisibility === 'group' ? newGroupId : undefined,
        targetUserIds: canTargetFeed && newVisibility === 'individual' && newTargetUserId ? [newTargetUserId] : [],
        notifyResponsibles: canTargetFeed && newVisibility === 'group' ? notifyResponsibles : false,
      }),
    });

    if (!response.ok) {
      toast.error('Não foi possível publicar.');
      return;
    }

    const created = await response.json();
    setPosts((current) => sortFeedPosts([created, ...current]));
    setNewPostTitle('');
    setNewPostContent('');
    setNewMediaUrl('');
    setNewMediaType('image');
    setNewVisibility('public');
    setNewGroupId('');
    setNewTargetUserId('');
    setNotifyResponsibles(false);
    setComposing(false);
    toast.success('Publicado!');
  };

  const handleLike = async (post: FeedPost) => {
    if (!user?.email || !post.id) return;

    const response = await fetch(`/api/feed/${post.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggle-like' }),
    });

    if (!response.ok) {
      toast.error('Não foi possível registrar a curtida.');
      return;
    }

    const updated = await response.json();
    setPosts((current) => sortFeedPosts(current.map((item) => item.id === updated.id ? updated : item)));
  };

  const handleComment = async (post: FeedPost) => {
    if (!user?.email || !post.id || !commentText.trim()) return;

    const response = await fetch(`/api/feed/${post.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'add-comment',
        content: commentText.trim(),
      }),
    });

    if (!response.ok) {
      toast.error('Não foi possível comentar.');
      return;
    }

    const updated = await response.json();
    setPosts((current) => sortFeedPosts(current.map((item) => item.id === updated.id ? updated : item)));
    setCommentText('');
    setCommentingOn(null);
  };

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-4 pb-20">
      {!composing ? (
        <Card className="cursor-pointer hover:border-primary/30 transition-colors" onClick={() => setComposing(true)}>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <Avatar className="w-9 h-9">
                <AvatarFallback className="bg-primary/10 text-primary text-sm">{user?.name?.[0] || 'U'}</AvatarFallback>
              </Avatar>
              <span className="text-sm text-muted-foreground">Compartilhe algo com a comunidade...</span>
            </div>
          </CardContent>
        </Card>
      ) : (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-primary/30">
            <CardContent className="pt-4 space-y-3">
              <div className="flex items-center gap-2">
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">{user?.name?.[0] || 'U'}</AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">{user?.name}</span>
                <Select value={newPostType} onValueChange={(v) => setNewPostType(v as FeedPost['type'])}>
                  <SelectTrigger className="w-auto h-7 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {canPostAnnouncement ? <SelectItem value="announcement">Aviso</SelectItem> : null}
                    <SelectItem value="event">Evento</SelectItem>
                    <SelectItem value="social_project">Projeto Social</SelectItem>
                    <SelectItem value="testimony">Testemunho</SelectItem>
                    <SelectItem value="prayer">Pedido de Oração</SelectItem>
                    <SelectItem value="devotional">Devocional</SelectItem>
                    <SelectItem value="verse">Versículo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {['announcement', 'event', 'social_project'].includes(newPostType) ? (
                  <div className="space-y-1 sm:col-span-2">
                    <p className="text-xs font-medium text-muted-foreground">Título</p>
                    <Input
                      value={newPostTitle}
                      onChange={(event) => setNewPostTitle(event.target.value)}
                      placeholder="Título da publicação"
                      className="h-9 text-sm"
                    />
                  </div>
                ) : null}
                {canTargetFeed ? (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Visibilidade</p>
                    <Select value={newVisibility} onValueChange={(value) => setNewVisibility(value as NonNullable<FeedPost['visibility']>)}>
                      <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="public">Todos</SelectItem>
                        <SelectItem value="group">Grupo específico</SelectItem>
                        <SelectItem value="individual">Individual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Visibilidade</p>
                    <div className="flex h-9 items-center gap-2 rounded-md border px-3 text-xs text-muted-foreground">
                      <Globe className="h-3.5 w-3.5" />
                      <span>Pública</span>
                    </div>
                  </div>
                )}
                {canTargetFeed && newVisibility === 'group' ? (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Grupo</p>
                    <Select value={newGroupId} onValueChange={setNewGroupId}>
                      <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Selecione um grupo" /></SelectTrigger>
                      <SelectContent>
                        {groups.map((group) => (
                          <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}
                {canTargetFeed && newVisibility === 'individual' ? (
                  <div className="space-y-1 sm:col-span-2">
                    <p className="text-xs font-medium text-muted-foreground">Destinatário</p>
                    <Select value={newTargetUserId} onValueChange={setNewTargetUserId}>
                      <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Selecione um membro" /></SelectTrigger>
                      <SelectContent>
                        {members.filter((member) => member.email).map((member) => (
                          <SelectItem key={member.id} value={member.email!}>{member.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}
                <div className="space-y-1 sm:col-span-2">
                  <p className="text-xs font-medium text-muted-foreground">Mídia opcional</p>
                  <div className="grid gap-2 sm:grid-cols-[140px_minmax(0,1fr)]">
                    <Select value={newMediaType} onValueChange={(value) => setNewMediaType(value as 'image' | 'video')}>
                      <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="image">Imagem</SelectItem>
                        <SelectItem value="video">Vídeo</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      value={newMediaUrl}
                      onChange={(event) => setNewMediaUrl(event.target.value)}
                      placeholder={newMediaType === 'video' ? 'URL do vídeo' : 'URL da imagem'}
                      className="h-9 text-sm"
                    />
                  </div>
                </div>
                {canTargetFeed && newVisibility === 'group' ? (
                  <div className="sm:col-span-2">
                    <button
                      type="button"
                      onClick={() => setNotifyResponsibles((current) => !current)}
                      className={cn(
                        'flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition-colors',
                        notifyResponsibles ? 'border-primary bg-primary/5' : 'border-border',
                      )}
                    >
                      <div className="pr-3">
                        <p className="font-medium">Notificar responsáveis do grupo</p>
                        <p className="text-xs text-muted-foreground">
                          Em grupos infantis, inclui responsáveis das crianças. Nos demais, inclui líderes e responsáveis do grupo.
                        </p>
                      </div>
                      <Badge variant={notifyResponsibles ? 'default' : 'outline'}>
                        {notifyResponsibles ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </button>
                  </div>
                ) : null}
              </div>
              <Textarea
                placeholder="No que você está pensando?"
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                rows={3}
                className="resize-none"
              />
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={() => setComposing(false)}>Cancelar</Button>
                <Button
                  size="sm"
                  onClick={handlePost}
                  disabled={
                    !newPostContent.trim() ||
                    (canTargetFeed && newVisibility === 'group' && !newGroupId) ||
                    (canTargetFeed && newVisibility === 'individual' && !newTargetUserId)
                  }
                >
                  <Send className="w-3 h-3 mr-1" /> Publicar
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
        <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
        {['all', 'announcement', 'event', 'social_project', 'verse', 'devotional', 'testimony', 'prayer', 'quiz_score'].map((type) => (
          <Badge
            key={type}
            variant={filterType === type ? 'default' : 'outline'}
            className="cursor-pointer whitespace-nowrap text-xs"
            onClick={() => setFilterType(type)}
          >
            {type === 'all' ? 'Todos' : POST_TYPE_CONFIG[type as keyof typeof POST_TYPE_CONFIG]?.label}
          </Badge>
        ))}
      </div>

      <AnimatePresence>
        {initialLoading ? (
          <Card>
            <CardContent className="py-10 text-center">
              <p className="text-sm text-muted-foreground">Carregando publicações...</p>
            </CardContent>
          </Card>
        ) : sortedPosts.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center">
              <MessageCircle className="w-10 h-10 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">Nenhuma publicação ainda.</p>
              <p className="text-xs text-muted-foreground">Seja o primeiro a compartilhar.</p>
            </CardContent>
          </Card>
        ) : (
          sortedPosts.map((post) => {
            const config = POST_TYPE_CONFIG[post.type] ?? POST_TYPE_CONFIG.testimony;
            const Icon = config.icon;
            const currentUserId = user?.email || '';
            const liked = currentUserId ? post.likes.includes(currentUserId) : false;

            return (
              <motion.div key={String(post.id)} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} layout>
                <Card className="overflow-hidden border-border">
                  <CardContent className="pt-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">{post.userName[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{post.userName}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: ptBR })}
                        </p>
                      </div>
                      <div className="flex flex-wrap justify-end gap-1">
                        {post.pinnedUntil && new Date(post.pinnedUntil).getTime() > Date.now() ? (
                          <Badge variant="outline" className="text-[10px] h-6">
                            <Pin className="mr-1 h-3 w-3" />
                            Fixado
                          </Badge>
                        ) : null}
                        <Badge variant="secondary" className="text-[10px] gap-1 px-2 h-6">
                          <Icon className={cn('w-3 h-3', config.color)} />
                          {config.label}
                        </Badge>
                        {post.visibility ? (
                          <Badge variant="outline" className="text-[10px] h-6">
                            {post.visibility === 'public' ? 'Todos' : post.visibility === 'group' ? 'Grupo' : 'Individual'}
                          </Badge>
                        ) : null}
                      </div>
                    </div>

                    <div>
                      {post.groupId ? (
                        <p className="mb-1 text-[11px] font-medium text-primary">
                          {groups.find((group) => group.id === post.groupId)?.name ?? 'Grupo'}
                        </p>
                      ) : null}
                      {post.senderType === 'group' ? (
                        <p className="mb-1 text-[11px] font-medium text-muted-foreground">
                          Publicado em nome do grupo
                        </p>
                      ) : null}
                      {post.title ? (
                        <h3 className="mb-2 text-sm font-semibold text-foreground">{post.title}</h3>
                      ) : null}
                      {post.type === 'verse' && post.reference && (
                        <p className="text-xs font-medium text-primary mb-1">{post.reference}</p>
                      )}
                      <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">{post.content}</p>
                      {post.mediaUrl ? (
                        <div className="mt-3 overflow-hidden rounded-xl border bg-muted/20">
                          {post.mediaType === 'video' ? (
                            <video src={post.mediaUrl} controls className="max-h-80 w-full bg-black object-cover" />
                          ) : (
                            <img src={post.mediaUrl} alt={post.title || 'Mídia da publicação'} className="max-h-80 w-full object-cover" />
                          )}
                        </div>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-1 pt-1 border-t border-border mt-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className={cn('text-xs gap-1 h-8 px-2', liked && 'text-pink-500 hover:text-pink-600')}
                        onClick={() => handleLike(post)}
                      >
                        <Heart className={cn('w-3.5 h-3.5', liked && 'fill-current')} />
                        {post.likes.length > 0 && post.likes.length}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs gap-1 h-8 px-2"
                        onClick={() => setCommentingOn(commentingOn === post.id ? null : post.id ?? null)}
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        {post.comments.length > 0 && post.comments.length}
                      </Button>
                    </div>

                    {post.comments.length > 0 && (
                      <div className="space-y-2 pl-4 border-l-2 border-border mt-2">
                        {post.comments.map((comment) => (
                          <div key={comment.id} className="text-xs">
                            <span className="font-medium mr-1">{comment.userName}</span>
                            <span className="text-muted-foreground">{comment.content}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {commentingOn === post.id && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="flex gap-2 mt-2">
                        <Textarea
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          placeholder="Escreva um comentário..."
                          rows={1}
                          className="resize-none text-xs min-h-[36px] flex-1"
                        />
                        <Button
                          size="icon"
                          className="shrink-0 h-9 w-9"
                          onClick={() => handleComment(post)}
                          disabled={!commentText.trim()}
                        >
                          <Send className="w-3 h-3" />
                        </Button>
                      </motion.div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })
        )}
      </AnimatePresence>

      {hasMore && (
        <div className="pt-2">
          <Button variant="outline" className="w-full" onClick={handleLoadMore} disabled={loadingMore}>
            {loadingMore ? 'Carregando...' : 'Carregar mais'}
          </Button>
        </div>
      )}
    </div>
  );
}
