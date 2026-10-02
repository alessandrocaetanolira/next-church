import type { NextConfig } from "next";
import { withSerwist } from "@serwist/turbopack";

const nextConfig: NextConfig = {
  // Next espera hostnames (sem protocolo) nesta lista.
  allowedDevOrigins: ["church.bennipersonalizados.com.br"],
  turbopack: {
    root: process.cwd(),
  },
  typescript: {
    tsconfigPath: "tsconfig.build.json",
  },
  experimental: {
    useTypeScriptCli: false,
  },
};

export default withSerwist(nextConfig);
