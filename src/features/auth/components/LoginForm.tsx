/**
 * features/auth/components/LoginForm.tsx
 * 
 * Componente de formulário de login do Church App.
 * Permite que o usuário insira suas credenciais e o slug da igreja (Multi-tenancy).
 * 
 * @returns {JSX.Element} Formulário de Login.
 */

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import type { ThemeVariant } from "@/components/providers/AppSettingsProvider";
import { getPublicChurchBranding, type PublicChurchBranding } from '@/services/auth/public-auth-api';
import { AppImage } from '@/components/shared';

/**
 * LoginForm Component
 * 
 * Gerencia o estado dos campos de login e lida com a autenticação via NextAuth.
 */
export function LoginForm({
  initialSlug = '',
  initialBranding = null,
  lockTenant = false,
  globalOnly = false,
}: {
  initialSlug?: string;
  initialBranding?: PublicChurchBranding | null;
  lockTenant?: boolean;
  globalOnly?: boolean;
}) {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [churchSlug, setChurchSlug] = useState(globalOnly ? '' : (initialSlug || (searchParams.get('igreja')?.trim().toLowerCase() ?? "")));
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [branding, setBranding] = useState<PublicChurchBranding | null>(initialBranding);
  const [logoFailed, setLogoFailed] = useState(false);
  const [logoLoaded, setLogoLoaded] = useState(false);
  const registerHref = churchSlug ? `/cadastro?igreja=${encodeURIComponent(churchSlug)}` : '/cadastro';

  const rememberedTenantSlug = () => {
    if (typeof document === 'undefined') return '';
    const cookieSlug = document.cookie
      .split('; ')
      .find((entry) => entry.startsWith('church-tenant-slug='))
      ?.split('=')[1];
    if (cookieSlug) {
      try { return decodeURIComponent(cookieSlug).trim().toLowerCase(); } catch { return cookieSlug.trim().toLowerCase(); }
    }
    try {
      return localStorage.getItem('church-last-tenant-slug')?.trim().toLowerCase() ?? '';
    } catch {
      return '';
    }
  };

  useEffect(() => {
    const nextSlug = searchParams.get('igreja')?.trim().toLowerCase() ?? '';
    const rememberedSlug = nextSlug || rememberedTenantSlug();
    setChurchSlug(globalOnly ? '' : lockTenant ? initialSlug.trim().toLowerCase() : rememberedSlug);
  }, [globalOnly, initialSlug, lockTenant, searchParams]);

  useEffect(() => {
    const normalized = initialSlug.trim().toLowerCase();
    if (!normalized) return;
    document.cookie = `church-tenant-slug=${encodeURIComponent(normalized)}; Path=/; Max-Age=31536000; SameSite=Lax`;
  }, [initialSlug]);

  useEffect(() => {
    const normalized = churchSlug.trim().toLowerCase();
    if (!normalized) {
      setBranding(null);
      return;
    }

    const timeout = window.setTimeout(async () => {
      try {
        const payload = await getPublicChurchBranding(normalized);
        setBranding(payload);
      } catch {
        setBranding(null);
      }
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [churchSlug]);

  useEffect(() => {
    setLogoFailed(false);
    setLogoLoaded(false);
  }, [branding?.logoUrl, branding?.logoLightUrl, branding?.logoDarkUrl, branding?.mobileIconUrl]);

  useEffect(() => {
    const root = document.documentElement;
    const nextVariant = branding?.themeVariant ?? 'default';

    if (nextVariant === 'default') {
      root.removeAttribute('data-theme');
    } else {
      root.setAttribute('data-theme', nextVariant);
    }

    return () => {
      root.removeAttribute('data-theme');
    };
  }, [branding?.themeVariant]);

  /**
   * Lida com a submissão do formulário.
   * @param {React.FormEvent} e - Evento de formulário.
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!navigator.onLine) {
      const message = 'Você está offline. Conecte-se à internet para autenticar.';
      setErrorMessage(message);
      toast.error(message);
      return;
    }
    setLoading(true);
    const resolvedChurchSlug = (globalOnly ? '' : lockTenant ? initialSlug : churchSlug).trim().toLowerCase();

    try {
      if (resolvedChurchSlug) {
        document.cookie = `church-tenant-slug=${encodeURIComponent(resolvedChurchSlug)}; Path=/; Max-Age=31536000; SameSite=Lax`;
        try { localStorage.setItem('church-last-tenant-slug', resolvedChurchSlug); } catch { /* memória opcional */ }
      }
      const result = await signIn("credentials", {
        email,
        password,
        churchSlug: resolvedChurchSlug,
        redirect: false,
      });

      if (!result || result.error || result.ok !== true) {
        const message = result?.error === 'Configuration'
          ? 'O serviço de autenticação está indisponível. Verifique a configuração do servidor.'
          : 'Credenciais inválidas, igreja não encontrada ou acesso negado.';
        setErrorMessage(message);
        toast.error(message);
      } else {
        toast.success("Login realizado com sucesso!");
        // Forçar redirecionamento via location para garantir limpeza de estados de cache do Next.js
        window.location.href = resolvedChurchSlug ? "/" : "/admin/tenants";
      }
    } catch (err) {
      console.error("Erro durante o login:", err);
      const message = 'Não foi possível autenticar. Verifique sua conexão e tente novamente.';
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md shadow-lg border-border">
      <CardHeader className="text-center">
        <div className="relative mx-auto mb-3 flex h-24 w-56 items-center justify-center overflow-hidden rounded-2xl border border-border bg-muted/30 px-4 py-3">
          {!logoLoaded && !logoFailed && <Loader2 className="absolute h-6 w-6 animate-spin text-primary" aria-label="Carregando logo" />}
          <AppImage
            src={logoFailed ? (branding?.mobileIconUrl || branding?.icon192Url || '/pwa-192x192.png') : (branding?.logoLightUrl || branding?.logoUrl || branding?.mobileIconUrl || branding?.icon192Url || '/pwa-192x192.png')}
            alt={branding?.name || 'Church App'}
            width={224}
            height={80}
            className={`h-full w-full object-contain dark:hidden ${!logoLoaded ? 'opacity-0' : 'opacity-100'}`}
            onLoad={() => setLogoLoaded(true)}
            onError={() => { setLogoFailed(true); setLogoLoaded(true); }}
          />
          <AppImage
            src={logoFailed ? (branding?.mobileIconUrl || branding?.icon192Url || '/pwa-192x192.png') : (branding?.logoDarkUrl || branding?.logoUrl || branding?.mobileIconUrl || branding?.icon192Url || '/pwa-192x192.png')}
            alt={branding?.name || 'Church App'}
            width={224}
            height={80}
            className={`hidden h-full w-full object-contain dark:block ${!logoLoaded ? 'opacity-0' : 'opacity-100'}`}
            onLoad={() => setLogoLoaded(true)}
            onError={() => { setLogoFailed(true); setLogoLoaded(true); }}
          />
        </div>
        <CardTitle className="text-3xl font-bold text-primary">{branding?.pwaName || branding?.name || 'Church App'}</CardTitle>
        <CardDescription>Acesse sua conta para continuar</CardDescription>
      </CardHeader>
      
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {errorMessage && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{errorMessage}</p>}
          {globalOnly ? null : lockTenant ? (
            <div className="space-y-2">
              <Label htmlFor="tenantName">Igreja</Label>
              <Input
                id="tenantName"
                value={branding?.name || churchSlug}
                readOnly
                aria-readonly="true"
                className="bg-muted/40 font-medium"
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="churchSlug">Igreja (Slug) <span className="font-normal text-muted-foreground">(deixe vazio para administrador global)</span></Label>
              <Input
                id="churchSlug"
                type="text"
                value={churchSlug}
                onChange={(e) => setChurchSlug(e.target.value.toLowerCase())}
                placeholder="ex: igreja-central"
                disabled={loading}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="exemplo@email.com"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
                disabled={loading}
                className="pr-10"
              />
              <button
                type="button"
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((visible) => !visible)}
                disabled={loading}
                className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-4">
          <Button
            type="submit"
            className="w-full"
            disabled={loading}
          >
            {loading ? "Entrando..." : "Entrar"}
          </Button>
          <div className="text-center text-xs text-muted-foreground">
            <p>{globalOnly ? 'Acesso restrito ao administrador global.' : 'O acesso da igreja é definido pelo slug desta rota.'}</p>
          </div>
          <Button asChild variant="ghost" className="w-full">
            <Link href={registerHref}>Solicitar cadastro</Link>
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
