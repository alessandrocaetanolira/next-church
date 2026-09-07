'use client';

import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Copy, QrCode, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { getAppBaseUrl } from '@/lib/app-base-url';

interface RegistrationShareCardProps {
  tenantSlug: string;
}

export function RegistrationShareCard({ tenantSlug }: RegistrationShareCardProps) {
  const registrationLink = useMemo(() => {
    const baseUrl = getAppBaseUrl();
    if (!baseUrl) return `/cadastro?igreja=${tenantSlug}`;
    return `${baseUrl}/cadastro?igreja=${tenantSlug}`;
  }, [tenantSlug]);

  const loginLink = useMemo(() => {
    const baseUrl = getAppBaseUrl();
    if (!baseUrl) return `/auth/login?igreja=${tenantSlug}`;
    return `${baseUrl}/auth/login?igreja=${tenantSlug}`;
  }, [tenantSlug]);

  const registrationQrCodeUrl = useMemo(() => {
    const encodedLink = encodeURIComponent(registrationLink);
    return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodedLink}`;
  }, [registrationLink]);

  const loginQrCodeUrl = useMemo(() => {
    const encodedLink = encodeURIComponent(loginLink);
    return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodedLink}`;
  }, [loginLink]);

  const handleCopy = async (value: string, label: string) => {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} copiado.`);
  };

  const handleShare = async (value: string, title: string, text: string) => {
    if (navigator.share) {
      await navigator.share({
        title,
        text,
        url: value,
      });
      return;
    }

    await handleCopy(value, `Link de ${title.toLowerCase()}`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="h-5 w-5" />
          Cadastro da Igreja
        </CardTitle>
        <CardDescription>Compartilhe o link ou o QR Code para novos membros.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">Slug: {tenantSlug}</Badge>
        </div>

        <Tabs defaultValue="register" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="register">Cadastro</TabsTrigger>
            <TabsTrigger value="login">Login</TabsTrigger>
          </TabsList>

          <TabsContent value="register" className="space-y-3 rounded-xl border p-3">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">Cadastro</Badge>
              <Badge variant="outline">/cadastro?igreja={tenantSlug}</Badge>
            </div>
            <div className="rounded-xl border bg-card p-3">
              <img
                src={registrationQrCodeUrl}
                alt={`QR Code do cadastro da igreja ${tenantSlug}`}
                className="mx-auto h-56 w-56 rounded-lg"
              />
            </div>
            <div className="rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground break-all">
              {registrationLink}
            </div>
            <div className="flex gap-2">
              <Button onClick={() => void handleCopy(registrationLink, 'Link de cadastro')} variant="outline" className="flex-1">
                <Copy className="mr-2 h-4 w-4" />
                Copiar
              </Button>
              <Button onClick={() => void handleShare(registrationLink, 'Cadastro da Igreja', 'Use este link para solicitar cadastro.')} className="flex-1">
                <Share2 className="mr-2 h-4 w-4" />
                Compartilhar
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="login" className="space-y-3 rounded-xl border p-3">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">Login</Badge>
              <Badge variant="outline">/auth/login?igreja={tenantSlug}</Badge>
            </div>
            <div className="rounded-xl border bg-card p-3">
              <img
                src={loginQrCodeUrl}
                alt={`QR Code do login da igreja ${tenantSlug}`}
                className="mx-auto h-56 w-56 rounded-lg"
              />
            </div>
            <div className="rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground break-all">
              {loginLink}
            </div>
            <div className="flex gap-2">
              <Button onClick={() => void handleCopy(loginLink, 'Link de login')} variant="outline" className="flex-1">
                <Copy className="mr-2 h-4 w-4" />
                Copiar
              </Button>
              <Button onClick={() => void handleShare(loginLink, 'Login da Igreja', 'Use este link para acessar a área de login da sua igreja.')} className="flex-1">
                <Share2 className="mr-2 h-4 w-4" />
                Compartilhar
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
