"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { crmStore } from "@/services/crm-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginAction } from "@/actions/auth";
import {
  Lock,
  KeyRound,
  ShieldCheck,
  ArrowRight,
  Eye,
  EyeOff,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Delete,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

export function LoginForm() {
  const router = useRouter();

  // Mode: "pin_entry" | "master_pass" | "create_pin"
  const [mode, setMode] = React.useState<"pin_entry" | "master_pass" | "create_pin">("master_pass");
  const [hasExistingPin, setHasExistingPin] = React.useState(false);

  // Master password state
  const [masterPassword, setMasterPassword] = React.useState("");
  const [showMasterPass, setShowMasterPass] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  // PIN entry state (for existing PIN login)
  const [enteredPin, setEnteredPin] = React.useState("");
  const [isShaking, setIsShaking] = React.useState(false);

  // PIN creation state (first time setup)
  const [newPin, setNewPin] = React.useState("");
  const [confirmPin, setConfirmPin] = React.useState("");
  const [pinStep, setPinStep] = React.useState<"enter_new" | "confirm_new">("enter_new");

  // Check PIN presence on mount
  React.useEffect(() => {
    const pinExists = crmStore.hasPinCode();
    setHasExistingPin(pinExists);
    if (pinExists) {
      setMode("pin_entry");
    } else {
      setMode("master_pass");
    }
  }, []);

  // Handle master password submission
  const handleMasterPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!masterPassword.trim()) {
      toast.error("Iltimos, parolni kiriting");
      return;
    }

    if (crmStore.verifyMasterPassword(masterPassword)) {
      toast.success("Asosiy parol tasdiqlandi! Endi o‘zingizga shaxsiy PIN-kod tanlang.");
      setMode("create_pin");
      setPinStep("enter_new");
      setNewPin("");
      setConfirmPin("");
    } else {
      toast.error("Asosiy parol noto‘g‘ri. Qaytadan urinib ko‘ring.");
    }
  };

  // Handle PIN input button click (Keypad or physical key)
  const handleKeypadPress = (val: string) => {
    if (mode === "pin_entry") {
      if (enteredPin.length < 4) {
        const updated = enteredPin + val;
        setEnteredPin(updated);

        // Auto verify on 4 digits immediately
        if (updated.length === 4) {
          verifyEnteredPin(updated);
        }
      }
    } else if (mode === "create_pin") {
      if (pinStep === "enter_new") {
        if (newPin.length < 4) {
          const updated = newPin + val;
          setNewPin(updated);
          if (updated.length === 4) {
            setPinStep("confirm_new");
            toast.info("PIN-kodni tasdiqlash uchun uni takroran kiriting");
          }
        }
      } else if (pinStep === "confirm_new") {
        if (confirmPin.length < 4) {
          const updated = confirmPin + val;
          setConfirmPin(updated);
          if (updated.length === 4) {
            verifyAndSaveNewPin(newPin, updated);
          }
        }
      }
    }
  };

  // Backspace press
  const handleBackspace = () => {
    if (mode === "pin_entry") {
      setEnteredPin((prev) => prev.slice(0, -1));
    } else if (mode === "create_pin") {
      if (pinStep === "enter_new") {
        setNewPin((prev) => prev.slice(0, -1));
      } else {
        setConfirmPin((prev) => prev.slice(0, -1));
      }
    }
  };

  // Clear press
  const handleClear = () => {
    if (mode === "pin_entry") {
      setEnteredPin("");
    } else if (mode === "create_pin") {
      if (pinStep === "enter_new") {
        setNewPin("");
      } else {
        setConfirmPin("");
      }
    }
  };

  // Verify PIN for login (Instant)
  const verifyEnteredPin = async (pinToTest: string) => {
    if (crmStore.verifyPinCode(pinToTest)) {
      crmStore.login();
      await loginAction();
      toast.success("Xush kelibsiz! Tizimga muvaffaqiyatli kirdingiz.");
      router.push("/dashboard");
      router.refresh();
    } else {
      setIsShaking(true);
      toast.error("Kiritilgan PIN-kod noto‘g‘ri!");
      setTimeout(() => {
        setIsShaking(false);
        setEnteredPin("");
      }, 400);
    }
  };

  // Save new PIN (Instant)
  const verifyAndSaveNewPin = async (firstPin: string, secondPin: string) => {
    if (firstPin !== secondPin) {
      setIsShaking(true);
      toast.error("PIN-kodlar bir-biriga mos kelmadi. Qaytadan kiriting.");
      setTimeout(() => {
        setIsShaking(false);
        setPinStep("enter_new");
        setNewPin("");
        setConfirmPin("");
      }, 400);
      return;
    }

    crmStore.setPinCode(firstPin);
    crmStore.login();
    await loginAction();
    toast.success("Shaxsiy PIN-kodingiz muvaffaqiyatli saqlandi!");
    router.push("/dashboard");
    router.refresh();
  };

  // Global Keyboard listener for digits
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (mode === "master_pass") return;

      if (e.key >= "0" && e.key <= "9") {
        handleKeypadPress(e.key);
      } else if (e.key === "Backspace") {
        handleBackspace();
      } else if (e.key === "Escape") {
        handleClear();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mode, enteredPin, newPin, confirmPin, pinStep]);

  return (
    <div className="space-y-6">
      {/* 1. MASTER PASSWORD FORM (First-time or Reset Mode) */}
      {mode === "master_pass" && (
        <form onSubmit={handleMasterPasswordSubmit} className="space-y-5">
          <div className="text-center space-y-1">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 mx-auto flex items-center justify-center mb-2">
              <KeyRound className="w-5 h-5" />
            </div>
            <h2 className="text-base font-bold text-foreground">
              {hasExistingPin ? "Asosiy Parol bilan Kirish" : "Dasturga Birinchi Kirish"}
            </h2>
            <p className="text-xs text-muted-foreground">
              {hasExistingPin
                ? "PIN-kodni tiklash yoki yangilash uchun asosiy parolni kiriting"
                : "Boshlang‘ich administrator parolini kiriting"}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="masterPassword" className="text-xs font-semibold">
              Asosiy Parol
            </Label>
            <div className="relative">
              <Input
                id="masterPassword"
                type={showMasterPass ? "text" : "password"}
                value={masterPassword}
                onChange={(e) => setMasterPassword(e.target.value)}
                placeholder="Maxfiy parolni kiriting..."
                className="pr-10 text-sm h-11"
                required
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowMasterPass(!showMasterPass)}
                className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
              >
                {showMasterPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <Button type="submit" disabled={loading} className="w-full h-11 gap-2 text-sm font-semibold">
            <span>{loading ? "Tekshirilmoqda..." : "Kirish va PIN-kodni o‘rnatish"}</span>
            <ArrowRight className="w-4 h-4" />
          </Button>

          {hasExistingPin && (
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setEnteredPin("");
                  setMode("pin_entry");
                }}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 font-medium"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Mavjud PIN-kod orqali kirish</span>
              </button>
            </div>
          )}
        </form>
      )}

      {/* 2. CREATE PIN CODE SCREEN */}
      {mode === "create_pin" && (
        <div className="space-y-6">
          <div className="text-center space-y-1">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center mb-2">
              <Sparkles className="w-5 h-5" />
            </div>
            <h2 className="text-base font-bold text-foreground">
              {pinStep === "enter_new" ? "Shaxsiy PIN-kod Tanlang" : "PIN-kodni Tasdiqlang"}
            </h2>
            <p className="text-xs text-muted-foreground">
              {pinStep === "enter_new"
                ? "Keyingi barcha kirishlarda faqat ushbu 4 xonali PIN-koddan foydalanasiz"
                : "Tasdiqlash uchun xuddi shu 4 xonali kodni qayta kiriting"}
            </p>
          </div>

          {/* Dots representation */}
          <div className={`flex justify-center items-center gap-4 py-2 ${isShaking ? "animate-bounce" : ""}`}>
            {[0, 1, 2, 3].map((index) => {
              const currentLength = pinStep === "enter_new" ? newPin.length : confirmPin.length;
              const isFilled = index < currentLength;
              return (
                <div
                  key={index}
                  className={`w-4 h-4 rounded-full transition-all duration-200 ${
                    isFilled
                      ? "bg-blue-600 scale-125 shadow-md shadow-blue-500/40 ring-2 ring-blue-400"
                      : "bg-muted-foreground/30 border border-border"
                  }`}
                />
              );
            })}
          </div>

          {/* Numeric Keypad */}
          <div className="grid grid-cols-3 gap-2.5 max-w-[260px] mx-auto pt-2">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => handleKeypadPress(num)}
                className="h-12 rounded-xl text-lg font-bold bg-muted/40 hover:bg-muted/80 active:scale-95 transition-all text-foreground border border-border/60 shadow-xs"
              >
                {num}
              </button>
            ))}
            <button
              type="button"
              onClick={handleClear}
              className="h-12 rounded-xl text-xs font-semibold bg-muted/20 hover:bg-muted/50 text-muted-foreground active:scale-95 transition-all flex items-center justify-center border border-border/40"
            >
              Tozalash
            </button>
            <button
              type="button"
              onClick={() => handleKeypadPress("0")}
              className="h-12 rounded-xl text-lg font-bold bg-muted/40 hover:bg-muted/80 active:scale-95 transition-all text-foreground border border-border/60 shadow-xs"
            >
              0
            </button>
            <button
              type="button"
              onClick={handleBackspace}
              className="h-12 rounded-xl text-xs font-semibold bg-muted/20 hover:bg-muted/50 text-muted-foreground active:scale-95 transition-all flex items-center justify-center border border-border/40"
            >
              <Delete className="w-5 h-5" />
            </button>
          </div>

          {pinStep === "confirm_new" && (
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setPinStep("enter_new");
                  setNewPin("");
                  setConfirmPin("");
                }}
                className="text-xs text-muted-foreground hover:text-foreground underline"
              >
                Boshidan kiritish
              </button>
            </div>
          )}
        </div>
      )}

      {/* 3. PIN CODE LOCK SCREEN (Main daily workflow) */}
      {mode === "pin_entry" && (
        <div className="space-y-6">
          <div className="text-center space-y-1">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 mx-auto flex items-center justify-center mb-2">
              <Lock className="w-5 h-5" />
            </div>
            <h2 className="text-base font-bold text-foreground">
              PIN-kodni Kiriting
            </h2>
            <p className="text-xs text-muted-foreground">
              Tizimga kirish uchun shaxsiy 4 xonali PIN-kodingizni tering
            </p>
          </div>

          {/* Dots Indicator */}
          <div className={`flex justify-center items-center gap-4 py-2 ${isShaking ? "animate-shake" : ""}`}>
            {[0, 1, 2, 3].map((index) => {
              const isFilled = index < enteredPin.length;
              return (
                <div
                  key={index}
                  className={`w-4 h-4 rounded-full transition-all duration-200 ${
                    isFilled
                      ? "bg-blue-600 scale-125 shadow-md shadow-blue-500/40 ring-2 ring-blue-400"
                      : "bg-muted-foreground/30 border border-border"
                  }`}
                />
              );
            })}
          </div>

          {/* Numeric Keypad */}
          <div className="grid grid-cols-3 gap-2.5 max-w-[260px] mx-auto pt-2">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => handleKeypadPress(num)}
                className="h-12 rounded-xl text-lg font-bold bg-muted/40 hover:bg-muted/80 active:scale-95 transition-all text-foreground border border-border/60 shadow-xs"
              >
                {num}
              </button>
            ))}
            <button
              type="button"
              onClick={handleClear}
              className="h-12 rounded-xl text-xs font-semibold bg-muted/20 hover:bg-muted/50 text-muted-foreground active:scale-95 transition-all flex items-center justify-center border border-border/40"
            >
              C
            </button>
            <button
              type="button"
              onClick={() => handleKeypadPress("0")}
              className="h-12 rounded-xl text-lg font-bold bg-muted/40 hover:bg-muted/80 active:scale-95 transition-all text-foreground border border-border/60 shadow-xs"
            >
              0
            </button>
            <button
              type="button"
              onClick={handleBackspace}
              className="h-12 rounded-xl text-xs font-semibold bg-muted/20 hover:bg-muted/50 text-muted-foreground active:scale-95 transition-all flex items-center justify-center border border-border/40"
            >
              <Delete className="w-5 h-5" />
            </button>
          </div>

          {/* Recovery / Reset via Master Password */}
          <div className="text-center pt-2 border-t border-border/60">
            <button
              type="button"
              onClick={() => {
                setMasterPassword("");
                setMode("master_pass");
              }}
              className="text-xs text-muted-foreground hover:text-blue-600 dark:hover:text-blue-400 transition-colors inline-flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Asosiy parol orqali kirish / PIN-kodni yangilash</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
