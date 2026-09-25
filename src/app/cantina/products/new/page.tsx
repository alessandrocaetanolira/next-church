'use client';

import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { PageShell } from '@/components/common';
import { ProductFormCreate } from '@/components/forms/ProductFormCreate';

export default function NewProductPage() {
  const router = useRouter();
  return <PageShell size="narrow"><div className="flex items-center gap-3 border-b border-border pb-4"><Button variant="ghost" size="icon" aria-label="Voltar para a cantina" onClick={() => router.back()}><ArrowLeft className="h-5 w-5" /></Button><div><h1 className="text-xl font-semibold">Novo produto</h1><p className="text-sm text-muted-foreground">Cadastre um produto para a cantina.</p></div></div><ProductFormCreate onSuccess={() => router.replace('/cantina')} /></PageShell>;
}
