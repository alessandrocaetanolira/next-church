'use client';

import { useState } from 'react';
import { TenantList } from '@/features/admin-tenants/components/tenant-list';
import { CreateTenantForm } from '@/features/admin-tenants/components/create-tenant-form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ShieldAlert } from 'lucide-react';

export default function AdminTenantsPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = () => setRefreshKey(prev => prev + 1);

  return (
    <div className="p-4 space-y-4 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gerenciamento de Tenants</h1>
          <p className="text-muted-foreground text-sm">Controle de igrejas e provisionamento de bancos.</p>
        </div>
        <CreateTenantForm onCreated={handleRefresh} />
      </div>

      <Card className="border-red-200 bg-red-50/30 dark:bg-red-950/10">
        <CardHeader className="py-3 px-4 flex flex-row items-center gap-3">
          <ShieldAlert className="h-5 w-5 text-red-500" />
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
    </div>
  );
}
