"use client";

import * as React from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { getSettings, updateSettings } from "@/services/settings";
import { clearAllDemoDataAction } from "@/actions/settings";
import { getTelegramBotSettingsAction } from "@/actions/telegram-group";
import {
  getPersonalAuthStatusAction,
  changePinAction,
  resetPinAction,
  verifyMasterPasswordAction,
} from "@/actions/personal-auth";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  Building2,
  Save,
  Sparkles,
  Moon,
  Sun,
  Monitor,
  CheckCircle2,
  Lock,
  KeyRound,
  RotateCcw,
  Trash2,
  Loader2,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import { ReferralSettingsCard } from "@/features/referrals/referral-settings-card";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [loading, setLoading] = React.useState(false);
  const [fetching, setFetching] = React.useState(true);

  const [settings, setSettings] = React.useState({
    centerName: "Maktabcha O‘quv Markazi",
    adminName: "Bosh Administrator",
    phone: "+998 90 123 45 67",
    address: "Toshkent shahar, Chilonzor tumani",
    defaultCurrency: "UZS",
    defaultMonthlyFee: "350000",
  });

  // Security / PIN state
  const [hasPin, setHasPin] = React.useState(false);
  const [isChangingPin, setIsChangingPin] = React.useState(false);
  const [isResettingPin, setIsResettingPin] = React.useState(false);
  const [masterPassInput, setMasterPassInput] = React.useState("");
  const [newPinCode, setNewPinCode] = React.useState("");
  const [confirmNewPinCode, setConfirmNewPinCode] = React.useState("");
  const [pinLoading, setPinLoading] = React.useState(false);

  // Telegram Bot Settings state
  const [botSettings, setBotSettings] = React.useState<{
    isConfigured: boolean;
    botUsername: string | null;
    hasWebhookSecret: boolean;
    connectedGroupsCount: number;
  }>({
    isConfigured: false,
    botUsername: null,
    hasWebhookSecret: false,
    connectedGroupsCount: 0,
  });

  // Clear all demo/test data state
  const [clearDataConfirmOpen, setClearDataConfirmOpen] = React.useState(false);
  const [clearDataLoading, setClearDataLoading] = React.useState(false);

  const handleClearAllData = async () => {
    setClearDataLoading(true);
    try {
      const res = await clearAllDemoDataAction();
      if (res.success) {
        toast.success("Barcha test ma'lumotlar (o‘quvchilar, guruhlar, to‘lovlar, davomat) tozalandi!");
        setClearDataConfirmOpen(false);
      } else {
        toast.error(res.error || "Ma'lumotlarni tozalashda xatolik");
      }
    } catch {
      toast.error("Kutilmagan xatolik yuz berdi");
    } finally {
      setClearDataLoading(false);
    }
  };

  React.useEffect(() => {
    async function load() {
      try {
        setFetching(true);
        const [settingsData, authStatus, botData] = await Promise.all([
          getSettings(),
          getPersonalAuthStatusAction(),
          getTelegramBotSettingsAction(),
        ]);
        setSettings({
          centerName: settingsData.center_name,
          adminName: settingsData.admin_name,
          phone: settingsData.phone || "",
          address: settingsData.address || "",
          defaultCurrency: settingsData.default_currency,
          defaultMonthlyFee: String(settingsData.default_monthly_fee),
        });
        setHasPin(authStatus.configured);
        setBotSettings(botData);
      } catch {
        toast.error("Sozlamalarni yuklashda xatolik");
      } finally {
        setFetching(false);
      }
    }
    load();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateSettings({
        center_name: settings.centerName,
        admin_name: settings.adminName,
        phone: settings.phone || null,
        address: settings.address || null,
        default_currency: settings.defaultCurrency,
        default_monthly_fee: Number(settings.defaultMonthlyFee) || 350000,
      });
      toast.success("Sozlamalar muvaffaqiyatli saqlandi!");
    } catch {
      toast.error("Sozlamalarni saqlashda xatolik");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!masterPassInput.trim()) {
      toast.error("Iltimos, tasdiqlash uchun asosiy parolni kiriting");
      return;
    }

    if (newPinCode.length !== 4 || isNaN(Number(newPinCode))) {
      toast.error("PIN-kod aniq 4 ta raqamdan iborat bo‘lishi kerak");
      return;
    }

    if (newPinCode !== confirmNewPinCode) {
      toast.error("Yangi PIN-kodlar bir-biriga mos kelmadi");
      return;
    }

    setPinLoading(true);
    try {
      const res = await changePinAction(masterPassInput, newPinCode);
      if (!res.success) {
        toast.error(res.error || "Asosiy parol noto‘g‘ri yoki xatolik yuz berdi");
        return;
      }

      setHasPin(true);
      setIsChangingPin(false);
      setMasterPassInput("");
      setNewPinCode("");
      setConfirmNewPinCode("");
      toast.success("Yangi shaxsiy PIN-kodingiz saqlandi!");
    } catch {
      toast.error("PIN-kodni yangilashda xatolik yuz berdi");
    } finally {
      setPinLoading(false);
    }
  };

  const handleResetPinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!masterPassInput.trim()) {
      toast.error("Iltimos, asosiy parolni kiriting");
      return;
    }

    setPinLoading(true);
    try {
      const res = await resetPinAction(masterPassInput);
      if (!res.success) {
        toast.error(res.error || "Asosiy parol noto‘g‘ri");
        return;
      }

      setHasPin(false);
      setIsResettingPin(false);
      setMasterPassInput("");
      toast.info("PIN-kod bekor qilindi. Endi kirishda asosiy parol so‘raladi.");
    } catch {
      toast.error("PIN-kodni o‘chirishda xatolik yuz berdi");
    } finally {
      setPinLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title="Sozlamalar & Xavfsizlik"
        description="O‘quv markazi ma'lumotlari, shaxsiy PIN-kod va tizim parametrlarini boshqarish"
      />

      {/* Security & PIN-code Section */}
      <Card className="shadow-sm border-blue-200 dark:border-blue-900/60 bg-blue-50/20 dark:bg-blue-950/10">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
              <Lock className="w-5 h-5 shrink-0" />
              <CardTitle className="text-base font-bold">Xavfsizlik & PIN-kod Boshqaruvi</CardTitle>
            </div>
            {hasPin ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 w-fit">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>PIN-kod faollashtirilgan</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 w-fit">
                <KeyRound className="w-3.5 h-3.5" />
                <span>Asosiy parol rejimida</span>
              </span>
            )}
          </div>
          <CardDescription className="text-xs">
            Dasturga kirishda so‘raladigan 4 xonali shaxsiy PIN-kod yoki asosiy parolni boshqaring
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isChangingPin && !isResettingPin ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-border bg-card">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {hasPin ? "Shaxsiy 4 xonali PIN-kod o‘rnatilgan" : "Hozircha PIN-kod o‘rnatilmagan"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {hasPin
                    ? "Dasturga kirishda faqat ushbu PIN-koddan foydalaniladi (barcha qurilmalarda bir xil)"
                    : "Dasturga kirishda asosiy maxfiy parol so‘raladi"}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {hasPin && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setMasterPassInput("");
                      setIsResettingPin(true);
                    }}
                    className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50 h-9"
                  >
                    <RotateCcw className="w-3.5 h-3.5 mr-1" />
                    <span>PIN-kodni bekor qilish</span>
                  </Button>
                )}
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    setMasterPassInput("");
                    setNewPinCode("");
                    setConfirmNewPinCode("");
                    setIsChangingPin(true);
                  }}
                  className="text-xs gap-1.5 h-9"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>{hasPin ? "PIN-kodni o‘zgartirish" : "Yangi PIN-kod o‘rnatish"}</span>
                </Button>
              </div>
            </div>
          ) : isResettingPin ? (
            <form onSubmit={handleResetPinSubmit} className="space-y-4 p-4 rounded-xl border border-border bg-card">
              <h4 className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                PIN-kodni bekor qilish uchun asosiy parolni kiriting
              </h4>
              <div className="max-w-xs space-y-1.5">
                <Label htmlFor="resetMasterPass" className="text-xs">
                  Asosiy Parol
                </Label>
                <Input
                  id="resetMasterPass"
                  type="password"
                  value={masterPassInput}
                  onChange={(e) => setMasterPassInput(e.target.value)}
                  placeholder="Asosiy parolni kiriting..."
                  required
                  className="text-base sm:text-xs h-10 sm:h-9"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsResettingPin(false)}
                  disabled={pinLoading}
                  className="text-xs h-9"
                >
                  Bekor qilish
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  variant="destructive"
                  disabled={pinLoading}
                  className="text-xs gap-1 h-9"
                >
                  {pinLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>Bekor qilishni tasdiqlash</span>
                </Button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleUpdatePin} className="space-y-4 p-4 rounded-xl border border-border bg-card">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Yangi PIN-kod o‘rnatish formasi
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="masterPassInput" className="text-xs">
                    Asosiy parol
                  </Label>
                  <Input
                    id="masterPassInput"
                    type="password"
                    value={masterPassInput}
                    onChange={(e) => setMasterPassInput(e.target.value)}
                    placeholder="Asosiy parolni kiriting"
                    required
                    className="text-base sm:text-xs h-10 sm:h-9"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="newPinCode" className="text-xs">
                    Yangi 4 xonali PIN-kod
                  </Label>
                  <Input
                    id="newPinCode"
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={newPinCode}
                    onChange={(e) => setNewPinCode(e.target.value)}
                    placeholder="Masalan: 1234"
                    required
                    className="text-base sm:text-xs h-10 sm:h-9 font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirmNewPinCode" className="text-xs">
                    PIN-kodni takrorlang
                  </Label>
                  <Input
                    id="confirmNewPinCode"
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={confirmNewPinCode}
                    onChange={(e) => setConfirmNewPinCode(e.target.value)}
                    placeholder="Qayta kiriting"
                    required
                    className="text-base sm:text-xs h-10 sm:h-9 font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsChangingPin(false)}
                  disabled={pinLoading}
                  className="text-xs h-9"
                >
                  Bekor qilish
                </Button>
                <Button type="submit" size="sm" disabled={pinLoading} className="text-xs gap-1 h-9">
                  {pinLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  )}
                  <span>Saqlash</span>
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Center Information */}
        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
              <Building2 className="w-5 h-5" />
              <CardTitle className="text-base font-bold">O‘quv Markaz Ma'lumotlari</CardTitle>
            </div>
            <CardDescription className="text-xs">
              Tizim hisobotlarida va kvitansiyalarda ko‘rinadigan asosiy rekvizitlar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {fetching ? (
              <div className="p-6 flex items-center justify-center gap-2 text-muted-foreground text-xs">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                <span>Sozlamalar yuklanmoqda...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="centerName">O‘quv markaz nomi</Label>
                  <Input
                    id="centerName"
                    value={settings.centerName}
                    onChange={(e) => setSettings({ ...settings, centerName: e.target.value })}
                    placeholder="Masalan: Bilim Maktabi"
                    required
                    className="text-base sm:text-sm h-10 sm:h-9"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="adminName">Bosh administrator ismi</Label>
                  <Input
                    id="adminName"
                    value={settings.adminName}
                    onChange={(e) => setSettings({ ...settings, adminName: e.target.value })}
                    placeholder="Ism va familiya"
                    required
                    className="text-base sm:text-sm h-10 sm:h-9"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Aloqa telefoni</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={settings.phone}
                    onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                    placeholder="+998 90 123 45 67"
                    className="text-base sm:text-sm h-10 sm:h-9"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Manzil</Label>
                  <Input
                    id="address"
                    value={settings.address}
                    onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                    placeholder="Shahar, tuman, ko‘cha"
                    className="text-base sm:text-sm h-10 sm:h-9"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Financial & Currency Preferences */}
        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <Sparkles className="w-5 h-5" />
              <CardTitle className="text-base font-bold">Moliyaviy Sozlamalar</CardTitle>
            </div>
            <CardDescription className="text-xs">
              Standart to‘lov miqdori va asosiy hisob-kitob valyutasi
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="defaultCurrency">Asosiy valyuta</Label>
                <Input
                  id="defaultCurrency"
                  value="UZS (O‘zbekiston so‘mi)"
                  disabled
                  className="bg-muted font-medium text-xs h-10 sm:h-9"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="defaultMonthlyFee">Standart oylik to‘lov (so‘m)</Label>
                <Input
                  id="defaultMonthlyFee"
                  type="number"
                  inputMode="numeric"
                  value={settings.defaultMonthlyFee}
                  onChange={(e) => setSettings({ ...settings, defaultMonthlyFee: e.target.value })}
                  placeholder="350000"
                  required
                  className="text-base sm:text-sm h-10 sm:h-9"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Telegram Bot & Mini App Integration Status */}
        <Card className="shadow-sm border-sky-100 dark:border-sky-950/60 bg-sky-50/10 dark:bg-sky-950/5">
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400">
                <Send className="w-5 h-5" />
                <CardTitle className="text-base font-bold">Telegram Bot & Mini App Integratsiyasi</CardTitle>
              </div>
              {botSettings.isConfigured ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Faol</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
                  <span>Token sozlanmagan</span>
                </span>
              )}
            </div>
            <CardDescription className="text-xs">
              Topshiriqlarni guruhlarga yuborish va o‘quvchilar test platformasi holati
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-card border border-border space-y-0.5">
                <span className="text-muted-foreground block text-[11px]">Bot Foydalanuvchi nomi</span>
                <span className="font-bold text-foreground font-mono">
                  {botSettings.botUsername ? `@${botSettings.botUsername}` : "Sozlanmagan"}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-card border border-border space-y-0.5">
                <span className="text-muted-foreground block text-[11px]">Webhook & WebApp xavfsizligi</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {botSettings.hasWebhookSecret ? "HMAC-SHA256 Faol" : "Standart"}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-card border border-border space-y-0.5">
                <span className="text-muted-foreground block text-[11px]">Ulangan Telegram guruhlar</span>
                <span className="font-bold text-sky-600 dark:text-sky-400">
                  {botSettings.connectedGroupsCount} ta guruh
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Theme Preferences */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold">Tizim Mavzusi</CardTitle>
            <CardDescription className="text-xs">
              Ko‘zingizga qulay bo‘lgan interfeys ko‘rinishini tanlang
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setTheme("light")}
                className={`flex flex-col items-center justify-center p-3 sm:p-4 rounded-xl border-2 transition-all min-h-[44px] ${
                  theme === "light"
                    ? "border-blue-600 bg-blue-50/50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 shadow-sm"
                    : "border-border hover:bg-muted/50 text-muted-foreground"
                }`}
              >
                <Sun className="w-5 h-5 sm:w-6 sm:h-6 mb-1 sm:mb-2" />
                <span className="text-xs font-semibold">Yorug‘</span>
              </button>

              <button
                type="button"
                onClick={() => setTheme("dark")}
                className={`flex flex-col items-center justify-center p-3 sm:p-4 rounded-xl border-2 transition-all min-h-[44px] ${
                  theme === "dark"
                    ? "border-blue-600 bg-blue-50/50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 shadow-sm"
                    : "border-border hover:bg-muted/50 text-muted-foreground"
                }`}
              >
                <Moon className="w-5 h-5 sm:w-6 sm:h-6 mb-1 sm:mb-2" />
                <span className="text-xs font-semibold">Tungi</span>
              </button>

              <button
                type="button"
                onClick={() => setTheme("system")}
                className={`flex flex-col items-center justify-center p-3 sm:p-4 rounded-xl border-2 transition-all min-h-[44px] ${
                  theme === "system"
                    ? "border-blue-600 bg-blue-50/50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 shadow-sm"
                    : "border-border hover:bg-muted/50 text-muted-foreground"
                }`}
              >
                <Monitor className="w-5 h-5 sm:w-6 sm:h-6 mb-1 sm:mb-2" />
                <span className="text-xs font-semibold">Avtomatik</span>
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Submit Action */}
        <div className="flex justify-end gap-3 pt-2">
          <Button type="submit" disabled={loading} className="gap-2 h-11 sm:h-9 text-sm font-semibold w-full sm:w-auto">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{loading ? "Saqlanmoqda..." : "Sozlamalarni saqlash"}</span>
          </Button>
        </div>
      </form>

      <ReferralSettingsCard />

      {/* Danger Zone: Clear Demo / Test Data */}
      <Card className="shadow-sm border-rose-200 dark:border-rose-900/60 bg-rose-50/20 dark:bg-rose-950/10">
        <CardHeader>
          <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
            <Trash2 className="w-5 h-5 shrink-0" />
            <CardTitle className="text-base font-bold">Ma'lumotlar Bazasini Tozalash</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Barcha dastlabki test/soxta ma'lumotlarni (o‘quvchilar, guruhlar, to‘lovlar, davomat) bir martada to‘liq o‘chirish
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-rose-200 dark:border-rose-900/40 bg-card">
            <div>
              <p className="text-sm font-semibold text-foreground">
                Hamma test ma'lumotlarini tozalash
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Barcha soxta o‘quvchilar, guruhlar va to‘lovlar bazadan butunlay o‘chiriladi. PIN-kod va tizim sozlamalari saqlanib qoladi.
              </p>
            </div>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => setClearDataConfirmOpen(true)}
              className="text-xs gap-1.5 h-9 shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Barcha test ma'lumotlarini o‘chirish</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Clear Data Confirmation Dialog */}
      <ConfirmDialog
        open={clearDataConfirmOpen}
        onOpenChange={setClearDataConfirmOpen}
        title="Barcha test ma'lumotlarini o‘chirishni tasdiqlaysizmi?"
        description="Diqqat! Barcha o‘quvchilar, guruhlar, to‘lovlar, davomat va baholar bazadan butunlay o‘chiriladi. Ushbu amalni ortga qaytarib bo‘lmaydi. Haqiqiy o‘quvchilaringizni noldan kiritish uchun bazani bo‘shatishni xohlaysizmi?"
        confirmText="Ha, hammasini tozalash"
        cancelText="Bekor qilish"
        variant="destructive"
        loading={clearDataLoading}
        onConfirm={handleClearAllData}
      />
    </div>
  );
}
