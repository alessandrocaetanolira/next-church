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
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import type { ThemeVariant } from "@/components/providers/AppSettingsProvider";

/**
 * LoginForm Component
 * 
 * Gerencia o estado dos campos de login e lida com a autenticação via NextAuth.
 */
export function LoginForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [churchSlug, setChurchSlug] = useState(searchParams.get('igreja')?.trim().toLowerCase() ?? "");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [branding, setBranding] = useState<{
    name: string;
    logoUrl?: string | null;
    themeVariant?: ThemeVariant;
  } | null>(null);
  const registerHref = churchSlug ? `/cadastro?igreja=${encodeURIComponent(churchSlug)}` : '/cadastro';

  useEffect(() => {
    const nextSlug = searchParams.get('igreja')?.trim().toLowerCase() ?? '';
    if (nextSlug) {
      setChurchSlug(nextSlug);
    }
  }, [searchParams]);

  useEffect(() => {
    const normalized = churchSlug.trim().toLowerCase();
    if (!normalized) {
      setBranding(null);
      return;
    }

    const timeout = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/public/church-branding?igreja=${encodeURIComponent(normalized)}`, {
          cache: 'no-store',
        });

        if (!response.ok) {
          setBranding(null);
          return;
        }

        const payload = await response.json();
        setBranding({
          name: payload.name,
          logoUrl: payload.logoUrl ?? null,
          themeVariant: payload.themeVariant ?? 'default',
        });
      } catch {
        setBranding(null);
      }
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [churchSlug]);

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

    try {
      const result = await signIn("credentials", {
        email,
        password,
        churchSlug,
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
        window.location.href = "/";
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
        {branding?.logoUrl ? (
          <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-border bg-muted/30 p-2">
            <img src={branding.logoUrl} alt={branding.name} className="h-full w-full object-contain" />
          </div>
        ) : null}
        <CardTitle className="text-3xl font-bold text-primary">{branding?.name || 'Church App'}</CardTitle>
        <CardDescription>Acesse sua conta para continuar</CardDescription>
      </CardHeader>
      
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {errorMessage && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{errorMessage}</p>}
          <div className="space-y-2">
            <Label htmlFor="churchSlug">Igreja (Slug)</Label>
            <Input
              id="churchSlug"
              type="text"
              required
              value={churchSlug}
              onChange={(e) => setChurchSlug(e.target.value.toLowerCase())}
              placeholder="ex: igreja-central"
              disabled={loading}
            />
          </div>

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
            <Input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••"
              disabled={loading}
            />
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
            <p>Dica: Use a senha padrão 123456 para testes</p>
          </div>
          <Button asChild variant="ghost" className="w-full">
            <Link href={registerHref}>Solicitar cadastro</Link>
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
