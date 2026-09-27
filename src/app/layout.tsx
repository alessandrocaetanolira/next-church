import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { SerwistProvider } from "@serwist/turbopack/react";
import "animate.css";
import "./globals.css";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { PWAProvider } from "@/components/providers/PWAProvider";
import { AppSettingsProvider } from "@/components/providers/AppSettingsProvider";
import { DrawerProvider } from "@/components/providers/DrawerProvider";
import { LayoutWrapper } from "@/components/layout/LayoutWrapper";
import { getGlobalClient } from "@/lib/prisma-factory";
import { BrandingRepository } from "@/server/branding/branding.repository";
import { BrandingService } from "@/server/branding/branding.service";
import { getTenantPwaIconUrl } from "@/lib/branding/pwa-assets";

export const dynamic = "force-dynamic";

const fallbackMetadata: Metadata = {
  title: "Church App",
  description: "Gestão completa para igrejas",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/pwa-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/pwa-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/pwa-192x192.png", sizes: "192x192", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Church App",
  },
};

export async function generateMetadata(): Promise<Metadata> {
  try {
    const slug = (await cookies()).get("church-tenant-slug")?.value;
    if (!slug) return fallbackMetadata;

    const repository = new BrandingRepository(getGlobalClient());
    const row = await repository.findPublic(decodeURIComponent(slug));
    if (!row?.active) return fallbackMetadata;

    const branding = new BrandingService(repository).normalize(row);
    const icon192 = getTenantPwaIconUrl(branding.slug, 192, branding.brandingVersion);
    const icon512 = getTenantPwaIconUrl(branding.slug, 512, branding.brandingVersion);
    const title = branding.pwaName || branding.name || "Church App";

    return {
      ...fallbackMetadata,
      title,
      icons: {
        icon: [
          { url: icon192, sizes: "192x192", type: "image/png" },
          { url: icon512, sizes: "512x512", type: "image/png" },
        ],
        apple: [{ url: icon192, sizes: "192x192", type: "image/png" }],
      },
      appleWebApp: { capable: true, statusBarStyle: "default", title },
    };
  } catch {
    return fallbackMetadata;
  }
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0f172a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const appContent = (
    <AuthProvider>
      <AppSettingsProvider>
        <DrawerProvider>
          <PWAProvider>
            <LayoutWrapper>{children}</LayoutWrapper>
          </PWAProvider>
        </DrawerProvider>
      </AppSettingsProvider>
    </AuthProvider>
  );

  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className="font-sans">
        {process.env.NODE_ENV === 'production' ? (
          <SerwistProvider swUrl="/serwist/sw.js" options={{ scope: "/", updateViaCache: "none" }}>
            {appContent}
          </SerwistProvider>
        ) : appContent}
      </body>
    </html>
  );
}
