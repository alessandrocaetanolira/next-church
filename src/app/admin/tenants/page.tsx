'use client';

import { useState } from 'react';
import { TenantList } from '@/features/admin-tenants/components/tenant-list';
import { CreateTenantForm } from '@/features/admin-tenants/components/create-tenant-form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ShieldAlert } from 'lucide-react';
import { WebPageContainer, WebPageHeader } from '@/components/shared/web';

export default function AdminTenantsPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = () => setRefreshKey(prev => prev + 1);

  return (
    <WebPageContainer size="wide" className="space-y-4">
      <WebPageHeader title="Gerenciamento de Tenants" description="Controle de igrejas e provisionamento de bancos." actions={<CreateTenantForm onCreated={handleRefresh} />} />

      <Card className="border-destructive/20 bg-destructive/5">
        <CardHeader className="py-3 px-4 flex flex-row items-center gap-3">
          <ShieldAlert className="h-5 w-5 text-destructive" />
          <div>
            <CardTitle className="text-sm">Acesso Restrito</CardTitle>
            <CardDescription className="text-xs">Apenas administradores globais podem acessar esta área.</CardDescription>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Igrejas Cadastradas</CardTitle>
        </CardHeader>
        <CardContent>
          <TenantList key={refreshKey} />
        </CardContent>
      </Card>
    </WebPageContainer>
  );
}
