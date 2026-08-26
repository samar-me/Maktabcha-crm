"use client";

import * as React from "react";
import {
  StudentPublicAssignmentDTO,
  StudentQuestionDTO,
  StudentResultDTO,
  StudentAttemptStatusDTO,
} from "@/types/assignment";
import {
  getPublicAssignmentInfoAction,
  loginStudentToAssignmentAction,
  getCurrentStudentQuestionAction,
  submitStudentAnswerAction,
  getStudentAttemptStatusAction,
  getStudentResultAction,
  logStudentEventAction,
  logoutStudentAssignmentAction,
} from "@/actions/student-assignment";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  GraduationCap,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Send,
  User,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Trophy,
  Loader2,
  Lock,
  ArrowRight,
  Search,
  Eye,
  EyeOff,
  Medal,
} from "lucide-react";
import { toast } from "sonner";

interface StudentAssignmentArenaProps {
  publicToken: string;
}

type ArenaStep =
  | "loading"
  | "browser_guard"
  | "welcome"
  | "select_student"
  | "enter_password"
  | "ready_start"
  | "question"
  | "answered_transition"
  | "completed";

export function StudentAssignmentArena({ publicToken }: StudentAssignmentArenaProps) {
  const [step, setStep] = React.useState<ArenaStep>("loading");
  const [assignmentInfo, setAssignmentInfo] = React.useState<StudentPublicAssignmentDTO | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  // Telegram WebApp initData
  const [initDataString, setInitDataString] = React.useState<string>("");
  const [isTelegramApp, setIsTelegramApp] = React.useState<boolean>(true);

  // Selected Student & Password
  const [selectedStudent, setSelectedStudent] = React.useState<{ studentId: string; displayName: string } | null>(null);
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [studentSearchQuery, setStudentSearchQuery] = React.useState("");
  const [loginLoading, setLoginLoading] = React.useState(false);

  // Current Attempt & Question
  const [currentQuestion, setCurrentQuestion] = React.useState<StudentQuestionDTO | null>(null);
  const [selectedOptionId, setSelectedOptionId] = React.useState<string | null>(null);
  const [confirmModalOpen, setConfirmModalOpen] = React.useState(false);
  const [submitLoading, setSubmitLoading] = React.useState(false);

  // Anti-cheat Visibility Blur Overlay
  const [isAppBlurred, setIsAppBlurred] = React.useState(false);

  // Final Results
  const [finalResult, setFinalResult] = React.useState<StudentResultDTO | null>(null);
  const [watermarkTime, setWatermarkTime] = React.useState<string>("");

  // 1. Initialize Telegram WebApp SDK and Load Public Info
  React.useEffect(() => {
    async function initArena() {
      try {
        let tgInitData = "";
        if (typeof window !== "undefined") {
          const tg = (window as any).Telegram?.WebApp;
          if (tg) {
            tg.ready();
            tg.expand();
            tgInitData = tg.initData || "";
          }
        }
        setInitDataString(tgInitData);

        const res = await getPublicAssignmentInfoAction(publicToken);
        if (!res.success || !res.data) {
          setError(res.error || "Topshiriq topilmadi");
          setStep("welcome");
          return;
        }

        setAssignmentInfo(res.data);
        setStep("welcome");
      } catch (err: any) {
        setError(err.message || "Yuklashda xatolik yuz berdi");
        setStep("welcome");
      }
    }

    initArena();
  }, [publicToken]);

  // Watermark timer
  React.useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setWatermarkTime(now.toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    };
    updateTime();
    const interval = setInterval(updateTime, 3000);
    return () => clearInterval(interval);
  }, []);

  // Anti-Cheat: Visibility Change Listener
  React.useEffect(() => {
    if (step !== "question") return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsAppBlurred(true);
        logStudentEventAction(publicToken, "visibility_hidden", { timestamp: Date.now() });
      }
    };

    const handleBlur = () => {
      setIsAppBlurred(true);
      logStudentEventAction(publicToken, "mini_app_deactivated", { timestamp: Date.now() });
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);

    // Enable Telegram closing confirmation
    if (typeof window !== "undefined") {
      const tg = (window as any).Telegram?.WebApp;
      if (tg?.enableClosingConfirmation) {
        tg.enableClosingConfirmation();
      }
    }

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
    };
  }, [step, publicToken]);

  // Fetch Current Question
  const loadCurrentQuestion = async () => {
    try {
      const res = await getCurrentStudentQuestionAction(publicToken);
      if (res.isCompleted) {
        await loadCompletedResult();
        return;
      }

      if (res.success && res.data) {
        setCurrentQuestion(res.data);
        setSelectedOptionId(null);
        setStep("question");
      } else {
        toast.error(res.error || "Savolni yuklashda xatolik");
      }
    } catch {
      toast.error("Savolni yuklashda xatolik yuz berdi");
    }
  };

  // Fetch Completed Results
  const loadCompletedResult = async () => {
    try {
      const res = await getStudentResultAction(publicToken);
      if (res.success && res.data) {
        setFinalResult(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setStep("completed");
    }
  };

  // Login handler
  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) {
      toast.error("O‘quvchini tanlang");
      return;
    }
    if (!password.trim()) {
      toast.error("Shaxsiy parolingizni kiriting");
      return;
    }

    setLoginLoading(true);
    setError(null);

    try {
      const res = await loginStudentToAssignmentAction({
        publicToken,
        studentId: selectedStudent.studentId,
        password: password.trim(),
        initData: initDataString,
      });

      if (!res.success) {
        setError(res.error || "Kirishda xatolik");
        toast.error(res.error || "Kirishda xatolik");
        return;
      }

      if (res.isCompleted) {
        await loadCompletedResult();
      } else {
        setStep("ready_start");
      }
    } catch (err: any) {
      setError("Kutilmagan xatolik yuz berdi");
    } finally {
      setLoginLoading(false);
    }
  };

  // Submit Answer handler
  const handleConfirmAnswer = async () => {
    if (!selectedOptionId) return;
    setSubmitLoading(true);
    setConfirmModalOpen(false);

    try {
      const res = await submitStudentAnswerAction(publicToken, selectedOptionId);
      if (!res.success) {
        toast.error(res.error || "Javobni tasdiqlashda xatolik");
        setSubmitLoading(false);
        return;
      }

      setStep("answered_transition");

      setTimeout(async () => {
        if (res.isCompleted) {
          await loadCompletedResult();
        } else {
          await loadCurrentQuestion();
        }
        setSubmitLoading(false);
      }, 700);
    } catch {
      toast.error("Internet bilan aloqa uzildi. Qaytadan urinib ko‘ring.");
      setSubmitLoading(false);
    }
  };

  // Loading Step
  if (step === "loading") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="w-14 h-14 rounded-3xl bg-blue-600/20 text-blue-400 flex items-center justify-center animate-pulse">
          <GraduationCap className="w-7 h-7" />
        </div>
        <p className="text-sm font-medium text-slate-300">Topshiriq yuklanmoqda...</p>
      </div>
    );
  }

  // SCREEN 1: Welcome & Rules
  if (step === "welcome") {
    if (error && !assignmentInfo) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-4">
          <div className="w-14 h-14 rounded-3xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h1 className="text-lg font-bold text-slate-100">Topshiriq topilmadi</h1>
          <p className="text-xs text-slate-400 max-w-xs">{error}</p>
        </div>
      );
    }

    return (
      <div className="flex-1 flex flex-col justify-between py-2 animate-in fade-in duration-300">
        <div className="space-y-5">
          {/* Header Branding */}
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/30">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-sm text-slate-100 block">Maktabcha</span>
              <span className="text-[11px] text-blue-400 font-medium">{assignmentInfo?.groupName}</span>
            </div>
          </div>

          {/* Assignment Banner */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2 shadow-sm">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300">
              <Sparkles className="w-3 h-3" />
              Yangi topshiriq
            </span>
            <h1 className="text-lg font-bold text-slate-100 leading-snug">
              {assignmentInfo?.title}
            </h1>
            {assignmentInfo?.description && (
              <p className="text-xs text-slate-400">{assignmentInfo.description}</p>
            )}
            <div className="pt-2 flex items-center gap-4 text-xs text-slate-400 border-t border-slate-800/80">
              <span>Savollar: <strong className="text-slate-200">{assignmentInfo?.questionCount} ta</strong></span>
              <span>•</span>
              <span>1-o‘rin bali: <strong className="text-emerald-400">{assignmentInfo?.scoringBasePoints} ball</strong></span>
            </div>
          </div>

          {/* Rules Card */}
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-3">
            <h2 className="text-xs font-bold text-slate-200 flex items-center gap-1.5 uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Topshiriq Qoidalari
            </h2>
            <ul className="space-y-2 text-xs text-slate-300">
              <li className="flex items-start gap-2">
                <span className="text-blue-400 font-bold">•</span>
                <span>Test faqat <b>bir marta</b> topshiriladi. Qayta boshlash imkonsiz.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400 font-bold">•</span>
                <span>Savollar <b>bittalab ketma-ket</b> ochiladi.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400 font-bold">•</span>
                <span>Tasdiqlash tugmasini bosguncha variantni o‘zgartirishingiz mumkin.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400 font-bold">•</span>
                <span><b>Vaqt chegarasi yo‘q.</b> To‘g‘ri javobni boshqalardan oldin tasdiqlagan o‘quvchi ko‘proq ball oladi.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400 font-bold">•</span>
                <span>Topshiriqdan chiqish yoki ilovani yashirish holatlari qayd etiladi.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Continue Button */}
        <div className="pt-4">
          <Button
            onClick={() => setStep("select_student")}
            className="w-full h-12 rounded-xl text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 gap-2"
          >
            <span>Qoidalarni tushundim</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  }

  // SCREEN 2: Select Student
  if (step === "select_student") {
    const participants = assignmentInfo?.participants || [];
    const filteredParticipants = participants.filter((p) =>
      p.displayName.toLowerCase().includes(studentSearchQuery.toLowerCase().trim())
    );

    return (
      <div className="flex-1 flex flex-col justify-between py-2 animate-in fade-in duration-300">
        <div className="space-y-4">
          <div className="space-y-1">
            <h1 className="text-lg font-bold text-slate-100">O‘zingizni tanlang</h1>
            <p className="text-xs text-slate-400">
              "{assignmentInfo?.groupName}" guruhi o‘quvchilari ro‘yxati:
            </p>
          </div>

          {participants.length > 5 && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Ismingizni qidiring..."
                value={studentSearchQuery}
                onChange={(e) => setStudentSearchQuery(e.target.value)}
                className="pl-9 h-10 bg-slate-900 border-slate-800 text-xs rounded-xl"
              />
            </div>
          )}

          <div className="space-y-2 max-h-[58vh] overflow-y-auto pr-1">
            {filteredParticipants.map((p) => (
              <button
                key={p.studentId}
                type="button"
                onClick={() => {
                  setSelectedStudent(p);
                  setStep("enter_password");
                }}
                className="w-full p-3.5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-blue-500 hover:bg-slate-800/80 transition-all flex items-center justify-between gap-3 text-left group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 font-bold text-sm flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    {p.displayName[0]}
                  </div>
                  <span className="font-bold text-sm text-slate-200 block truncate">
                    {p.displayName}
                  </span>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-blue-400 transition-colors" />
              </button>
            ))}
          </div>
        </div>

        <div className="pt-3">
          <Button
            variant="ghost"
            onClick={() => setStep("welcome")}
            className="w-full text-xs text-slate-400 hover:text-slate-200"
          >
            Orqaga qaytish
          </Button>
        </div>
      </div>
    );
  }

  // SCREEN 3: Enter Password
  if (step === "enter_password") {
    return (
      <div className="flex-1 flex flex-col justify-between py-2 animate-in fade-in duration-300">
        <form onSubmit={handleStudentLogin} className="space-y-5">
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-900 border border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-bold text-sm flex items-center justify-center shrink-0">
                {selectedStudent?.displayName[0]}
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] text-slate-400 block">Tanlangan o‘quvchi</span>
                <span className="font-bold text-sm text-slate-100 block truncate">
                  {selectedStudent?.displayName}
                </span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setStep("select_student")}
                className="text-xs text-blue-400 h-8"
              >
                O‘zgartirish
              </Button>
            </div>

            <div className="space-y-2">
              <label htmlFor="studentPassword" className="text-xs font-bold text-slate-200 block">
                Shaxsiy parolingizni kiriting
              </label>
              <div className="relative">
                <Input
                  id="studentPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="6 xonali kod yoki maxsus parol..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoFocus
                  className="h-12 bg-slate-900 border-slate-800 text-base font-mono pr-10 rounded-xl"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-slate-400">
                O‘qituvchingiz tomonidan berilgan shaxsiy kirish paroli
              </p>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}
          </div>

          <div className="pt-2 space-y-2">
            <Button
              type="submit"
              disabled={loginLoading}
              className="w-full h-12 rounded-xl text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 gap-2"
            >
              {loginLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <KeyRound className="w-4 h-4" />
              )}
              <span>Topshiriqqa kirish</span>
            </Button>

            <Button
              type="button"
              variant="ghost"
              onClick={() => setStep("select_student")}
              className="w-full text-xs text-slate-400"
            >
              Orqaga
            </Button>
          </div>
        </form>
      </div>
    );
  }

  // SCREEN 4: Ready / Start Screen
  if (step === "ready_start") {
    return (
      <div className="flex-1 flex flex-col justify-between py-2 text-center animate-in fade-in duration-300">
        <div className="my-auto space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-blue-600 text-white flex items-center justify-center mx-auto shadow-xl shadow-blue-600/40">
            <Sparkles className="w-8 h-8" />
          </div>

          <div className="space-y-1.5">
            <h1 className="text-xl font-bold text-slate-100">Tayyormisiz, {selectedStudent?.displayName}?</h1>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              Test boshlangach savollar ketma-ket chiqadi. To‘g‘ri javobni boshqalardan oldinroq tasdiqlang!
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-slate-300 space-y-1.5 max-w-xs mx-auto text-left">
            <div className="flex justify-between">
              <span className="text-slate-400">Jami savollar:</span>
              <span className="font-bold text-slate-100">{assignmentInfo?.questionCount} ta</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Vaqt chegarasi:</span>
              <span className="font-bold text-slate-100">Yo‘q</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Boshlang‘ich ball:</span>
              <span className="font-bold text-emerald-400">{assignmentInfo?.scoringBasePoints} ball</span>
            </div>
          </div>
        </div>

        <div className="pt-4">
          <Button
            onClick={loadCurrentQuestion}
            className="w-full h-12 rounded-xl text-base font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 gap-2"
          >
            <span>Testni Boshlash</span>
            <ArrowRight className="w-5 h-5" />
          </Button>
        </div>
      </div>
    );
  }

  // SCREEN 5: Question Arena
  if (step === "question" && currentQuestion) {
    const letters = ["A", "B", "C", "D", "E", "F"];
    const progressPercent = Math.round(
      (currentQuestion.position / currentQuestion.totalQuestions) * 100
    );

    return (
      <div className="relative flex-1 flex flex-col justify-between py-1 select-none animate-in fade-in duration-200">
        {/* Anti-Cheat Dynamic Watermark */}
        <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-around items-center opacity-[0.04] text-xs font-mono font-bold tracking-widest rotate-[-20deg]">
          <span>{selectedStudent?.displayName} • MAKTABCHA • {watermarkTime}</span>
          <span>{selectedStudent?.displayName} • MAKTABCHA • {watermarkTime}</span>
          <span>{selectedStudent?.displayName} • MAKTABCHA • {watermarkTime}</span>
        </div>

        {/* Visibility / Deactivation Overlay */}
        {isAppBlurred && (
          <div className="absolute inset-0 z-30 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center text-center p-6 space-y-3 animate-in fade-in">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h2 className="text-base font-bold text-slate-100">Topshiriq davom etmoqda</h2>
            <p className="text-xs text-slate-400 max-w-xs">
              Siz ilovadan vaqtincha chiqdingiz. Davom ettirish uchun tugmani bosing.
            </p>
            <Button
              onClick={() => setIsAppBlurred(false)}
              className="h-10 px-6 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs"
            >
              Davom etish
            </Button>
          </div>
        )}

        <div className="space-y-4">
          {/* Header Progress */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-blue-400">
                Savol {currentQuestion.position} / {currentQuestion.totalQuestions}
              </span>
              <span className="text-slate-400 font-mono text-[11px]">
                {progressPercent}%
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all duration-300 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Question Box */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-100 leading-snug">
              {currentQuestion.questionText}
            </h2>
          </div>

          {/* Options List */}
          <div className="space-y-2.5">
            {currentQuestion.options.map((opt, idx) => {
              const isSelected = selectedOptionId === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSelectedOptionId(opt.id)}
                  className={`w-full min-h-[52px] p-3.5 rounded-2xl border text-left flex items-center gap-3 transition-all ${
                    isSelected
                      ? "border-blue-500 bg-blue-600/20 text-white shadow-md shadow-blue-600/20 font-bold scale-[1.01]"
                      : "border-slate-800 bg-slate-900 text-slate-200 hover:border-slate-700 hover:bg-slate-850"
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-xl font-bold text-xs flex items-center justify-center shrink-0 transition-colors ${
                      isSelected
                        ? "bg-blue-600 text-white"
                        : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    {letters[idx]}
                  </div>
                  <span className="text-xs sm:text-sm flex-1 leading-normal">
                    {opt.optionText}
                  </span>
                  {isSelected && (
                    <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Bottom Confirm Action */}
        <div className="pt-4">
          <Button
            disabled={!selectedOptionId || submitLoading}
            onClick={() => setConfirmModalOpen(true)}
            className="w-full h-12 rounded-xl text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 gap-2 disabled:opacity-40"
          >
            {submitLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            <span>Javobni tasdiqlash</span>
          </Button>
        </div>

        {/* Confirmation Modal */}
        <Dialog open={confirmModalOpen} onOpenChange={setConfirmModalOpen}>
          <DialogContent className="sm:max-w-xs bg-slate-900 border-slate-800 text-slate-100">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-center">
                Javobni tasdiqlaysizmi?
              </DialogTitle>
              <DialogDescription className="text-center text-xs text-slate-400">
                Tasdiqlangandan so‘ng javobni o‘zgartirib bo‘lmaydi va keyingi savol ochiladi.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex flex-col gap-2 pt-2 sm:flex-col">
              <Button
                onClick={handleConfirmAnswer}
                disabled={submitLoading}
                className="w-full h-10 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold text-xs"
              >
                {submitLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Ha, tasdiqlayman"}
              </Button>
              <Button
                variant="ghost"
                onClick={() => setConfirmModalOpen(false)}
                disabled={submitLoading}
                className="w-full h-10 rounded-xl text-slate-400 text-xs"
              >
                Variantni o‘zgartirish
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // SCREEN 6: Short Transition
  if (step === "answered_transition") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-3 animate-in zoom-in-95 duration-200">
        <div className="w-14 h-14 rounded-3xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h2 className="text-base font-bold text-slate-100">Javob qabul qilindi!</h2>
        <p className="text-xs text-slate-400">Keyingi savol ochilmoqda...</p>
      </div>
    );
  }

  // SCREEN 7: Completed Screen
  if (step === "completed") {
    const isFinalized = finalResult?.isFinalized;

    return (
      <div className="flex-1 flex flex-col justify-between py-2 space-y-4 animate-in fade-in duration-300">
        <div className="space-y-4">
          <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-3 shadow-lg">
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto shadow-md shadow-emerald-500/20">
              <Trophy className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h1 className="text-xl font-bold text-slate-100">Topshiriq yakunlandi!</h1>
              <p className="text-xs text-slate-400">
                Barcha savollarga javoblaringiz tizim tomonidan qabul qilindi.
              </p>
            </div>

            {isFinalized && finalResult ? (
              <div className="pt-3 border-t border-slate-800 grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2 rounded-xl bg-slate-800/60">
                  <span className="text-[10px] text-slate-400 block">O‘rningiz</span>
                  <span className="font-extrabold text-base text-purple-400">
                    #{finalResult.finalRank}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-slate-800/60">
                  <span className="text-[10px] text-slate-400 block">To‘g‘ri javob</span>
                  <span className="font-extrabold text-base text-emerald-400">
                    {finalResult.correctCount}/{finalResult.totalQuestions}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-slate-800/60">
                  <span className="text-[10px] text-slate-400 block">Yakuniy ball</span>
                  <span className="font-extrabold text-base text-blue-400">
                    {finalResult.finalScore?.toLocaleString()}
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300">
                ⏳ <b>Yakuniy natijalar:</b> Barcha o‘quvchilar testni ishlab bo‘lgach, o‘rinlar va yakuniy ballar e'lon qilinadi.
              </div>
            )}
          </div>

          {/* Leaderboard if finalized */}
          {isFinalized && finalResult?.leaderboard && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider px-1">
                🏆 Guruh Natijalari
              </h3>
              <div className="space-y-1.5 max-h-[40vh] overflow-y-auto pr-1">
                {finalResult.leaderboard.map((item) => {
                  const medals = ["🥇", "🥈", "🥉"];
                  const medal = item.rank <= 3 ? medals[item.rank - 1] : `#${item.rank}`;
                  return (
                    <div
                      key={item.rank}
                      className="p-3 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="font-bold text-sm w-6 text-center">{medal}</span>
                        <span className="font-semibold text-slate-200">{item.displayName}</span>
                      </div>
                      <span className="font-mono font-bold text-blue-400">
                        {item.finalScore.toLocaleString()} ball
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="pt-2">
          <Button
            variant="outline"
            onClick={async () => {
              await logoutStudentAssignmentAction();
              window.location.reload();
            }}
            className="w-full h-11 rounded-xl text-xs font-semibold border-slate-800 text-slate-400 hover:text-slate-200"
          >
            Chiqish
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
