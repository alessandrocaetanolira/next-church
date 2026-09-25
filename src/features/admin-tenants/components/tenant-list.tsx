'use client';

import { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, ShieldCheck, Trash2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { getAppBaseUrl } from '@/lib/app-base-url';
import Link from 'next/link';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { listAdminTenants, updateAdminTenantStatus, type AdminTenant } from '@/services/admin/tenants-api';

type Tenant = AdminTenant;

export function TenantList() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const appBaseUrl = getAppBaseUrl();

  const fetchTenants = async () => {
    try {
      const data = await listAdminTenants();
      setTenants(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error('Erro ao carregar lista de igrejas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, []);

  const toggleStatus = async (tenant: Tenant) => {
    try {
      await updateAdminTenantStatus(tenant.id, !tenant.active);
      toast.success('Status atualizado!');
      await fetchTenants();
    } catch (error) {
      toast.error('Erro ao atualizar status');
    }
  };

  if (loading) return <div className="p-8 text-center">Carregando igrejas...</div>;

  return (
    <>
    <div className="overflow-x-auto rounded-md border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Igreja</TableHead>
            <TableHead>Slug</TableHead>
            <TableHead>Plano</TableHead>
            <TableHead>Usuários</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[80px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tenants.map((tenant) => (
            <TableRow key={tenant.id} className="cursor-pointer" onClick={() => setSelectedTenant(tenant)}>
              <TableCell className="font-medium">{tenant.name}</TableCell>
              <TableCell className="text-muted-foreground">{tenant.slug}</TableCell>
              <TableCell>
                <Badge variant={tenant.plan === 'PREMIUM' ? 'default' : 'outline'}>
                  {tenant.plan}
                </Badge>
              </TableCell>
              <TableCell>{tenant._count?.users || 0}</TableCell>
              <TableCell>
                <Badge variant={tenant.active ? 'success' as any : 'destructive'}>
                  {tenant.active ? 'Ativa' : 'Inativa'}
                </Badge>
              </TableCell>
              <TableCell>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(event) => event.stopPropagation()}>
                    <Button variant="ghost" className="h-8 w-8 p-0" aria-label={`Ações de ${tenant.name}`}>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Ações</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => setSelectedTenant(tenant)}>
                      <ExternalLink className="mr-2 h-4 w-4" /> Ver detalhes
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        const targetUrl = appBaseUrl ? `${appBaseUrl}/auth/login?igreja=${tenant.slug}` : `/auth/login?igreja=${tenant.slug}`;
                        window.location.assign(targetUrl);
                      }}
                    >
                      <ExternalLink className="mr-2 h-4 w-4" /> Abrir login da igreja
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => toggleStatus(tenant)}>
                      <ShieldCheck className="mr-2 h-4 w-4" /> 
                      {tenant.active ? 'Desativar' : 'Ativar'}
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive">
                      <Trash2 className="mr-2 h-4 w-4" /> Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
          {tenants.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center">
                Nenhuma igreja cadastrada.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
    <Sheet open={Boolean(selectedTenant)} onOpenChange={(open) => { if (!open) setSelectedTenant(null); }}>
      <SheetContent side="bottom" className="max-h-[85vh] rounded-t-2xl">
        {selectedTenant && (
          <SheetHeader className="text-left">
            <SheetTitle>{selectedTenant.name}</SheetTitle>
            <SheetDescription>Detalhes da igreja e do tenant</SheetDescription>
            <div className="space-y-4 pt-4">
              <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                <div><span className="text-muted-foreground">Slug</span><p className="font-medium">{selectedTenant.slug}</p></div>
                <div><span className="text-muted-foreground">Database key</span><p className="font-medium">{selectedTenant.databaseKey ?? '—'}</p></div>
                <div><span className="text-muted-foreground">Status</span><p className="font-medium">{selectedTenant.status ?? (selectedTenant.active ? 'ACTIVE' : 'INACTIVE')}</p></div>
                <div><span className="text-muted-foreground">Criada em</span><p className="font-medium">{new Date(selectedTenant.createdAt).toLocaleDateString('pt-BR')}</p></div>
                <div><span className="text-muted-foreground">Usuários</span><p className="font-medium">{selectedTenant._count?.users ?? 0}</p></div>
              </div>
              <Button asChild className="w-full"><Link href={`/admin/tenants/${selectedTenant.id}`}>Abrir detalhes completos</Link></Button>
            </div>
          </SheetHeader>
        )}
      </SheetContent>
    </Sheet>
    </>
  );
}
