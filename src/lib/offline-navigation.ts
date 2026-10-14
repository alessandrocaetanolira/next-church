/** Flight não aceita HTML como payload: redireciona para um documento precacheado.
 * O Next segue a resposta HTML com uma navegação documental, atendida pelo worker.
 * Não contém dados privados nem armazena respostas RSC.
 */
export function offlineNavigationRedirect(
  request: Request,
  isPrecached: (url: string) => boolean,
): Response {
  const requested = new URL(request.url);
  const documentUrl = new URL(requested.pathname, requested.origin);
  const target = isPrecached(documentUrl.href)
    ? documentUrl
    : new URL("/offline", requested.origin);
  // Sem _rsc: o destino corresponde ao documento no precache, evitando loops.
  return Response.redirect(target.href, 307);
}

export function isOfflineNavigation(request: Request): boolean {
  return request.method === "GET" &&
    (request.mode === "navigate" || request.destination === "document");
}

/** Entrega o HTML já armazenado, sem uma segunda navegação de rede no Safari. */
export async function offlineDocumentResponse(
  request: Request,
  matchPrecache: (url: string) => Promise<Response | undefined>,
): Promise<Response> {
  const url = new URL(request.url);
  const saved = await matchPrecache(new URL(url.pathname, url.origin).href);
  if (saved) return saved;
  const fallback = await matchPrecache("/offline");
  if (fallback) return fallback;
  // Cache removido pelo navegador: não depender de chunks ausentes para avisar.
  return new Response(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sem conexão</title></head><body style="margin:0;padding:24px;font-family:system-ui;background:#fff;color:#222"><h1>Você está offline</h1><p>Reconecte o aplicativo para preparar os arquivos necessários para uso offline.</p></body></html>`, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}
