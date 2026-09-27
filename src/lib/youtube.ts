const YOUTUBE_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be', 'www.youtu.be']);

export function getYouTubeEmbedUrl(value: string | null | undefined) {
  if (!value) return null;
  try {
    const url = new URL(value.trim());
    if (!YOUTUBE_HOSTS.has(url.hostname.toLowerCase())) return null;
    const videoId = url.hostname.includes('youtu.be')
      ? url.pathname.slice(1).split('/')[0]
      : url.searchParams.get('v') ?? url.pathname.match(/\/shorts\/([^/]+)/)?.[1] ?? url.pathname.match(/\/embed\/([^/]+)/)?.[1];
    return videoId && /^[A-Za-z0-9_-]{6,}$/.test(videoId) ? `https://www.youtube.com/embed/${videoId}` : null;
  } catch {
    return null;
  }
}
