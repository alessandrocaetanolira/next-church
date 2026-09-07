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

interface Tenant {
  id: string;
  slug: string;
  name: string;
  plan: string;
  active: boolean;
  createdAt: string;
  _count?: { users: number };
}

export function TenantList() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const appBaseUrl = getAppBaseUrl();

  const fetchTenants = async () => {
    try {
      const res = await fetch('/api/admin/tenants');
      if (!res.ok) throw new Error('Falha ao carregar tenants');
      const data = await res.ok ? await res.json() : [];
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
      const res = await fetch(`/api/admin/tenants/${tenant.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ active: !tenant.active }),
      });
      if (res.ok) {
        toast.success('Status atualizado!');
        fetchTenants();
      }
    } catch (error) {
      toast.error('Erro ao atualizar status');
    }
  };

  if (loading) return <div className="p-8 text-center">Carregando igrejas...</div>;

  return (
    <div className="rounded-md border">
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
            <TableRow key={tenant.id}>
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
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Ações</DropdownMenuLabel>
                    <DropdownMenuItem
                      onClick={() => {
                        const targetUrl = appBaseUrl ? `${appBaseUrl}/cadastro?igreja=${tenant.slug}` : `/cadastro?igreja=${tenant.slug}`;
                        window.open(targetUrl, '_blank');
                      }}
                    >
                      <ExternalLink className="mr-2 h-4 w-4" /> Acessar
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
  );
}
