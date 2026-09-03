"use client";

import { useEffect, useState } from "react";
import { Wifi, WifiOff, RefreshCw, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { OfflineSyncManager } from "@/lib/offline/sync-manager";

export function OfflineSyncIndicator() {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsOnline(navigator.onLine);
      const unsubscribe = OfflineSyncManager.subscribe((online, count) => {
        setIsOnline(online);
        setPendingCount(count);
      });

      return () => unsubscribe();
    }
  }, []);

  const handleManualSync = async () => {
    setIsSyncing(true);
    await OfflineSyncManager.processSyncQueue();
    setIsSyncing(false);
  };

  // If online and no pending items, return clean minimal pill or null
  if (isOnline && pendingCount === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 bg-background/95 backdrop-blur-md border shadow-lg rounded-full px-4 py-2 transition-all">
      {!isOnline ? (
        <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-300 flex items-center gap-1.5 py-1 px-2.5">
          <WifiOff className="w-3.5 h-3.5 animate-pulse" />
          <span>Oflayn Rejim</span>
        </Badge>
      ) : (
        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-300 flex items-center gap-1.5 py-1 px-2.5">
          <Wifi className="w-3.5 h-3.5" />
          <span>Onlayn</span>
        </Badge>
      )}

      {pendingCount > 0 && (
        <span className="text-xs font-medium text-muted-foreground">
          {pendingCount} ta saqlangan amal
        </span>
      )}

      {isOnline && pendingCount > 0 && (
        <Button
          size="sm"
          variant="default"
          onClick={handleManualSync}
          disabled={isSyncing}
          className="h-7 text-xs px-2.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white"
        >
          <RefreshCw className={`w-3 h-3 mr-1 ${isSyncing ? "animate-spin" : ""}`} />
          Sinxronlash
        </Button>
      )}
    </div>
  );
}
