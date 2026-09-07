"use client";

import { usePageTitle } from "@/features/ui/hooks/use-page-title";

export function PageTitle({ title }: { title: string }) {
  usePageTitle(title);
  return null;
}
