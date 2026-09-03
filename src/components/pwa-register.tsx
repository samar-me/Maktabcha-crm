"use client";

import { useEffect } from "react";
import { OfflineSyncManager } from "@/lib/offline/sync-manager";

export function PwaRegister() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          console.log("[PWA] Service Worker registered with scope:", reg.scope);
        })
        .catch((err) => {
          console.warn("[PWA] Service Worker registration failed:", err);
        });

      OfflineSyncManager.init();
    }
  }, []);

  return null;
}
