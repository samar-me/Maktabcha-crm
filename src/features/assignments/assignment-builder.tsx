"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Group, Student } from "@/types/database";
import { QuestionDraft, QuestionOptionDraft } from "@/types/assignment";
import { createAssignmentAction, updateAssignmentAction, publishAssignmentAction } from "@/actions/assignments";
import { getStudentsByGroupId } from "@/services/groups";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  ArrowLeft,
  Plus,
  Trash2,
  CheckCircle2,
  Circle,
  Sparkles,
  Send,
  Eye,
  Save,
  Loader2,
  AlertCircle,
  HelpCircle,
  MoveUp,
  MoveDown,
  Users,
  ShieldCheck,
  Trophy,
} from "lucide-react";
import { toast } from "sonner";

interface AssignmentBuilderProps {
  groups: Group[];
  initialData?: {
    id: string;
    groupId: string;
    title: string;
    description: string | null;
    scoringBasePoints: number;
    scoringRankStep: number;
    scoringMinPoints: number;
    antiCheatMode: boolean;
    questions: QuestionDraft[];
  };
}

export function AssignmentBuilder({ groups, initialData }: AssignmentBuilderProps) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);

  // Form State
  const [title, setTitle] = React.useState(initialData?.title || "");
  const [description, setDescription] = React.useState(initialData?.description || "");
  const [groupId, setGroupId] = React.useState(initialData?.groupId || (groups[0]?.id || ""));
  const [scoringBasePoints, setScoringBasePoints] = React.useState(initialData?.scoringBasePoints || 1000);
  const [scoringRankStep, setScoringRankStep] = React.useState(initialData?.scoringRankStep || 100);
  const [scoringMinPoints, setScoringMinPoints] = React.useState(initialData?.scoringMinPoints || 100);
  const [antiCheatMode, setAntiCheatMode] = React.useState(initialData?.antiCheatMode ?? true);

  // Questions State
  const [questions, setQuestions] = React.useState<QuestionDraft[]>(
    initialData?.questions || [
      {
        position: 1,
        questionText: "",
        options: [
          { optionText: "", isCorrect: true },
          { optionText: "", isCorrect: false },
          { optionText: "", isCorrect: false },
          { optionText: "", isCorrect: false },
        ],
      },
    ]
  );

  // Group Students Preview
  const [groupStudents, setGroupStudents] = React.useState<Student[]>([]);
  const [loadingStudents, setLoadingStudents] = React.useState(false);

  React.useEffect(() => {
    if (!groupId) return;
    async function loadGroupStudents() {
      try {
        setLoadingStudents(true);
        const stList = await getStudentsByGroupId(groupId);
        setGroupStudents(stList);
      } catch {
        setGroupStudents([]);
      } finally {
        setLoadingStudents(false);
      }
    }
    loadGroupStudents();
  }, [groupId]);

  // Question manipulation helpers
  const handleAddQuestion = () => {
    setQuestions([
      ...questions,
      {
        position: questions.length + 1,
        questionText: "",
        options: [
          { optionText: "", isCorrect: true },
          { optionText: "", isCorrect: false },
          { optionText: "", isCorrect: false },
          { optionText: "", isCorrect: false },
        ],
      },
    ]);
  };

  const handleRemoveQuestion = (index: number) => {
    if (questions.length <= 1) {
      toast.error("Topshiriqda kamida 1 ta savol bo‘lishi kerak");
      return;
    }
    const updated = questions.filter((_, i) => i !== index);
    // Re-index positions
    setQuestions(updated.map((q, i) => ({ ...q, position: i + 1 })));
  };

  const handleMoveQuestion = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= questions.length) return;

    const copy = [...questions];
    const temp = copy[index];
    copy[index] = copy[targetIndex];
    copy[targetIndex] = temp;

    setQuestions(copy.map((q, i) => ({ ...q, position: i + 1 })));
  };

  const handleQuestionTextChange = (index: number, text: string) => {
    const updated = [...questions];
    updated[index].questionText = text;
    setQuestions(updated);
  };

  const handleOptionTextChange = (qIndex: number, optIndex: number, text: string) => {
    const updated = [...questions];
    updated[qIndex].options[optIndex].optionText = text;
    setQuestions(updated);
  };

  const handleSetCorrectOption = (qIndex: number, optIndex: number) => {
    const updated = [...questions];
    updated[qIndex].options = updated[qIndex].options.map((opt, i) => ({
      ...opt,
      isCorrect: i === optIndex,
    }));
    setQuestions(updated);
  };

  const handleAddOption = (qIndex: number) => {
    const currentOpts = questions[qIndex].options;
    if (currentOpts.length >= 6) {
      toast.error("Bitta savolda ko‘pi bilan 6 ta variant bo‘lishi mumkin");
      return;
    }
    const updated = [...questions];
    updated[qIndex].options.push({ optionText: "", isCorrect: false });
    setQuestions(updated);
  };

  const handleRemoveOption = (qIndex: number, optIndex: number) => {
    const currentOpts = questions[qIndex].options;
    if (currentOpts.length <= 2) {
      toast.error("Har bir savolda kamida 2 ta variant bo‘lishi shart");
      return;
    }
    const updated = [...questions];
    const wasCorrect = currentOpts[optIndex].isCorrect;
    updated[qIndex].options = currentOpts.filter((_, i) => i !== optIndex);

    // If removed option was correct, make first remaining option correct
    if (wasCorrect && updated[qIndex].options.length > 0) {
      updated[qIndex].options[0].isCorrect = true;
    }
    setQuestions(updated);
  };

  // Validation
  const validate = (): boolean => {
    if (!title.trim()) {
      toast.error("Topshiriq sarlavhasini kiriting");
      return false;
    }
    if (!groupId) {
      toast.error("O‘quv guruhini tanlang");
      return false;
    }
    if (questions.length === 0) {
      toast.error("Kamida 1 ta savol qo‘shing");
      return false;
    }

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.questionText.trim()) {
        toast.error(`${i + 1}-savol matnini kiriting`);
        return false;
      }
      if (q.options.length < 2) {
        toast.error(`${i + 1}-savolda kamida 2 ta variant bo‘lishi kerak`);
        return false;
      }

      const hasCorrect = q.options.some((o) => o.isCorrect);
      if (!hasCorrect) {
        toast.error(`${i + 1}-savolning to‘g‘ri javobini belgilang`);
        return false;
      }

      for (let j = 0; j < q.options.length; j++) {
        if (!q.options[j].optionText.trim()) {
          toast.error(`${i + 1}-savolning ${j + 1}-variant matnini kiriting`);
          return false;
        }
      }
    }

    return true;
  };

  const handleSave = async (andPublish = false) => {
    if (!validate()) return;
    setLoading(true);

    try {
      if (initialData?.id) {
        // Update existing
        const res = await updateAssignmentAction(initialData.id, {
          groupId,
          title: title.trim(),
          description: description.trim() || undefined,
          scoringBasePoints,
          scoringRankStep,
          questions,
        });

        if (!res.success) {
          toast.error(res.error || "Yangilashda xatolik");
          return;
        }

        if (andPublish) {
          const pubRes = await publishAssignmentAction(initialData.id, true);
          if (pubRes.success) {
            toast.success("Topshiriq yangilandi va Telegram guruhiga yuborildi!");
          } else {
            toast.error(pubRes.error || "E'lon qilishda xatolik");
          }
        } else {
          toast.success("Topshiriq saqlandi");
        }

        router.push(`/assignments/${initialData.id}`);
      } else {
        // Create new
        const res = await createAssignmentAction({
          groupId,
          title: title.trim(),
          description: description.trim() || undefined,
          scoringBasePoints,
          scoringRankStep,
          scoringMinPoints,
          antiCheatMode,
          questions,
        });

        if (!res.success || !res.id) {
          toast.error(res.error || "Topshiriq yaratishda xatolik");
          return;
        }

        if (andPublish) {
          const pubRes = await publishAssignmentAction(res.id, true);
          if (pubRes.success) {
            toast.success("Topshiriq yaratildi va Telegram guruhiga yuborildi!");
          } else {
            toast.warning("Topshiriq yaratildi, ammo Telegramga yuborishda xatolik: " + pubRes.error);
          }
        } else {
          toast.success("Topshiriq qoralama sifatida saqlandi");
        }

        router.push(`/assignments/${res.id}`);
      }
    } catch {
      toast.error("Kutilmagan xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
        <Button variant="ghost" size="sm" asChild className="gap-2 self-start h-9 text-xs">
          <Link href="/assignments">
            <ArrowLeft className="w-4 h-4" />
            <span>Topshiriqlar ro‘yxatiga qaytish</span>
          </Link>
        </Button>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleSave(false)}
            disabled={loading}
            className="gap-1.5 text-xs h-9"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Qoralama sifatida saqlash</span>
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={() => handleSave(true)}
            disabled={loading}
            className="gap-1.5 text-xs h-9 bg-sky-600 hover:bg-sky-700 text-white"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            <span>E'lon qilish (Telegram)</span>
          </Button>
        </div>
      </div>

      {/* 1. Assignment Info Card */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span>1. Asosiy ma'lumotlar</span>
          </CardTitle>
          <CardDescription className="text-xs">
            Topshiriq nomi, o‘quv guruhi va tavsifini kiriting
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-xs font-semibold">
                Topshiriq / Test sarlavhasi <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="title"
                placeholder="Masalan: JavaScript — 1-topshiriq"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-10 text-sm font-medium"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="groupId" className="text-xs font-semibold">
                O‘quv guruhi <span className="text-rose-500">*</span>
              </Label>
              <select
                id="groupId"
                value={groupId}
                onChange={(e) => setGroupId(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm font-medium"
              >
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} ({g.course_name})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-xs font-semibold">
              Qisqacha tavsif yoki yo‘riqnoma (ixtiyoriy)
            </Label>
            <Textarea
              id="description"
              placeholder="O‘quvchilar uchun qo‘shimcha eslatma yoki topshiriq mazmuni..."
              value={description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
              rows={2}
              className="text-sm"
            />
          </div>

          {/* Group students snapshot preview badge */}
          <div className="p-3 rounded-xl bg-muted/50 border border-border flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="w-4 h-4 text-blue-600" />
              <span>
                Tanlangan guruhdagi faol o‘quvchilar:{" "}
                <strong className="text-foreground">
                  {loadingStudents ? "..." : `${groupStudents.length} nafar`}
                </strong>
              </span>
            </div>
            <span className="text-[11px] text-muted-foreground hidden sm:inline">
              E'lon qilinganda ushbu o‘quvchilar ro‘yxati qulflanadi
            </span>
          </div>
        </CardContent>
      </Card>

      {/* 2. Questions Builder */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-foreground">
              2. Test Savollari ({questions.length} ta)
            </h2>
            <p className="text-xs text-muted-foreground">
              Har bir savol uchun variantlar kiriting va to‘g‘ri javobni belgilang
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={handleAddQuestion}
            className="gap-1.5 text-xs h-9"
          >
            <Plus className="w-4 h-4" />
            <span>Savol qo‘shish</span>
          </Button>
        </div>

        {questions.map((q, qIndex) => (
          <Card key={qIndex} className="shadow-sm border-l-4 border-l-blue-600">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                    {qIndex + 1}
                  </span>
                  <span className="font-bold text-sm text-foreground">
                    {qIndex + 1}-Savol
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    disabled={qIndex === 0}
                    onClick={() => handleMoveQuestion(qIndex, "up")}
                    className="h-8 w-8 text-muted-foreground"
                    title="Yuqoriga surish"
                  >
                    <MoveUp className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    disabled={qIndex === questions.length - 1}
                    onClick={() => handleMoveQuestion(qIndex, "down")}
                    className="h-8 w-8 text-muted-foreground"
                    title="Pastga surish"
                  >
                    <MoveDown className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => handleRemoveQuestion(qIndex)}
                    className="h-8 w-8 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                    title="Savolni o‘chirish"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Savol matni</Label>
                <Textarea
                  placeholder="Masalan: JavaScript da o‘zgaruvchi e'lon qilish uchun qaysi kalit so‘z ishlatiladi?"
                  value={q.questionText}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleQuestionTextChange(qIndex, e.target.value)}
                  rows={2}
                  className="text-sm font-medium"
                />
              </div>

              {/* Options */}
              <div className="space-y-2.5 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground">
                    Javob variantlari ({q.options.length} ta)
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    To‘g‘ri javobni tanlash uchun aylanani bosing
                  </span>
                </div>

                <div className="space-y-2">
                  {q.options.map((opt, optIndex) => {
                    const letters = ["A", "B", "C", "D", "E", "F"];
                    return (
                      <div
                        key={optIndex}
                        className={`flex items-center gap-2 p-2 rounded-xl border transition-all ${
                          opt.isCorrect
                            ? "border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20"
                            : "border-border bg-card"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => handleSetCorrectOption(qIndex, optIndex)}
                          className="p-1 rounded-full text-muted-foreground hover:text-emerald-600 shrink-0"
                          title={opt.isCorrect ? "To‘g‘ri javob" : "To‘g‘ri javob qilib belgilash"}
                        >
                          {opt.isCorrect ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-600 fill-emerald-100 dark:fill-emerald-950" />
                          ) : (
                            <Circle className="w-5 h-5 text-muted-foreground" />
                          )}
                        </button>

                        <span className="font-bold text-xs text-muted-foreground w-4 text-center shrink-0">
                          {letters[optIndex]}
                        </span>

                        <Input
                          placeholder={`Variant ${letters[optIndex]} matni...`}
                          value={opt.optionText}
                          onChange={(e) =>
                            handleOptionTextChange(qIndex, optIndex, e.target.value)
                          }
                          className="h-9 text-xs font-medium border-0 shadow-none focus-visible:ring-1"
                        />

                        {opt.isCorrect && (
                          <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 shrink-0 hidden sm:inline">
                            To‘g‘ri javob
                          </span>
                        )}

                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => handleRemoveOption(qIndex, optIndex)}
                          disabled={q.options.length <= 2}
                          className="h-8 w-8 text-muted-foreground hover:text-rose-600 shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    );
                  })}
                </div>

                {q.options.length < 6 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddOption(qIndex)}
                    className="text-xs h-8 gap-1.5 mt-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Variant qo‘shish</span>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        <Button
          type="button"
          variant="outline"
          onClick={handleAddQuestion}
          className="w-full py-6 border-dashed border-2 gap-2 text-sm font-semibold"
        >
          <Plus className="w-5 h-5 text-blue-600" />
          <span>Yana bitta savol qo‘shish</span>
        </Button>
      </div>

      {/* 3. Scoring & Rules */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-bold flex items-center gap-2 text-purple-600 dark:text-purple-400">
            <Trophy className="w-4 h-4" />
            <span>3. Ball va Tartib Tizimi</span>
          </CardTitle>
          <CardDescription className="text-xs">
            To‘g‘ri javobni boshqalardan oldinroq tasdiqlagan o‘quvchi ko‘proq ball oladi
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="basePoints" className="text-xs font-semibold">
                Asosiy ball (1-o‘rin)
              </Label>
              <Input
                id="basePoints"
                type="number"
                value={scoringBasePoints}
                onChange={(e) => setScoringBasePoints(Number(e.target.value))}
                className="h-10 text-sm font-semibold"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rankStep" className="text-xs font-semibold">
                Tartib qadami (Kamayish)
              </Label>
              <Input
                id="rankStep"
                type="number"
                value={scoringRankStep}
                onChange={(e) => setScoringRankStep(Number(e.target.value))}
                className="h-10 text-sm font-semibold"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="minPoints" className="text-xs font-semibold">
                Eng kam to‘g‘ri javob bali
              </Label>
              <Input
                id="minPoints"
                type="number"
                value={scoringMinPoints}
                onChange={(e) => setScoringMinPoints(Number(e.target.value))}
                className="h-10 text-sm font-semibold"
              />
            </div>
          </div>

          {/* Example Scoring Visual */}
          <div className="p-3.5 rounded-xl bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200/60 dark:border-purple-900/40 space-y-2 text-xs">
            <p className="font-bold text-purple-900 dark:text-purple-300">
              📊 5 nafar o‘quvchi uchun bitta savoldan beriladigan namunaviy ballar:
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-center font-mono">
              <div className="p-2 rounded-lg bg-background border">
                <span className="text-[10px] text-muted-foreground block">1-to‘g‘ri</span>
                <span className="font-bold text-emerald-600">{scoringBasePoints}</span>
              </div>
              <div className="p-2 rounded-lg bg-background border">
                <span className="text-[10px] text-muted-foreground block">2-to‘g‘ri</span>
                <span className="font-bold text-emerald-600">
                  {Math.max(scoringMinPoints, scoringBasePoints - scoringRankStep)}
                </span>
              </div>
              <div className="p-2 rounded-lg bg-background border">
                <span className="text-[10px] text-muted-foreground block">3-to‘g‘ri</span>
                <span className="font-bold text-emerald-600">
                  {Math.max(scoringMinPoints, scoringBasePoints - scoringRankStep * 2)}
                </span>
              </div>
              <div className="p-2 rounded-lg bg-background border">
                <span className="text-[10px] text-muted-foreground block">4-to‘g‘ri</span>
                <span className="font-bold text-emerald-600">
                  {Math.max(scoringMinPoints, scoringBasePoints - scoringRankStep * 3)}
                </span>
              </div>
              <div className="p-2 rounded-lg bg-background border">
                <span className="text-[10px] text-muted-foreground block">5-to‘g‘ri</span>
                <span className="font-bold text-emerald-600">
                  {Math.max(scoringMinPoints, scoringBasePoints - scoringRankStep * 4)}
                </span>
              </div>
              <div className="p-2 rounded-lg bg-background border">
                <span className="text-[10px] text-muted-foreground block">Noto‘g‘ri</span>
                <span className="font-bold text-rose-600">0 ball</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="space-y-0.5">
              <Label className="text-xs font-semibold">Anti-Cheat va Suv Belgisi</Label>
              <p className="text-xs text-muted-foreground">
                Ekrandan nusxa ko‘chirishni cheklash va dinamik suv belgisi qo‘yish
              </p>
            </div>
            <Switch
              checked={antiCheatMode}
              onCheckedChange={setAntiCheatMode}
            />
          </div>
        </CardContent>
      </Card>

      {/* Bottom Submit Actions */}
      <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-4 border-t border-border">
        <Button
          type="button"
          variant="outline"
          onClick={() => handleSave(false)}
          disabled={loading}
          className="w-full sm:w-auto h-11 sm:h-9 text-xs font-semibold"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-1.5" />}
          <span>Qoralama sifatida saqlash</span>
        </Button>

        <Button
          type="button"
          onClick={() => handleSave(true)}
          disabled={loading}
          className="w-full sm:w-auto h-11 sm:h-9 text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 mr-1.5" />}
          <span>Saqlash va Telegramga e'lon qilish</span>
        </Button>
      </div>
    </div>
  );
}
