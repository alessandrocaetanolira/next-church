import { createSerwistRoute } from "@serwist/turbopack";
import { revisionOfflineDocuments } from "@/lib/pwa/precache-manifest";

const serwistRoute = createSerwistRoute({
  swSrc: "src/app/sw.ts",
  useNativeEsbuild: true,
  // Hash dos assets produzidos pelo build, sem subprocessos nem lista manual
  // de chunks. A entrada real do manifesto PWA também precisa estar no cache.
  manifestTransforms: [revisionOfflineDocuments],
});

export const { dynamic, dynamicParams, revalidate, generateStaticParams } = serwistRoute;

/** O artefato é gerado no build, mas sua URL mutável não deve ficar retida no CDN. */
export async function GET(request: Request, context: Parameters<typeof serwistRoute.GET>[1]) {
  const response = await serwistRoute.GET(request, context);
  response.headers.set('Cache-Control', 'no-store, no-cache, max-age=0, must-revalidate');
  response.headers.set('CDN-Cache-Control', 'no-store');
  response.headers.set('Cloudflare-CDN-Cache-Control', 'no-store');
  return response;
}
