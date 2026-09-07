'use client';

import { Bell, BellRing } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useNotificationCenter } from '@/hooks/use-notification-center';

export function NotificationBell() {
  const router = useRouter();
  const { unreadCount } = useNotificationCenter();

  return (
    <Button variant="ghost" size="icon" className="relative" onClick={() => router.push('/notifications')}>
      {unreadCount > 0 ? (
        <motion.div
          animate={{ rotate: [0, -15, 15, -10, 10, 0] }}
          transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 3 }}
        >
          <BellRing className="w-5 h-5" />
        </motion.div>
      ) : (
        <Bell className="w-5 h-5" />
      )}
      {unreadCount > 0 && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-destructive text-destructive-foreground rounded-full text-[10px] font-bold flex items-center justify-center px-1"
        >
          {unreadCount > 9 ? '9+' : unreadCount}
        </motion.span>
      )}
    </Button>
  );
}
