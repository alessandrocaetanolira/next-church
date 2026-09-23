import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { PWAProvider } from "@/components/providers/PWAProvider";
import { AppSettingsProvider } from "@/components/providers/AppSettingsProvider";
import { DrawerProvider } from "@/components/providers/DrawerProvider";
import { LayoutWrapper } from "@/components/layout/LayoutWrapper";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Church App",
  description: "Gestão completa para igrejas",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/pwa-192x192.svg", sizes: "192x192", type: "image/svg+xml" },
      { url: "/pwa-512x512.svg", sizes: "512x512", type: "image/svg+xml" },
    ],
    apple: [{ url: "/pwa-192x192.svg" }],
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
      <body className={inter.className}>
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
      </body>
    </html>
  );
}
