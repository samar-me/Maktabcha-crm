"use client";

import { OfflineDB, OfflineSyncItem } from "./db";
import { saveBatchAttendanceAction } from "@/actions/attendance";
import { toast } from "sonner";

export class OfflineSyncManager {
  private static isSyncing = false;
  private static listeners: ((isOnline: boolean, pendingCount: number) => void)[] = [];

  public static subscribe(listener: (isOnline: boolean, pendingCount: number) => void) {
    this.listeners.push(listener);
    this.notify();
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  public static async notify() {
    if (typeof window === "undefined") return;
    const isOnline = navigator.onLine;
    try {
      const pending = await OfflineDB.getPendingSyncQueue();
      this.listeners.forEach((l) => l(isOnline, pending.length));
    } catch {
      this.listeners.forEach((l) => l(isOnline, 0));
    }
  }

  public static async processSyncQueue(): Promise<{ synced: number; failed: number }> {
    if (typeof window === "undefined" || !navigator.onLine || this.isSyncing) {
      return { synced: 0, failed: 0 };
    }

    this.isSyncing = true;
    let synced = 0;
    let failed = 0;

    try {
      const queue = await OfflineDB.getPendingSyncQueue();
      if (queue.length === 0) {
        this.isSyncing = false;
        this.notify();
        return { synced: 0, failed: 0 };
      }

      for (const item of queue) {
        try {
          if (item.action === "save_attendance") {
            const result = await saveBatchAttendanceAction(item.payload);
            if (result.success) {
              await OfflineDB.removeSyncItem(item.id);
              synced++;
            } else {
              failed++;
            }
          }
        } catch {
          failed++;
        }
      }

      if (synced > 0) {
        toast.success(`Internet ulandi: ${synced} ta oflayn ma'lumot muvaffaqiyatli sinxronlandi!`);
      }
    } finally {
      this.isSyncing = false;
      this.notify();
    }

    return { synced, failed };
  }

  public static init() {
    if (typeof window === "undefined") return;

    window.addEventListener("online", () => {
      toast.info("Internet aloqasi tiklandi. Sinxronizatsiya boshlanmoqda...");
      this.processSyncQueue();
    });

    window.addEventListener("offline", () => {
      toast.warning("Internet uzildi. Maktabcha CRM Oflayn rejimga o'tdi.");
      this.notify();
    });

    // Check initial queue
    this.processSyncQueue();
  }
}
