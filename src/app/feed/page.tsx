'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useUIStore } from '@/features/ui/store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { FilterChip } from '@/components/ui/filter-chip';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { type FeedPost } from '@/lib/db';
import { Heart, MessageCircle, Send, BookOpen, Flame, Trophy, PenLine, Filter, Megaphone, Calendar, Target, Globe, Image as ImageIcon, BarChart3, LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { hasActionPermission } from '@/lib/access-control';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { addFeedComment, createFeedPost, listFeedOptions, listFeedPosts, toggleFeedLike, uploadFeedImage, type FeedGroupOption, type FeedMemberOption } from '@/services/feed/feed-api';
import { getYouTubeEmbedUrl } from '@/lib/youtube';
import { FeedWebPostList } from '@/features/feed/components/FeedWebPostList';
import { FeedWebTable } from '@/features/feed/components/FeedWebTable';
import { WebPageLayout } from '@/components/shared/web';
import { MobileFeedComposer } from '@/features/feed/components/MobileFeedComposer';
import { SharedFlatList } from '@/components/SharedFlatList';
import { MobileCommentsDrawer } from '@/features/feed/components/MobileCommentsDrawer';
import { useRouter } from 'next/navigation';

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

const PAGE_SIZE = 10;

type GroupOption = FeedGroupOption;
type MemberOption = FeedMemberOption;

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
  const router = useRouter();
  const { user, isOffline } = useAuth();
  const role = user?.role?.toUpperCase() ?? 'MEMBER';
  const canPostAnnouncement = ['ADMIN', 'PASTOR'].includes(role);
  const canTargetFeed = ['ADMIN', 'PASTOR'].includes(role);
  const canCreatePost = hasActionPermission(user, 'feed', 'publish') || hasActionPermission(user, 'feed', 'create');
  const canUpdateFeed = hasActionPermission(user, 'feed', 'comment') || hasActionPermission(user, 'feed', 'update');
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
  const [newPostsAvailable, setNewPostsAvailable] = useState(false);
  const latestPostIdRef = useRef<string | number | undefined>(undefined);
  const sortedPosts = useMemo(() => sortFeedPosts(posts), [posts]);

  useEffect(() => {
    setPageTitle('Comunidade');
  }, [setPageTitle]);

  useEffect(() => {
    const handleFeedUpdate = () => setNewPostsAvailable(true);
    window.addEventListener('church:feed-post-created', handleFeedUpdate);
    return () => window.removeEventListener('church:feed-post-created', handleFeedUpdate);
  }, []);

  useEffect(() => {
    let active = true;

    const loadOptions = async () => {
      try {
        const [groupsPayload, membersPayload] = await listFeedOptions();
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
    const payload = await listFeedPosts(targetPage, PAGE_SIZE, filterType);
    const items = Array.isArray(payload.items) ? payload.items : [];

    setPosts((current) => sortFeedPosts(append ? [...current, ...items] : items));
    if (!append) {
      latestPostIdRef.current = items[0]?.id;
      setNewPostsAvailable(false);
    }
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

  useEffect(() => {
    if (initialLoading || isOffline) return;

    const checkForNewPosts = async () => {
      try {
        const payload = await listFeedPosts(1, PAGE_SIZE, filterType);
        const newestId = Array.isArray(payload.items) ? payload.items[0]?.id : undefined;
        if (newestId !== undefined && latestPostIdRef.current !== undefined && newestId !== latestPostIdRef.current) {
          setNewPostsAvailable(true);
        }
      } catch {
        // A atualização silenciosa não deve interromper a leitura do Feed.
      }
    };

    const interval = window.setInterval(() => void checkForNewPosts(), 30_000);
    return () => window.clearInterval(interval);
  }, [filterType, initialLoading, isOffline]);

  const handleRefreshNewPosts = async () => {
    try {
      await loadPosts(1, false);
    } catch {
      toast.error('Não foi possível atualizar o Feed.');
    }
  };

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
    if (isOffline) {
      toast.info('Publicações exigem conexão. O conteúdo não foi enviado.');
      return;
    }

    try {
      const youtubeUrl = newPostContent.match(/https?:\/\/[^\s]+/g)?.map((value) => value.replace(/[),.]+$/, '')).find((value) => getYouTubeEmbedUrl(value));
      const created = await createFeedPost({
        type: newPostType,
        title: newPostTitle.trim() || undefined,
        content: newPostContent.trim(),
        mediaUrl: newMediaUrl.trim() || youtubeUrl || undefined,
        mediaType: newMediaUrl.trim() ? 'image' : youtubeUrl ? 'video' : undefined,
        visibility: canTargetFeed ? newVisibility : 'public',
        groupId: canTargetFeed && newVisibility === 'group' ? newGroupId : undefined,
        targetUserIds: canTargetFeed && newVisibility === 'individual' && newTargetUserId ? [newTargetUserId] : [],
        notifyResponsibles: canTargetFeed && newVisibility === 'group' ? notifyResponsibles : false,
      });
      setPosts((current) => sortFeedPosts([created, ...current]));
      latestPostIdRef.current = created.id;
      setNewPostsAvailable(false);
    } catch {
      toast.error('Não foi possível publicar.');
      return;
    }
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

  const handleFeedImageUpload = async (dataUrl: string) => {
    try {
      const uploaded = await uploadFeedImage(dataUrl);
      setNewMediaUrl(uploaded.url);
      setNewMediaType('image');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível carregar a imagem.');
    }
  };

  const handleLike = async (post: FeedPost) => {
    if (!user?.email || !post.id) return;
    if (isOffline) {
      toast.info('Curtidas exigem conexão.');
      return;
    }

    try {
      const updated = await toggleFeedLike(post.id);
      setPosts((current) => sortFeedPosts(current.map((item) => item.id === updated.id ? updated : item)));
    } catch {
      toast.error('Não foi possível registrar a curtida.');
      return;
    }
  };

  const handleComment = async (post: FeedPost) => {
    if (!user?.email || !post.id || !commentText.trim()) return;
    if (isOffline) {
      toast.info('Comentários exigem conexão.');
      return;
    }

    try {
      const updated = await addFeedComment(post.id, commentText.trim());
      setPosts((current) => sortFeedPosts(current.map((item) => item.id === updated.id ? updated : item)));
    } catch {
      toast.error('Não foi possível comentar.');
      return;
    }
    setCommentText('');
    setCommentingOn(null);
  };

  return (
    <WebPageLayout className="overflow-x-hidden">
      {isOffline && (canCreatePost || canUpdateFeed) ? (
        <div className="rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-muted-foreground">
          Você está offline. Publicações, curtidas e comentários ficam disponíveis somente quando a conexão retornar.
        </div>
      ) : null}
      {canCreatePost && !isOffline && !composing ? (
        <Card className="cursor-pointer rounded-xl border-border shadow-sm transition-colors hover:border-primary/30" onClick={() => setComposing(true)}>
          <CardContent className="flex items-center gap-2.5 p-2.5">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <Avatar className="h-7 w-7 shrink-0">
                <AvatarFallback className="bg-primary/10 text-primary text-xs">{user?.name?.[0] || 'U'}</AvatarFallback>
              </Avatar>
              <span className="truncate text-sm text-muted-foreground">Compartilhe algo com a comunidade...</span>
            </div>
            <div className="hidden items-center gap-1 text-muted-foreground sm:flex">
              <ImageIcon className="h-4 w-4" /><Calendar className="h-4 w-4" /><BarChart3 className="h-4 w-4" />
            </div>
          </CardContent>
        </Card>
      ) : canCreatePost && !isOffline ? (
        <>
          <MobileFeedComposer
            userName={user?.name ?? 'Administrador'}
            userInitial={(user?.name?.[0] ?? 'A').toUpperCase()}
            content={newPostContent}
            title={newPostTitle}
            postType={newPostType}
            visibility={newVisibility}
            mediaType={newMediaType}
            mediaUrl={newMediaUrl}
            groupId={newGroupId}
            targetUserId={newTargetUserId}
            groups={groups}
            members={members}
            canTargetFeed={canTargetFeed}
            disabled={initialLoading}
            onContentChange={setNewPostContent}
            onTitleChange={setNewPostTitle}
            onPostTypeChange={setNewPostType}
            onVisibilityChange={setNewVisibility}
            onMediaTypeChange={setNewMediaType}
            onMediaUrlChange={setNewMediaUrl}
            onImageUpload={handleFeedImageUpload}
            onGroupChange={setNewGroupId}
            onTargetUserChange={setNewTargetUserId}
            onClose={() => setComposing(false)}
            onPublish={handlePost}
          />
        <div className="hidden animate-in fade-in slide-in-from-top-2 duration-300 md:block">
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
                    <div className="flex h-9 items-center gap-2 rounded-md border border-border px-3 text-xs text-muted-foreground">
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
        </div>
        </>
      ) : null}

      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide md:hidden">
        {['all', 'announcement', 'event', 'social_project', 'verse', 'devotional', 'testimony'].map((type) => {
          const config = type === 'all' ? { label: 'Todos', icon: LayoutGrid, color: '' } : POST_TYPE_CONFIG[type as keyof typeof POST_TYPE_CONFIG];
          const Icon = config.icon;
          return (
            <button key={type} type="button" onClick={() => setFilterType(type)} className="flex min-w-[56px] shrink-0 flex-col items-center gap-1 text-[10px]">
              <span className={cn('flex h-10 w-10 items-center justify-center rounded-full border bg-muted/30', filterType === type ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground')}><Icon className="h-5 w-5" /></span>
              <span className={cn('max-w-20 truncate', filterType === type ? 'font-semibold text-foreground' : 'text-muted-foreground')}>{config.label}</span>
            </button>
          );
        })}
      </div>
      <div className="hidden items-center gap-2 overflow-x-auto pb-1 scrollbar-hide md:flex">
        <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
        {['all', 'announcement', 'event', 'social_project', 'verse', 'devotional', 'testimony', 'prayer', 'quiz_score'].map((type) => (
          <FilterChip
            key={type}
            active={filterType === type}
            onClick={() => setFilterType(type)}
          >
            {type === 'all' ? 'Todos' : POST_TYPE_CONFIG[type as keyof typeof POST_TYPE_CONFIG]?.label}
          </FilterChip>
        ))}
      </div>

      {newPostsAvailable ? (
        <button type="button" onClick={() => void handleRefreshNewPosts()} className="mx-auto flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/15">
          Novas publicações disponíveis
          <span aria-hidden="true">↓</span>
        </button>
      ) : null}

      <>
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
          <>
            <div className="hidden md:block"><FeedWebTable posts={sortedPosts} groups={groups} currentUserId={user?.email || ''} canUpdateFeed={canUpdateFeed} commentingOn={commentingOn} commentText={commentText} onLike={handleLike} onComment={handleComment} onToggleComment={setCommentingOn} onCommentTextChange={setCommentText} onOpenPost={(post) => router.push(`/feed/${post.id}`)} /></div>
            <div className="md:hidden">
              <SharedFlatList
                data={sortedPosts}
                keyExtractor={(post) => String(post.id)}
                onEndReached={() => void handleLoadMore()}
                hasMore={hasMore}
                loadingMore={loadingMore}
                className="gap-4"
                renderItem={(post) => <FeedWebPostList posts={[post]} groups={groups} currentUserId={user?.email || ''} canUpdateFeed={canUpdateFeed} commentingOn={commentingOn} onLike={handleLike} onToggleComment={setCommentingOn} onOpenPost={(item) => router.push(`/feed/${item.id}`)} />}
              />
            </div>
          </>
        )}
      </>

      {hasMore && (
        <div className="hidden pt-2 md:block">
          <Button variant="outline" className="w-full" onClick={handleLoadMore} disabled={loadingMore}>
            {loadingMore ? 'Carregando...' : 'Carregar mais'}
          </Button>
        </div>
      )}
      <MobileCommentsDrawer
        post={sortedPosts.find((post) => post.id === commentingOn) ?? null}
        open={commentingOn !== null}
        onNewComment={(post) => router.push(`/feed/${post.id}/comments/new`)}
        onReply={(post, commentId) => router.push(`/feed/${post.id}/comments/new?replyTo=${encodeURIComponent(commentId)}`)}
        onClose={() => setCommentingOn(null)}
      />
    </WebPageLayout>
  );
}
