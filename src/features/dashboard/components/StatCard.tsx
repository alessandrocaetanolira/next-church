/**
 * features/dashboard/components/StatCard.tsx
 * 
 * Componente de cartão de estatística (Metric Card).
 * Exibe um título, um valor principal, um ícone e opcionalmente uma tendência.
 * 
 * @param {StatCardProps} props - Propriedades do componente.
 * @returns {JSX.Element} Cartão de Estatística estilizado.
 */

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Propriedades para o componente StatCard.
 */
interface StatCardProps {
  /** Título da métrica (ex: "Vendas Hoje") */
  title: string;
  /** Valor principal a ser exibido */
  value: string | number;
  /** Ícone (Lucide ou ReactNode) */
  icon: ReactNode;
  /** Tendência opcional (porcentagem de crescimento/queda) */
  trend?: { 
    /** Valor da porcentagem (ex: 12.5) */
    value: number; 
    /** Se a tendência é positiva (verde) ou negativa (vermelha) */
    isPositive: boolean 
  };
  /** Variante de cor para o ícone e fundo */
  variant?: 'primary' | 'success' | 'warning' | 'info';
  /** Classes CSS adicionais */
  className?: string;
}

/** Configuração de variantes de cor baseadas no Design System */
const variants = {
  primary: 'bg-primary-light text-primary',
  success: 'bg-success-light text-success',
  warning: 'bg-warning-light text-warning',
  info: 'bg-info-light text-info',
};

/**
 * StatCard Component
 */
export function StatCard({
  title,
  value,
  icon,
  trend,
  variant = 'primary',
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        'animate__animated animate__zoomIn bg-card rounded-xl border border-border p-3 shadow-card transition-all duration-200 hover:shadow-card-hover sm:p-4',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-muted-foreground font-medium">{title}</p>
          <p className="text-2xl font-bold mt-1 text-foreground">{value}</p>
          {trend && (
            <p
              className={cn(
                'text-xs font-medium mt-1',
                trend.isPositive ? 'text-success' : 'text-destructive'
              )}
            >
              {trend.isPositive ? '+' : '-'}{Math.abs(trend.value)}%
            </p>
          )}
        </div>
        <div
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl sm:h-12 sm:w-12',
            variants[variant]
          )}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}
