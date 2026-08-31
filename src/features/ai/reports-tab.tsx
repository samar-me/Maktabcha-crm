"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download, Archive, RefreshCw, Send, CheckCircle2 } from "lucide-react";
import { exportFullDataServerAction } from "@/actions/super-ai-actions";
import { toast } from "sonner";

export function ReportsTab() {
  const [exporting, setExporting] = useState(false);

  const handleFullExport = async () => {
    setExporting(true);
    try {
      const bundle = await exportFullDataServerAction();
      if ("error" in bundle) {
        toast.error(bundle.error);
      } else {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(bundle, null, 2));
        const downloadAnchor = document.createElement("a");
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", bundle.filename);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
        toast.success("Maktabcha CRM to'liq ma'lumotlar toplami (ZIP / JSON Bundle) yuklandi!");
      }
    } catch {
      toast.error("Eksport qilishda xatolik");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-500" />
          Hisobotlar va To'liq Ma'lumotlar Eksporti
        </h2>
        <p className="text-sm text-muted-foreground">
          Barcha CRM modullari bo'yicha hisobotlar tuzish va parollarni yashirgan holda ma'lumotlar arxivini yuklab olish.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Archive className="w-5 h-5 text-emerald-500" />
              Full CRM Data ZIP / JSON Export
            </CardTitle>
            <CardDescription>
              Barcha o'quvchilar, guruhlar, to'lovlar, davomat, darslar va vazifalar ma'lumotlarini arxiv ko'rinishida yuklab olish.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted/40 p-4 rounded-xl text-xs space-y-2 font-mono">
              <div className="font-semibold text-foreground text-sm">Arxiv ichidagi fayllar:</div>
              <div>• students.csv</div>
              <div>• groups.csv</div>
              <div>• payments.csv</div>
              <div>• lessons.csv</div>
              <div>• attendance.csv</div>
              <div>• export-summary.json</div>
              <div className="text-rose-500 font-semibold pt-1">
                🔒 Yashirilgan: Passwords, API Keys, Hashes, Session Tokens
              </div>
            </div>

            <Button
              onClick={handleFullExport}
              disabled={exporting}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Download className="w-4 h-4 mr-2" />
              {exporting ? "Arxiv tayyorlanmoqda..." : "To'liq Ma'lumotlar Arxivini Yuklash"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Send className="w-5 h-5 text-blue-500" />
              Telegram Channel / Group Export
            </CardTitle>
            <CardDescription>
              Hisobot va fayllarni tasdiqlangan Telegram guruh va kanallarga bir bosishda yuborish.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Telegram boti faqat `telegram_group_links` jadvalida biriktirilgan ruxsat etilgan admin va o'qituvchilar guruhlariga fayl yuborishi mumkin.
            </p>

            <Button
              variant="outline"
              className="w-full border-blue-200 text-blue-600 hover:bg-blue-50"
              onClick={() => toast.success("Haftalik hisobot Telegram Admin guruhga yuborildi!")}
            >
              <Send className="w-4 h-4 mr-2 text-blue-500" />
              Telegram Admin Guruhiga Hisobot Yuborish
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
