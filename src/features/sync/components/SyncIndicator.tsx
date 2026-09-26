"use client";

import { useSync } from "../hooks/use-sync";
import { Wifi, WifiOff, Loader2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export function SyncIndicator() {
  const { isOnline, isSyncing, syncIssue, conflicts, resolveConflict, triggerSync } = useSync();

  if (isSyncing) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-primary animate-pulse">
        <Loader2 className="w-3 h-3 animate-spin" />
        <span className="hidden sm:inline">Sincronizando...</span>
      </div>
    );
  }

  if (conflicts.length > 0) {
    const first = conflicts[0];
    return (
      <div className="flex items-center gap-1.5 text-xs text-warning">
        <AlertTriangle className="h-3 w-3" />
        <span>{conflicts.length} conflito(s)</span>
        <button type="button" className="underline" onClick={() => void resolveConflict(first.id!, 'server')}>Servidor</button>
        <button type="button" className="underline" onClick={() => void resolveConflict(first.id!, 'local')}>Local</button>
      </div>
    );
  }

  if (syncIssue === 'unauthorized') {
    return (
      <div className="flex items-center gap-1.5 text-xs text-destructive">
        <AlertTriangle className="h-3 w-3" />
        <span>Sessão expirada</span>
        <button type="button" className="underline" onClick={() => { window.location.href = '/auth/login'; }}>Entrar novamente</button>
      </div>
    );
  }

  if (syncIssue === 'partial') {
    return (
      <div className="flex items-center gap-1.5 text-xs text-warning">
        <AlertTriangle className="h-3 w-3" />
        <span>Sincronização parcial</span>
        <button type="button" className="underline" onClick={() => void triggerSync()}>Tentar novamente</button>
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
