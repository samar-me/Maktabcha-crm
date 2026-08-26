"use client";

import * as React from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { crmStore } from "@/services/crm-store";
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
  Shield,
} from "lucide-react";
import { toast } from "sonner";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [loading, setLoading] = React.useState(false);

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
  const [oldMasterPass, setOldMasterPass] = React.useState("");
  const [newPinCode, setNewPinCode] = React.useState("");
  const [confirmNewPinCode, setConfirmNewPinCode] = React.useState("");

  React.useEffect(() => {
    setHasPin(crmStore.hasPinCode());
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast.success("Sozlamalar muvaffaqiyatli saqlandi!");
    }, 400);
  };

  const handleUpdatePin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldMasterPass.trim()) {
      toast.error("Iltimos, tasdiqlash uchun asosiy parolni (@Samar18) kiriting");
      return;
    }

    if (!crmStore.verifyMasterPassword(oldMasterPass)) {
      toast.error("Asosiy parol noto‘g‘ri kiritildi");
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

    crmStore.setPinCode(newPinCode);
    setHasPin(true);
    setIsChangingPin(false);
    setOldMasterPass("");
    setNewPinCode("");
    setConfirmNewPinCode("");
    toast.success("Yangi shaxsiy PIN-kodingiz muvaffaqiyatli saqlandi!");
  };

  const handleResetPin = () => {
    crmStore.resetPinCode();
    setHasPin(false);
    setIsChangingPin(false);
    toast.info("PIN-kod bekor qilindi. Endi kirishda yana asosiy parol (@Samar18) so‘raladi.");
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
              <Lock className="w-5 h-5" />
              <CardTitle className="text-base font-bold">Xavfsizlik & PIN-kod Boshqaruvi</CardTitle>
            </div>
            {hasPin ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>PIN-kod faollashtirilgan</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
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
          {!isChangingPin ? (
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl border border-border bg-card">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {hasPin ? "Shaxsiy 4 xonali PIN-kod o‘rnatilgan" : "Hozircha PIN-kod o‘rnatilmagan"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {hasPin
                    ? "Dasturga kirishda faqat ushbu PIN-koddan foydalaniladi"
                    : "Dasturga kirishda asosiy parol (@Samar18) so‘raladi"}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {hasPin && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleResetPin}
                    className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50"
                  >
                    <RotateCcw className="w-3.5 h-3.5 mr-1" />
                    <span>PIN-kodni bekor qilish</span>
                  </Button>
                )}
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setIsChangingPin(true)}
                  className="text-xs gap-1.5"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>{hasPin ? "PIN-kodni o‘zgartirish" : "Yangi PIN-kod o‘rnatish"}</span>
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleUpdatePin} className="space-y-4 p-4 rounded-xl border border-border bg-card">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Yangi PIN-kod o‘rnatish formasi
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="oldMasterPass" className="text-xs">
                    Asosiy parol
                  </Label>
                  <Input
                    id="oldMasterPass"
                    type="password"
                    value={oldMasterPass}
                    onChange={(e) => setOldMasterPass(e.target.value)}
                    placeholder="Asosiy parolni kiriting"
                    required
                    className="text-xs h-9"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="newPinCode" className="text-xs">
                    Yangi 4 xonali PIN-kod
                  </Label>
                  <Input
                    id="newPinCode"
                    type="password"
                    maxLength={4}
                    value={newPinCode}
                    onChange={(e) => setNewPinCode(e.target.value)}
                    placeholder="Masalan: 1234"
                    required
                    className="text-xs h-9 font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirmNewPinCode" className="text-xs">
                    PIN-kodni takrorlang
                  </Label>
                  <Input
                    id="confirmNewPinCode"
                    type="password"
                    maxLength={4}
                    value={confirmNewPinCode}
                    onChange={(e) => setConfirmNewPinCode(e.target.value)}
                    placeholder="Qayta kiriting"
                    required
                    className="text-xs h-9 font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsChangingPin(false)}
                  className="text-xs"
                >
                  Bekor qilish
                </Button>
                <Button type="submit" size="sm" className="text-xs gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="centerName">O‘quv markaz nomi</Label>
                <Input
                  id="centerName"
                  value={settings.centerName}
                  onChange={(e) => setSettings({ ...settings, centerName: e.target.value })}
                  placeholder="Masalan: Bilim Maktabi"
                  required
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
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Aloqa telefoni</Label>
                <Input
                  id="phone"
                  value={settings.phone}
                  onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                  placeholder="+998 90 123 45 67"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Manzil</Label>
                <Input
                  id="address"
                  value={settings.address}
                  onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                  placeholder="Shahar, tuman, ko‘cha"
                />
              </div>
            </div>
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
                  className="bg-muted font-medium text-xs"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="defaultMonthlyFee">Standart oylik to‘lov (so‘m)</Label>
                <Input
                  id="defaultMonthlyFee"
                  type="number"
                  value={settings.defaultMonthlyFee}
                  onChange={(e) => setSettings({ ...settings, defaultMonthlyFee: e.target.value })}
                  placeholder="350000"
                  required
                />
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
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setTheme("light")}
                className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
                  theme === "light"
                    ? "border-blue-600 bg-blue-50/50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 shadow-sm"
                    : "border-border hover:bg-muted/50 text-muted-foreground"
                }`}
              >
                <Sun className="w-6 h-6 mb-2" />
                <span className="text-xs font-semibold">Yorug‘</span>
              </button>

              <button
                type="button"
                onClick={() => setTheme("dark")}
                className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
                  theme === "dark"
                    ? "border-blue-600 bg-blue-50/50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 shadow-sm"
                    : "border-border hover:bg-muted/50 text-muted-foreground"
                }`}
              >
                <Moon className="w-6 h-6 mb-2" />
                <span className="text-xs font-semibold">Tungi</span>
              </button>

              <button
                type="button"
                onClick={() => setTheme("system")}
                className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
                  theme === "system"
                    ? "border-blue-600 bg-blue-50/50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 shadow-sm"
                    : "border-border hover:bg-muted/50 text-muted-foreground"
                }`}
              >
                <Monitor className="w-6 h-6 mb-2" />
                <span className="text-xs font-semibold">Avtomatik</span>
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Submit Action */}
        <div className="flex justify-end gap-3 pt-2">
          <Button type="submit" disabled={loading} className="gap-2">
            <Save className="w-4 h-4" />
            <span>{loading ? "Saqlanmoqda..." : "Sozlamalarni saqlash"}</span>
          </Button>
        </div>
      </form>
    </div>
  );
}
