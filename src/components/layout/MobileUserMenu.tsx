'use client';

import { useRouter } from 'next/navigation';
import { Info, LogOut, UserRound, Wallet } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { DrawerTitle } from '@/components/ui/drawer';
import { useDrawer } from '@/components/providers/DrawerProvider';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { getAccessibleModules } from '@/lib/access-control';
import { PwaUpdateButton } from '@/components/pwa/PwaUpdateButton';

export function MobileUserMenu({ onAbout, onLogout }: { onAbout: () => void; onLogout: () => void }) {
  const { user } = useAuth();
  const { closeDrawer } = useDrawer();
  const router = useRouter();
  const initials = user?.name.split(' ').map((part) => part[0]).join('').toUpperCase().slice(0, 2) || 'U';
  const action = (callback: () => void) => { closeDrawer(); callback(); };
  return <div className="space-y-2 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-6">
    <DrawerTitle className="sr-only">Minha conta</DrawerTitle>
    <div className="flex items-center gap-3 rounded-xl bg-muted/40 p-3 dark:bg-muted/30">
      <Avatar className="h-10 w-10"><AvatarImage src={user?.image ?? undefined} alt={user?.name || 'Usuário'} /><AvatarFallback className="bg-primary/10 text-sm font-medium text-primary">{initials}</AvatarFallback></Avatar>
      <div className="min-w-0"><p className="truncate text-sm font-medium">{user?.name}</p><p className="truncate text-xs text-muted-foreground">{user?.email}</p></div>
    </div>
    {getAccessibleModules(user).has('wallet') ? <Button variant="ghost" className="w-full justify-start gap-3" onClick={() => action(() => router.push('/carteira'))}><Wallet className="h-4 w-4" />Carteira</Button> : null}
    <Button variant="ghost" className="w-full justify-start gap-3" onClick={() => action(() => router.push('/minha-conta/perfil'))}><UserRound className="h-4 w-4" />Meu perfil</Button>
    <Button variant="ghost" className="w-full justify-start gap-3" onClick={() => action(onAbout)}><Info className="h-4 w-4" />Sobre</Button>
    <PwaUpdateButton />
    <Button variant="ghost" className="w-full justify-start gap-3 text-destructive" onClick={() => action(onLogout)}><LogOut className="h-4 w-4" />Sair</Button>
  </div>;
}
