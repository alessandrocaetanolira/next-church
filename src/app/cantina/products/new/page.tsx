'use client';

import { useRouter } from 'next/navigation';
import { PageShell } from '@/components/common';
import { ProductFormCreate } from '@/components/forms/ProductFormCreate';

export default function NewProductPage() {
  const router = useRouter();
  return <PageShell size="narrow"><div className="border-b border-border pb-4"><div><h1 className="text-xl font-semibold">Novo produto</h1><p className="text-sm text-muted-foreground">Cadastre um produto para a cantina.</p></div></div><ProductFormCreate onSuccess={() => router.replace('/cantina')} /></PageShell>;
}
