import { createSerwistRoute } from "@serwist/turbopack";

export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } = createSerwistRoute({
  swSrc: "src/app/sw.ts",
  useNativeEsbuild: true,
  additionalPrecacheEntries: [
    // Sem `revision`, o Serwist busca estas rotas novamente a cada instalação
    // do SW. Isso evita depender de subprocessos (como `git rev-parse`) no
    // build do Turbopack e preserva o fallback de leitura offline.
    { url: "/bible" },
    { url: "/offline" },
  ],
});
