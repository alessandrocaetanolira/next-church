"use client";

import { useSync } from "../hooks/use-sync";
import { Wifi, WifiOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function SyncIndicator() {
  const { isOnline, isSyncing } = useSync();

  if (isSyncing) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-primary animate-pulse">
        <Loader2 className="w-3 h-3 animate-spin" />
        <span className="hidden sm:inline">Sincronizando...</span>
      </div>
    );
  }

  return (
    <div className={cn(
      "flex items-center gap-1.5 text-xs",
      isOnline ? "text-green-500" : "text-destructive"
    )}>
      {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
      <span className="hidden sm:inline">{isOnline ? "Online" : "Offline"}</span>
    </div>
  );
}
