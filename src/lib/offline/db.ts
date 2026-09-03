"use client";

const DB_NAME = "MaktabchaOfflineDB";
const DB_VERSION = 1;

export interface OfflineSyncItem {
  id: string;
  action: "save_attendance" | "update_student" | "save_grade";
  payload: any;
  createdAt: string;
  status: "pending" | "syncing" | "failed";
  retryCount: number;
}

export class OfflineDB {
  private static dbPromise: Promise<IDBDatabase> | null = null;

  public static getDB(): Promise<IDBDatabase> {
    if (typeof window === "undefined") {
      return Promise.reject(new Error("IndexedDB is only available in browser"));
    }

    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
          const db = (event.target as IDBOpenDBRequest).result;

          if (!db.objectStoreNames.contains("students")) {
            db.createObjectStore("students", { keyPath: "id" });
          }
          if (!db.objectStoreNames.contains("groups")) {
            db.createObjectStore("groups", { keyPath: "id" });
          }
          if (!db.objectStoreNames.contains("lessons")) {
            db.createObjectStore("lessons", { keyPath: "id" });
          }
          if (!db.objectStoreNames.contains("attendance")) {
            db.createObjectStore("attendance", { keyPath: "id" });
          }
          if (!db.objectStoreNames.contains("sync_queue")) {
            db.createObjectStore("sync_queue", { keyPath: "id" });
          }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }

    return this.dbPromise;
  }

  // Generic Save / Put Items into store
  public static async putItems<T>(storeName: string, items: T[]): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, "readwrite");
      const store = tx.objectStore(storeName);

      items.forEach((item) => store.put(item));

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // Generic Get All Items
  public static async getAllItems<T>(storeName: string): Promise<T[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, "readonly");
      const store = tx.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  // Queue an action for background sync
  public static async enqueueSyncAction(action: OfflineSyncItem["action"], payload: any): Promise<OfflineSyncItem> {
    const db = await this.getDB();
    const item: OfflineSyncItem = {
      id: `sync-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      action,
      payload,
      createdAt: new Date().toISOString(),
      status: "pending",
      retryCount: 0,
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction("sync_queue", "readwrite");
      const store = tx.objectStore("sync_queue");
      const req = store.put(item);

      req.onsuccess = () => resolve(item);
      req.onerror = () => reject(req.error);
    });
  }

  // Get all pending sync items
  public static async getPendingSyncQueue(): Promise<OfflineSyncItem[]> {
    return this.getAllItems<OfflineSyncItem>("sync_queue");
  }

  // Remove synced item from queue
  public static async removeSyncItem(id: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("sync_queue", "readwrite");
      const store = tx.objectStore("sync_queue");
      const req = store.delete(id);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }
}
