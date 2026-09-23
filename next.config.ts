import type { NextConfig } from "next";
import { withSerwist } from "@serwist/turbopack";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['app.domilembrancinhas.com.br'],
  experimental: {
    useTypeScriptCli: false,
  },
};

export default withSerwist(nextConfig);
