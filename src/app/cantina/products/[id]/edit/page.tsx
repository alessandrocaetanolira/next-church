'use client';

import { ArrowLeft } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { Button } from '@/components/ui/button';
import { PageShell } from '@/components/common';
import { ProductFormEdit } from '@/components/forms/ProductFormEdit';
import { db } from '@/lib/db';
import { useAuth } from '@/features/auth/hooks/useAuth';

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { user } = useAuth();
  const product = useLiveQuery(() => user?.tenantId && params.id ? db.products.get(params.id) : undefined, [params.id, user?.tenantId]);
  return <PageShell size="narrow"><div className="flex items-center gap-3 border-b border-border pb-4"><Button variant="ghost" size="icon" aria-label="Voltar para a cantina" onClick={() => router.back()}><ArrowLeft className="h-5 w-5" /></Button><div><h1 className="text-xl font-semibold">Editar produto</h1><p className="text-sm text-muted-foreground">Atualize os dados do produto.</p></div></div>{product ? <ProductFormEdit product={product} onSuccess={() => router.replace('/cantina')} /> : <p className="text-sm text-muted-foreground">Carregando produto...</p>}</PageShell>;
}
