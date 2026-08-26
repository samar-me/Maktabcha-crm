import * as React from "react";
import Script from "next/script";

export const metadata = {
  title: "Maktabcha — Topshiriq",
  description: "Telegram Mini App orqali interaktiv test topshirish platformasi",
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: "cover",
  },
};

export default function StudentAssignmentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-[100dvh] w-full bg-slate-950 text-slate-100 flex flex-col items-center justify-start antialiased select-none overscroll-none">
      {/* Telegram WebApp official client SDK */}
      <Script
        src="https://telegram.org/js/telegram-web-app.js"
        strategy="beforeInteractive"
      />
      <main className="w-full max-w-lg mx-auto flex-1 flex flex-col p-4 sm:p-6">
        {children}
      </main>
    </div>
  );
}
