'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle2, Church, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import type { MaritalStatus } from '@/features/members/lib/member-registration';
import { registerPublicMember, getPublicChurchBranding, type PublicChurchBranding } from '@/services/auth/public-auth-api';
import { AppImage } from '@/components/shared';
import { maskPhone } from '@/lib/utils';

interface RegistrationState {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  birthDate: string;
  conversionDate: string;
  baptismDate: string;
  previousChurch: string;
  aboutMe: string;
  maritalStatus: MaritalStatus;
}

const initialState: RegistrationState = {
  name: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
  birthDate: '',
  conversionDate: '',
  baptismDate: '',
  previousChurch: '',
  aboutMe: '',
  maritalStatus: 'single',
};

export function PublicRegistrationForm() {
  const searchParams = useSearchParams();
  const churchSlug = useMemo(() => searchParams.get('igreja')?.trim() ?? '', [searchParams]);
  const loginHref = useMemo(
    () => (churchSlug ? `/auth/login?igreja=${encodeURIComponent(churchSlug)}` : '/auth/login'),
    [churchSlug],
  );
  const [form, setForm] = useState<RegistrationState>(initialState);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [branding, setBranding] = useState<PublicChurchBranding | null>(null);
  const [logoFailed, setLogoFailed] = useState(false);

  useEffect(() => {
    if (!churchSlug) {
      setBranding(null);
      return;
    }
    let active = true;
    void getPublicChurchBranding(churchSlug).then((value) => {
      if (active) {
        setBranding(value);
        setLogoFailed(false);
      }
    }).catch(() => {
      if (active) setBranding(null);
    });
    return () => { active = false; };
  }, [churchSlug]);

  const updateField = <K extends keyof RegistrationState>(key: K, value: RegistrationState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!churchSlug) {
      toast.error('Link de cadastro inválido. Informe a igreja no link.');
      return;
    }

    if (form.password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    if (form.password !== form.confirmPassword) {
      toast.error('As senhas não coincidem.');
      return;
    }

    setLoading(true);

    try {
      await registerPublicMember({
          churchSlug,
          name: form.name,
          email: form.email,
          phone: form.phone,
          password: form.password,
          birthDate: form.birthDate,
          conversionDate: form.conversionDate,
          baptismDate: form.baptismDate,
          previousChurch: form.previousChurch,
          aboutMe: form.aboutMe,
          maritalStatus: form.maritalStatus,
        });

      setSubmitted(true);
      toast.success('Cadastro enviado para aprovação.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="mx-auto w-full max-w-sm rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
        <div className="space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <CheckCircle2 className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-xl font-bold">Cadastro enviado</h2>
          <p className="text-sm text-muted-foreground">
            Seu acesso ficará disponível após aprovação do pastor ou administrador.
          </p>
          <Button asChild className="w-full">
            <Link href={loginHref}>Ir para o login</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-lg min-w-0 space-y-5">
      <div className="text-center">
        <div className="mx-auto mb-3 flex h-16 w-56 items-center justify-center">
          {branding?.logoLightUrl || branding?.logoUrl ? (
            <AppImage
              src={!logoFailed ? (branding.logoLightUrl || branding.logoUrl || '') : (branding.mobileIconUrl || branding.icon192Url || '/pwa-192x192.png')}
              alt={branding.name || 'Logo da igreja'}
              width={224}
              height={80}
              className={logoFailed ? 'h-14 w-14 rounded-xl object-contain' : 'h-full w-full object-contain'}
              onError={() => setLogoFailed(true)}
            />
          ) : (
            <AppImage
              src={branding?.mobileIconUrl || branding?.icon192Url || '/pwa-192x192.png'}
              alt={branding?.name || 'Ícone da igreja'}
              width={64}
              height={64}
              className="h-14 w-14 rounded-xl object-contain"
            />
          )}
        </div>
        <h1 className="text-xl font-bold">Cadastro de Membro</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Preencha seus dados para solicitar acesso {churchSlug ? `em ${churchSlug}` : ''}.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6">
        <section className="space-y-3 border-b border-border pb-5">
          <div className="flex items-center gap-2 text-sm font-semibold">
              <UserPlus className="h-4 w-4" />
              Dados Pessoais
          </div>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="name">Nome Completo *</Label>
              <Input id="name" required value={form.name} onChange={(event) => updateField('name', event.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email *</Label>
              <Input id="email" type="email" required value={form.email} onChange={(event) => updateField('email', event.target.value)} />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="phone">Telefone *</Label>
                <Input id="phone" type="tel" inputMode="tel" autoComplete="tel" maxLength={15} required value={form.phone} onChange={(event) => updateField('phone', maskPhone(event.target.value))} placeholder="(00) 00000-0000" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="birthDate">Nascimento</Label>
                <Input id="birthDate" type="date" value={form.birthDate} onChange={(event) => updateField('birthDate', event.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Estado Civil</Label>
              <Select value={form.maritalStatus} onValueChange={(value: MaritalStatus) => updateField('maritalStatus', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Solteiro(a)</SelectItem>
                  <SelectItem value="married">Casado(a)</SelectItem>
                  <SelectItem value="divorced">Divorciado(a)</SelectItem>
                  <SelectItem value="widowed">Viúvo(a)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="password">Senha *</Label>
                <Input id="password" type="password" required value={form.password} onChange={(event) => updateField('password', event.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword">Confirmar *</Label>
                <Input id="confirmPassword" type="password" required value={form.confirmPassword} onChange={(event) => updateField('confirmPassword', event.target.value)} />
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
              <Church className="h-4 w-4" />
              Informações de Fé
          </div>
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="conversionDate">Data de Conversão</Label>
                <Input id="conversionDate" type="date" value={form.conversionDate} onChange={(event) => updateField('conversionDate', event.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="baptismDate">Data de Batismo</Label>
                <Input id="baptismDate" type="date" value={form.baptismDate} onChange={(event) => updateField('baptismDate', event.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="previousChurch">Igreja Anterior</Label>
              <Input id="previousChurch" value={form.previousChurch} onChange={(event) => updateField('previousChurch', event.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="aboutMe">Sobre Mim</Label>
              <Textarea id="aboutMe" rows={3} value={form.aboutMe} onChange={(event) => updateField('aboutMe', event.target.value)} />
            </div>
          </div>
        </section>

        <Button type="submit" className="h-11 w-full" disabled={loading}>
          {loading ? 'Enviando...' : 'Enviar Cadastro'}
        </Button>
      </form>

      <Button asChild variant="ghost" className="w-full text-xs text-muted-foreground">
        <Link href={loginHref}>Já tenho conta, fazer login</Link>
      </Button>
    </div>
  );
}
