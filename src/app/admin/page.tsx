'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Activity, AlertTriangle, Archive, Building2, CheckCircle2, Clock3, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

type Overview = {
  total: number;
  active: number;
  inactive: number;
  provisioning: number;
  failed: number;
  archived: number;
};

const initialOverview: Overview = {
  total: 0,
  active: 0,
  inactive: 0,
  provisioning: 0,
  failed: 0,
  archived: 0,
};

export default function PlatformAdminDashboard() {
  const [overview, setOverview] = useState(initialOverview);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch('/api/admin/overview', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error('Falha ao carregar resumo');
        setOverview(await response.json());
      })
      .catch(() => setError(true));
  }, []);

  const cards = [
    { label: 'Total de igrejas', value: overview.total, icon: Building2 },
    { label: 'Ativas', value: overview.active, icon: CheckCircle2, tone: 'text-emerald-600' },
    { label: 'Em provisionamento', value: overview.provisioning, icon: Clock3, tone: 'text-amber-600' },
    { label: 'Com falha', value: overview.failed, icon: AlertTriangle, tone: 'text-red-600' },
    { label: 'Arquivadas', value: overview.archived, icon: Archive, tone: 'text-slate-500' },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">Administração da plataforma</h1>
          </div>
          <p className="text-muted-foreground text-sm mt-1">Acompanhe o estado global das igrejas e dos bancos.</p>
        </div>
        <Button asChild>
          <Link href="/admin/tenants">Gerenciar igrejas</Link>
        </Button>
      </div>

      {error && <Badge variant="destructive">Não foi possível carregar o resumo dos tenants.</Badge>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map(({ label, value, icon: Icon, tone }) => (
          <Card key={label}>
            <CardHeader className="pb-2">
              <CardDescription>{label}</CardDescription>
              <CardTitle className="flex items-center justify-between text-3xl">
                {value}
                <Icon className={`h-5 w-5 ${tone ?? 'text-primary'}`} />
              </CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5" /> Operação global</CardTitle>
          <CardDescription>O administrador global gerencia metadados e ciclo de vida dos tenants.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm text-muted-foreground md:grid-cols-3">
          <p>Provisionamento acontece antes da ativação da igreja.</p>
          <p>Tenants arquivados permanecem registrados para auditoria.</p>
          <p>Dados operacionais continuam isolados nos bancos de cada igreja.</p>
        </CardContent>
      </Card>
    </div>
  );
}
