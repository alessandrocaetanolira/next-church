import type { Metadata, Viewport } from "next";
import { SerwistProvider } from "@serwist/turbopack/react";
import "./globals.css";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { PWAProvider } from "@/components/providers/PWAProvider";
import { AppSettingsProvider } from "@/components/providers/AppSettingsProvider";
import { DrawerProvider } from "@/components/providers/DrawerProvider";
import { LayoutWrapper } from "@/components/layout/LayoutWrapper";

export const metadata: Metadata = {
  title: "Church App",
  description: "Gestão completa para igrejas",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/pwa-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/pwa-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/pwa-192x192.png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Church App",
  },
};

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
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className="font-sans">
        <SerwistProvider swUrl="/serwist/sw.js" options={{ scope: "/", updateViaCache: "none" }}>
          <AuthProvider>
            <AppSettingsProvider>
              <DrawerProvider>
                <PWAProvider>
                  <LayoutWrapper>
                    {children}
                  </LayoutWrapper>
                </PWAProvider>
              </DrawerProvider>
            </AppSettingsProvider>
          </AuthProvider>
        </SerwistProvider>
      </body>
    </html>
  );
}
