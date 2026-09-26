import type { ReactNode } from 'react';
import { WebPageContainer } from '@/components/shared/web';
import { WebPageHeader } from './WebPageHeader';
import { cn } from '@/lib/utils';

interface WebPageLayoutProps {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** Layout exclusivo das páginas do template web. */
export function WebPageLayout({ title, description, actions, children, className }: WebPageLayoutProps) {
  return (
    <WebPageContainer size="wide" className={cn('space-y-6', className)}>
      {title ? <WebPageHeader title={title} description={description} actions={actions} /> : null}
      {children}
    </WebPageContainer>
  );
}
