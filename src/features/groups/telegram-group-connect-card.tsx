"use client";

import * as React from "react";
import {
  getGroupTelegramStatusAction,
  generateTelegramGroupConnectCodeAction,
  disconnectTelegramGroupAction,
  sendTestTelegramMessageAction,
} from "@/actions/telegram-group";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  Send,
  Link2,
  Unlink,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Loader2,
  RefreshCw,
  Bell,
} from "lucide-react";
import { formatDate } from "@/lib/formatters";
import { toast } from "sonner";

interface TelegramGroupConnectCardProps {
  groupId: string;
  groupName: string;
}

export function TelegramGroupConnectCard({ groupId, groupName }: TelegramGroupConnectCardProps) {
  const [isLinked, setIsLinked] = React.useState<boolean>(false);
  const [linkDetails, setLinkDetails] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [actionLoading, setActionLoading] = React.useState(false);

  // Connect Dialog
  const [connectDialogOpen, setConnectDialogOpen] = React.useState(false);
  const [connectCode, setConnectCode] = React.useState<string>("");
  const [botUsername, setBotUsername] = React.useState<string>("MaktabchaBot");
  const [copied, setCopied] = React.useState(false);

  // Disconnect Confirm
  const [disconnectConfirmOpen, setDisconnectConfirmOpen] = React.useState(false);

  const loadStatus = React.useCallback(async () => {
    try {
      setLoading(true);
      const res = await getGroupTelegramStatusAction(groupId);
      setIsLinked(res.isLinked);
      setLinkDetails(res.link);
    } catch {
      setIsLinked(false);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  React.useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const handleGenerateCode = async () => {
    setActionLoading(true);
    try {
      const res = await generateTelegramGroupConnectCodeAction(groupId);
      if (res.success && res.code) {
        setConnectCode(res.code);
        setBotUsername(res.botUsername || "MaktabchaBot");
        setConnectDialogOpen(true);
      } else {
        toast.error(res.error || "Ulanish kodini yaratishda xatolik");
      }
    } catch {
      toast.error("Kutilmagan xatolik");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendTestMessage = async () => {
    setActionLoading(true);
    try {
      const res = await sendTestTelegramMessageAction(groupId);
      if (res.success) {
        toast.success("Telegram guruhiga test xabari muvaffaqiyatli yuborildi");
      } else {
        toast.error(res.error || "Xabar yuborishda xatolik");
      }
    } catch {
      toast.error("Kutilmagan xatolik");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setActionLoading(true);
    try {
      const res = await disconnectTelegramGroupAction(groupId);
      if (res.success) {
        toast.success("Telegram guruhi muvaffaqiyatli uzildi");
        setDisconnectConfirmOpen(false);
        await loadStatus();
      } else {
        toast.error(res.error || "Uzishda xatolik");
      }
    } catch {
      toast.error("Kutilmagan xatolik");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCopyCommand = () => {
    const text = `/connect ${connectCode}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Buyruq nusxalandi");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <Card className="shadow-sm border-sky-100 dark:border-sky-950/60 bg-sky-50/10 dark:bg-sky-950/5">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400">
              <Send className="w-5 h-5 shrink-0" />
              <CardTitle className="text-base font-bold">Telegram Guruhi</CardTitle>
            </div>
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            ) : isLinked ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Ulangan</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Ulanmagan</span>
              </span>
            )}
          </div>
          <CardDescription className="text-xs">
            Topshiriqlarni guruhga yuborish va natijalar e'lon qilish uchun Telegram guruhini bog‘lang
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border border-border bg-card">
            <div className="text-xs space-y-0.5">
              <p className="font-semibold text-foreground">
                {isLinked && linkDetails
                  ? `Ulangan: ${linkDetails.telegram_chat_title}`
                  : "Telegram guruhi ulanmagan"}
              </p>
              <p className="text-muted-foreground">
                {isLinked && linkDetails
                  ? `Bog‘langan vaqt: ${formatDate(linkDetails.connected_at, "d-MMMM, yyyy HH:mm")}`
                  : "Guruhga yangi testlarni bitta tugma bilan yuborish uchun botni ulang."}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {isLinked ? (
                <>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleSendTestMessage}
                    disabled={actionLoading}
                    className="gap-1.5 text-xs h-9"
                  >
                    {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bell className="w-3.5 h-3.5" />}
                    <span>Test xabar</span>
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setDisconnectConfirmOpen(true)}
                    disabled={actionLoading}
                    className="text-xs h-9 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                  >
                    <Unlink className="w-3.5 h-3.5 mr-1" />
                    <span>Uzish</span>
                  </Button>
                </>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  onClick={handleGenerateCode}
                  disabled={actionLoading}
                  className="gap-1.5 text-xs h-9 bg-sky-600 hover:bg-sky-700 text-white"
                >
                  {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Link2 className="w-3.5 h-3.5" />}
                  <span>Telegram guruhini ulash</span>
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Connect Instruction Dialog */}
      <Dialog open={connectDialogOpen} onOpenChange={setConnectDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="w-12 h-12 rounded-2xl bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center mb-2 mx-auto">
              <Send className="w-6 h-6" />
            </div>
            <DialogTitle className="text-center font-bold text-lg">
              Telegram Guruhini Ulash
            </DialogTitle>
            <DialogDescription className="text-center text-xs">
              "{groupName}" guruhini ulash uchun quyidagi 2 ta oddiy qadamni bajaring:
            </DialogDescription>
          </DialogHeader>

          <div className="my-2 space-y-3 text-xs">
            <div className="p-3 rounded-xl bg-muted/60 border border-border flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                1
              </span>
              <div>
                <p className="font-semibold text-foreground">Botni Telegram guruhga qo‘shing</p>
                <p className="text-muted-foreground mt-0.5">
                  Telegram guruhga <b>@{botUsername}</b> botini admin sifatida qo‘shing.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-muted/60 border border-border flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                2
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground">Guruhga ushbu buyruqni yuboring:</p>
                <div className="mt-2 p-2.5 rounded-lg bg-background border border-border flex items-center justify-between gap-2 font-mono text-sm font-bold text-sky-600 dark:text-sky-400">
                  <span>/connect {connectCode}</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={handleCopyCommand}
                    className="h-8 px-2 text-xs gap-1"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>Nusxalash</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-sky-50 dark:bg-sky-950/30 p-2.5 border border-sky-200/60 dark:border-sky-900/40 text-[11px] text-sky-800 dark:text-sky-300 text-center">
            ⏱ Ushbu kod <b>15 daqiqa</b> davomida amal qiladi.
          </div>

          <DialogFooter>
            <Button
              type="button"
              onClick={() => {
                setConnectDialogOpen(false);
                loadStatus();
              }}
              className="w-full h-10 font-semibold"
            >
              Yubordim (Tekshirish)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disconnect Confirm Dialog */}
      <ConfirmDialog
        open={disconnectConfirmOpen}
        onOpenChange={setDisconnectConfirmOpen}
        title="Telegram guruhini uzishni tasdiqlaysizmi?"
        description="Guruh uzilgandan so‘ng yangi topshiriqlar Telegramga avtomatik yuborilmaydi. Istalgan vaqtda qayta ulashingiz mumkin."
        confirmText="Ha, uzilsin"
        cancelText="Bekor qilish"
        variant="destructive"
        loading={actionLoading}
        onConfirm={handleDisconnect}
      />
    </>
  );
}
