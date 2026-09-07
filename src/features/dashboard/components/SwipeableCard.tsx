/**
 * features/dashboard/components/SwipeableCard.tsx
 * 
 * Wrapper para cartões que permite interações de "swipe" (deslizar).
 * Utiliza framer-motion para animações fluidas.
 * 
 * @param {SwipeableCardProps} props - Propriedades do componente.
 * @returns {JSX.Element} Cartão com suporte a gestos.
 */

"use client";

import { ReactNode, useState } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
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
  const x = useMotionValue(0);
  
  // Transformações para opacidade dos botões de fundo
  const leftOpacity = useTransform(x, [0, 80], [0, 1]);
  const rightOpacity = useTransform(x, [-80, 0], [1, 0]);

  /**
   * Lida com o fim do gesto de arrastar.
   */
  const handleDragEnd = (_: any, info: PanInfo) => {
    const threshold = 80;
    if (info.offset.x > threshold && onComplete) {
      onComplete();
    } else if (info.offset.x < -threshold) {
      setIsRevealed(true);
    } else {
      setIsRevealed(false);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-xl">
      {/* Ação Esquerda (Completar) */}
      <motion.div
        style={{ opacity: leftOpacity }}
        className="absolute inset-y-0 left-0 w-20 bg-success flex items-center justify-center rounded-l-xl"
      >
        <Check className="w-6 h-6 text-success-foreground" />
      </motion.div>

      {/* Ações Direita (Editar/Excluir) */}
      <motion.div
        style={{ opacity: rightOpacity }}
        className="absolute inset-y-0 right-0 flex items-center gap-1 pr-2"
      >
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
      </motion.div>

      {/* Cartão Principal (Arrastável) */}
      <motion.div
        drag="x"
        dragConstraints={{ left: -100, right: 100 }}
        dragElastic={0.1}
        style={{ x }}
        onDragEnd={handleDragEnd}
        animate={{ x: isRevealed ? -100 : 0 }}
        className={cn(
          'bg-card border border-border rounded-xl shadow-card cursor-grab active:cursor-grabbing relative z-10',
          className
        )}
      >
        {children}
      </motion.div>
    </div>
  );
}
