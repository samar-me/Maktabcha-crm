"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function PlayRootPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // We add a small timeout to ensure Telegram script has loaded
    const checkTelegram = () => {
      if (typeof window !== "undefined" && (window as any).Telegram?.WebApp) {
        const tg = (window as any).Telegram.WebApp;
        tg.ready();

        const startParam = tg.initDataUnsafe?.start_param;

        if (startParam) {
          router.replace(`/play/${startParam}`);
        } else {
          setError("Topshiriq kodi topilmadi. Iltimos, Telegram guruhdagi tugmani qaytadan bosing.");
        }
      } else {
        setError("Bu sahifa faqat Telegram orqali ochilishi kerak. Yoki Internet tezligingiz past bo'lishi mumkin. Qayta urinib ko'ring.");
      }
    };

    const timer = setTimeout(checkTelegram, 500); // 500ms delay to wait for external script
    return () => clearTimeout(timer);
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
