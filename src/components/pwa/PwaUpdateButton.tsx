'use client';

import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { updatePwaWorker } from '@/services/pwa-update';

export function PwaUpdateButton() {
  const [updating, setUpdating] = useState(false);
  const update = async () => {
    if (updating) return;
    setUpdating(true);
    try {
      await updatePwaWorker();
      // O HTML novo fornece a URL Serwist do build atual. O registro continua
      // sendo único e feito pelo provider, não por um segundo mecanismo.
      window.location.reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível atualizar o app.');
      setUpdating(false);
    }
  };
  return <Button variant="ghost" className="w-full justify-start gap-3" disabled={updating} onClick={() => void update()}>
    <RefreshCw className={`h-4 w-4${updating ? ' animate-spin' : ''}`} />{updating ? 'Atualizando...' : 'Atualizar app'}
  </Button>;
}
