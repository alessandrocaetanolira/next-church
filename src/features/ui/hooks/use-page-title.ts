"use client";

import { useEffect } from 'react';
import { useUIStore } from '@/features/ui/store';

export function usePageTitle(title: string) {
  const setPageTitle = useUIStore((state) => state.setPageTitle);

  useEffect(() => {
    setPageTitle(title);
    return () => setPageTitle('');
  }, [title, setPageTitle]);
}
