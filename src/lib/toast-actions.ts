import { toast, type ExternalToast } from 'sonner';

type RetryToastOptions = Omit<ExternalToast, 'action' | 'cancel'> & {
  label?: string;
};

/**
 * Exibe uma falha recuperável com uma ação explícita de nova tentativa.
 * O callback só é executado por interação do usuário, evitando retries
 * duplicados ou loops automáticos em operações não idempotentes.
 */
export function toastRetry(message: string, retry: () => void | Promise<void>, options?: RetryToastOptions) {
  return toast.error(message, {
    ...options,
    action: {
      label: options?.label ?? 'Tentar novamente',
      onClick: () => {
        void retry();
      },
    },
  });
}

/**
 * Exibe uma operação concluída que pode ser revertida pelo usuário.
 * O chamador deve fornecer uma reversão idempotente e atualizar sua UI.
 */
export function toastUndo(message: string, undo: () => void | Promise<void>, options?: Omit<ExternalToast, 'action' | 'cancel'>) {
  return toast.success(message, {
    ...options,
    action: {
      label: 'Desfazer',
      onClick: () => {
        void undo();
      },
    },
  });
}
