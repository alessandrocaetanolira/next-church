import { type FeedPost } from '@/lib/db';
import { apiRequest } from '@/services/api/client';

export type FeedPage = { items: FeedPost[]; hasMore?: boolean };
export type FeedGroupOption = { id: string; name: string; type: string };
export type FeedMemberOption = { id: string; name: string; email?: string };

export function listFeedOptions() {
  return Promise.all([
    apiRequest<FeedGroupOption[]>('/api/groups', { cache: 'no-store' }),
    apiRequest<FeedMemberOption[]>('/api/members', { cache: 'no-store' }),
  ]);
}

export function listFeedPosts(page: number, limit: number, type: string) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit), type });
  return apiRequest<FeedPage>(`/api/feed?${params.toString()}`);
}

export function getFeedPost(postId: string | number) {
  return apiRequest<FeedPost>(`/api/feed/${postId}`);
}

export function createFeedPost(input: unknown) {
  return apiRequest<FeedPost>('/api/feed', { method: 'POST', body: JSON.stringify(input) });
}

export function uploadFeedImage(dataUrl: string) {
  return apiRequest<{ url: string }>('/api/files/upload', {
    method: 'POST',
    body: JSON.stringify({ module: 'feed', dataUrl }),
  });
}

export function toggleFeedLike(postId: string | number) {
  return apiRequest<FeedPost>(`/api/feed/${postId}`, { method: 'PATCH', body: JSON.stringify({ action: 'toggle-like' }) });
}

export function addFeedComment(postId: string | number, content: string, parentId?: string) {
  return apiRequest<FeedPost>(`/api/feed/${postId}`, { method: 'PATCH', body: JSON.stringify({ action: 'add-comment', content, parentId }) });
}
