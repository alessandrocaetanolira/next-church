'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Activity, AlertTriangle, Archive, Building2, CheckCircle2, Clock3, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getPlatformOverview, type PlatformOverview } from '@/services/admin/tenants-api';
import { WebPageContainer, WebPageHeader } from '@/components/shared/web';

type Overview = PlatformOverview;

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
    getPlatformOverview()
      .then(setOverview)
      .catch(() => setError(true));
  }, []);

  const cards = [
    { label: 'Total de igrejas', value: overview.total, icon: Building2 },
    { label: 'Ativas', value: overview.active, icon: CheckCircle2, tone: 'text-success' },
    { label: 'Em provisionamento', value: overview.provisioning, icon: Clock3, tone: 'text-warning' },
    { label: 'Com falha', value: overview.failed, icon: AlertTriangle, tone: 'text-destructive' },
    { label: 'Arquivadas', value: overview.archived, icon: Archive, tone: 'text-slate-500' },
  ];

  return (
    <WebPageContainer size="wide" className="space-y-6">
      <WebPageHeader
        title="Administração da plataforma"
        description="Acompanhe o estado global das igrejas e dos bancos."
        icon={<ShieldCheck className="h-6 w-6 text-primary" />}
        actions={<Button asChild><Link href="/admin/tenants">Gerenciar igrejas</Link></Button>}
      />

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
    </WebPageContainer>
  );
}
