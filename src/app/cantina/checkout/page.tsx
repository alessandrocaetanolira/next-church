'use client';

import { useEffect } from 'react';
import { useUIStore } from '@/features/ui/store';
import { CanteenCheckout } from '@/features/canteen/components/CanteenCheckout';

export default function CanteenCheckoutPage() {
  const setPageTitle = useUIStore((state) => state.setPageTitle);

  useEffect(() => {
    setPageTitle('Finalizar venda');
  }, [setPageTitle]);

  return <CanteenCheckout />;
}
