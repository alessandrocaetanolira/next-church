/**
 * features/dashboard/components/SwipeableCard.tsx
 * 
 * Wrapper para cartões que permite interações de "swipe" (deslizar).
 * Usa eventos de ponteiro nativos para manter o gesto sem dependências externas.
 * 
 * @param {SwipeableCardProps} props - Propriedades do componente.
 * @returns {JSX.Element} Cartão com suporte a gestos.
 */

"use client";

import { ReactNode, useRef, useState } from 'react';
import { Check, Trash2, Edit } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Propriedades para o componente SwipeableCard.
 */
interface SwipeableCardProps {
  /** Conteúdo principal do cartão */
  children: ReactNode;
  /** Ação executada ao deslizar totalmente para a direita (Completar) */
  onComplete?: () => void;
  /** Ação executada ao clicar no botão de excluir (revelado ao deslizar para esquerda) */
  onDelete?: () => void;
  /** Ação executada ao clicar no botão de editar (revelado ao deslizar para esquerda) */
  onEdit?: () => void;
  /** Classes CSS adicionais */
  className?: string;
}

/**
 * SwipeableCard Component
 */
export function SwipeableCard({
  children,
  onComplete,
  onDelete,
  onEdit,
  className,
}: SwipeableCardProps) {
  const [isRevealed, setIsRevealed] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const pointerStart = useRef<number | null>(null);

  /**
   * Lida com o fim do gesto de arrastar.
   */
  const handleDragEnd = (offset: number) => {
    const threshold = 80;
    if (offset > threshold && onComplete) {
      onComplete();
    } else if (offset < -threshold) {
      setIsRevealed(true);
    } else {
      setIsRevealed(false);
    }
    setDragOffset(0);
  };

  return (
    <div className="relative overflow-hidden rounded-xl">
      {/* Ação Esquerda (Completar) */}
      <div className="absolute inset-y-0 left-0 flex w-20 items-center justify-center rounded-l-xl bg-success">
        <Check className="w-6 h-6 text-success-foreground" />
      </div>

      {/* Ações Direita (Editar/Excluir) */}
      <div className="absolute inset-y-0 right-0 flex items-center gap-1 pr-2">
        {onEdit && (
          <button
            onClick={() => {
              onEdit();
              setIsRevealed(false);
            }}
            className="w-12 h-12 bg-info rounded-lg flex items-center justify-center shadow-sm active:scale-95 transition-transform"
          >
            <Edit className="w-5 h-5 text-info-foreground" />
          </button>
        )}
        {onDelete && (
          <button
            onClick={() => {
              onDelete();
              setIsRevealed(false);
            }}
            className="w-12 h-12 bg-destructive rounded-lg flex items-center justify-center shadow-sm active:scale-95 transition-transform"
          >
            <Trash2 className="w-5 h-5 text-destructive-foreground" />
          </button>
        )}
      </div>

      {/* Cartão Principal (Arrastável) */}
      <div
        onPointerDown={(event) => { pointerStart.current = event.clientX; event.currentTarget.setPointerCapture(event.pointerId); }}
        onPointerMove={(event) => {
          if (pointerStart.current === null) return;
          const offset = event.clientX - pointerStart.current;
          setDragOffset(Math.max(-100, Math.min(100, offset)));
        }}
        onPointerUp={(event) => {
          if (pointerStart.current === null) return;
          handleDragEnd(event.clientX - pointerStart.current);
          pointerStart.current = null;
        }}
        style={{ transform: `translateX(${isRevealed ? -100 : dragOffset}px)` }}
        className={cn(
          'bg-card border border-border rounded-xl shadow-card cursor-grab active:cursor-grabbing relative z-10',
          'transition-transform duration-200',
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}
