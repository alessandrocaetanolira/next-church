'use client';

import { Bell, BellRing } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useNotificationCenter } from '@/hooks/use-notification-center';

export function NotificationBell() {
  const router = useRouter();
  const { unreadCount } = useNotificationCenter();

  return (
    <Button variant="ghost" size="icon" className="relative" onClick={() => router.push('/notifications')}>
      {unreadCount > 0 ? (
        <div
        >
          <BellRing className="w-5 h-5 animate-pulse" />
        </div>
      ) : (
        <Bell className="w-5 h-5" />
      )}
      {unreadCount > 0 && (
        <span
          className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] animate-in zoom-in bg-destructive text-destructive-foreground rounded-full text-[10px] font-bold flex items-center justify-center px-1"
        >
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </Button>
  );
}
