"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function PlayRootPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if we are inside Telegram Mini App
    if (typeof window !== "undefined" && (window as any).Telegram?.WebApp) {
      const tg = (window as any).Telegram.WebApp;
      tg.ready();

      // Telegram passes startapp parameter as start_param in initDataUnsafe
      const startParam = tg.initDataUnsafe?.start_param;

      if (startParam) {
        // Redirect to the actual assignment page
        router.replace(`/play/${startParam}`);
      } else {
        setError("Topshiriq kodi topilmadi. Iltimos, Telegram guruhdagi tugmani qaytadan bosing.");
      }
    } else {
      setError("Bu sahifa faqat Telegram orqali ochilishi kerak.");
    }
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
      {error ? (
        <div className="text-center p-6 bg-red-950/30 border border-red-500/50 rounded-xl max-w-md">
          <p className="text-red-400 font-medium mb-2">Xatolik</p>
          <p className="text-red-200/80 text-sm">{error}</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <p className="text-sm">Topshiriq yuklanmoqda...</p>
        </div>
      )}
    </div>
  );
}
