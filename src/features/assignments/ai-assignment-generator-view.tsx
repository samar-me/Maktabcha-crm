"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Group, Lesson } from "@/types/database";
import {
  AIGeneratorSource,
  AIGeneratorSettings,
  GeneratedAssignmentDraft,
  GeneratedQuestion,
  QuestionDifficulty,
  QuestionStyle,
} from "@/lib/ai/types";
import {
  generateAssignmentWithAIAction,
  regenerateQuestionWithAIAction,
  improveQuestionWithAIAction,
  getAIAvailabilityAction,
  getLessonContextForAIAction,
} from "@/actions/ai-assignment";
import { createAssignmentAction, publishAssignmentAction } from "@/actions/assignments";
import { getLessons } from "@/services/lessons";
import { QuestionDraft } from "@/types/assignment";
import { AssignmentBuilder } from "./assignment-builder";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  Sparkles,
  ArrowLeft,
  BookOpen,
  FileText,
  HelpCircle,
  CheckCircle2,
  RefreshCw,
  Edit,
  Trash2,
  Save,
  Send,
  Loader2,
  AlertCircle,
  Wand2,
  Plus,
  PenTool,
  Check,
  ChevronDown,
  Layers,
  Code,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

interface AIAssignmentGeneratorViewProps {
  groups: Group[];
  initialLessonId?: string;
  initialGroupId?: string;
  onSwitchToManual?: () => void;
}

export function AIAssignmentGeneratorView({
  groups,
  initialLessonId,
  initialGroupId,
  onSwitchToManual,
}: AIAssignmentGeneratorViewProps) {
  const router = useRouter();

  // Mode & Availability
  const [isConfigured, setIsConfigured] = React.useState<boolean | null>(null);
  const [modelName, setModelName] = React.useState<string>("");

  // Source Form State
  const [sourceType, setSourceType] = React.useState<"topic" | "crm_lesson" | "text">(
    initialLessonId ? "crm_lesson" : "topic"
  );
  const [selectedGroupId, setSelectedGroupId] = React.useState<string>(
    initialGroupId || (groups[0]?.id || "")
  );
  const [topicInput, setTopicInput] = React.useState<string>("");
  const [instructionInput, setInstructionInput] = React.useState<string>("");
  const [textMaterialInput, setTextMaterialInput] = React.useState<string>("");

  // CRM Lesson State
  const [groupLessons, setGroupLessons] = React.useState<Lesson[]>([]);
  const [selectedLessonId, setSelectedLessonId] = React.useState<string>(initialLessonId || "");
  const [lessonContext, setLessonContext] = React.useState<any | null>(null);
  const [loadingLessons, setLoadingLessons] = React.useState(false);

  // Settings State
  const [questionCount, setQuestionCount] = React.useState<number>(10);
  const [customQuestionCount, setCustomQuestionCount] = React.useState<string>("");
  const [difficulty, setDifficulty] = React.useState<QuestionDifficulty>("O‘rtacha");
  const [optionCount, setOptionCount] = React.useState<number>(4);
  const [selectedStyles, setSelectedStyles] = React.useState<QuestionStyle[]>(["Aralash"]);

  // Generation Loading State & Messages
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [loadingMessageIndex, setLoadingMessageIndex] = React.useState(0);

  // Result Preview State
  const [generatedDraft, setGeneratedDraft] = React.useState<GeneratedAssignmentDraft | null>(null);
  const [activeEditingIndex, setActiveEditingIndex] = React.useState<number | null>(null);
  const [reloadingQuestionIndex, setReloadingQuestionIndex] = React.useState<number | null>(null);

  // Improve Question Modal
  const [improveModalOpen, setImproveModalOpen] = React.useState(false);
  const [improveTargetIndex, setImproveTargetIndex] = React.useState<number | null>(null);
  const [improveInstruction, setImproveInstruction] = React.useState<string>("");
  const [improveLoading, setImproveLoading] = React.useState(false);

  // Regenerate All Confirm
  const [regenerateConfirmOpen, setRegenerateConfirmOpen] = React.useState(false);
  const [saveLoading, setSaveLoading] = React.useState(false);

  // Switch to Manual Editor with Draft Data
  const [forwardToManualBuilder, setForwardToManualBuilder] = React.useState(false);

  // Check AI availability
  React.useEffect(() => {
    async function checkAvailability() {
      try {
        const res = await getAIAvailabilityAction();
        setIsConfigured(res.isConfigured);
        setModelName(res.model || "");
      } catch {
        setIsConfigured(false);
      }
    }
    checkAvailability();
  }, []);

  // Load Lessons when selected group changes
  React.useEffect(() => {
    if (!selectedGroupId) return;
    async function loadLessons() {
      try {
        setLoadingLessons(true);
        const lList = await getLessons(selectedGroupId);
        setGroupLessons(lList);
        if (lList.length > 0 && !selectedLessonId) {
          setSelectedLessonId(lList[0].id);
        }
      } catch {
        setGroupLessons([]);
      } finally {
        setLoadingLessons(false);
      }
    }
    loadLessons();
  }, [selectedGroupId, selectedLessonId]);

  // Load Lesson Context when selected lesson changes
  React.useEffect(() => {
    if (sourceType !== "crm_lesson" || !selectedLessonId) return;
    async function loadContext() {
      try {
        const res = await getLessonContextForAIAction(selectedLessonId);
        if (res.success && res.context) {
          setLessonContext(res.context);
        }
      } catch {
        setLessonContext(null);
      }
    }
    loadContext();
  }, [sourceType, selectedLessonId]);

  // Staged loading animation messages
  React.useEffect(() => {
    if (!isGenerating) return;
    const messages = [
      "Mavzu va materiallar tahlil qilinmoqda...",
      "Savollar va javob variantlari tuzilmoqda...",
      "Chalg‘ituvchi variantlar tekshirilmoqda...",
      "To‘g‘ri javoblar muvozanati tahlil qilinmoqda...",
      "Topshiriq qoralamasi tayyorlanmoqda...",
    ];
    const interval = setInterval(() => {
      setLoadingMessageIndex((prev) => (prev + 1) % messages.length);
    }, 2200);
    return () => clearInterval(interval);
  }, [isGenerating]);

  // Style toggle helper
  const toggleStyle = (style: QuestionStyle) => {
    if (style === "Aralash") {
      setSelectedStyles(["Aralash"]);
      return;
    }
    const filtered = selectedStyles.filter((s) => s !== "Aralash");
    if (filtered.includes(style)) {
      const next = filtered.filter((s) => s !== style);
      setSelectedStyles(next.length === 0 ? ["Aralash"] : next);
    } else {
      setSelectedStyles([...filtered, style]);
    }
  };

  // Main Generation Trigger
  const handleGenerate = async () => {
    const finalCount = customQuestionCount ? Number(customQuestionCount) : questionCount;
    if (finalCount < 3 || finalCount > 30) {
      toast.error("Savollar soni 3 dan 30 gacha bo‘lishi kerak");
      return;
    }

    if (sourceType === "topic" && !topicInput.trim()) {
      toast.error("Iltimos, mavzuni kiriting");
      return;
    }

    if (sourceType === "crm_lesson" && !selectedLessonId) {
      toast.error("Iltimos, darsni tanlang");
      return;
    }

    if (sourceType === "text" && !textMaterialInput.trim()) {
      toast.error("Iltimos, matn materialini joylashtiring");
      return;
    }

    setIsGenerating(true);
    setLoadingMessageIndex(0);

    const source: AIGeneratorSource = {
      type: sourceType,
      topic: topicInput.trim(),
      instruction: instructionInput.trim(),
      lessonId: selectedLessonId,
      lessonContext: lessonContext || undefined,
      textMaterial: textMaterialInput.trim(),
    };

    const settings: AIGeneratorSettings = {
      groupId: selectedGroupId,
      questionCount: finalCount,
      difficulty,
      optionCount,
      styles: selectedStyles,
    };

    try {
      const res = await generateAssignmentWithAIAction(source, settings);
      if (res.success && res.data) {
        setGeneratedDraft(res.data);
        toast.success(`✨ AI ${res.data.questions.length} ta savoldan iborat topshiriqni tayyorladi!`);
      } else {
        toast.error(res.error || "Topshiriq yaratishda xatolik yuz berdi");
      }
    } catch {
      toast.error("Kutilmagan xatolik yuz berdi");
    } finally {
      setIsGenerating(false);
    }
  };

  // Regenerate Single Question
  const handleRegenerateSingle = async (index: number) => {
    if (!generatedDraft) return;
    setReloadingQuestionIndex(index);

    const source: AIGeneratorSource = {
      type: sourceType,
      topic: topicInput.trim() || generatedDraft.title,
      instruction: instructionInput.trim(),
      lessonId: selectedLessonId,
      lessonContext: lessonContext || undefined,
      textMaterial: textMaterialInput.trim(),
    };

    const settings: AIGeneratorSettings = {
      groupId: selectedGroupId,
      questionCount: generatedDraft.questions.length,
      difficulty,
      optionCount,
      styles: selectedStyles,
    };

    const existing = generatedDraft.questions.filter((_, i) => i !== index);
    const targetQ = generatedDraft.questions[index].question;

    try {
      const res = await regenerateQuestionWithAIAction(source, settings, existing, targetQ);
      if (res.success && res.data) {
        const updatedQuestions = [...generatedDraft.questions];
        updatedQuestions[index] = res.data;
        setGeneratedDraft({ ...generatedDraft, questions: updatedQuestions });
        toast.success(`${index + 1}-savol yangilandi`);
      } else {
        toast.error(res.error || "Savolni yangilashda xatolik");
      }
    } catch {
      toast.error("Savolni yangilashda xatolik yuz berdi");
    } finally {
      setReloadingQuestionIndex(null);
    }
  };

  // Improve Single Question with Custom Prompt
  const handleImproveSingle = async () => {
    if (!generatedDraft || improveTargetIndex === null || !improveInstruction.trim()) return;
    setImproveLoading(true);

    const source: AIGeneratorSource = {
      type: sourceType,
      topic: topicInput.trim() || generatedDraft.title,
      instruction: instructionInput.trim(),
      lessonId: selectedLessonId,
      lessonContext: lessonContext || undefined,
      textMaterial: textMaterialInput.trim(),
    };

    const targetQ = generatedDraft.questions[improveTargetIndex];

    try {
      const res = await improveQuestionWithAIAction(source, targetQ, improveInstruction.trim());
      if (res.success && res.data) {
        const updatedQuestions = [...generatedDraft.questions];
        updatedQuestions[improveTargetIndex] = res.data;
        setGeneratedDraft({ ...generatedDraft, questions: updatedQuestions });
        setImproveModalOpen(false);
        setImproveInstruction("");
        toast.success(`${improveTargetIndex + 1}-savol yaxshilandi`);
      } else {
        toast.error(res.error || "Savolni yaxshilashda xatolik");
      }
    } catch {
      toast.error("Kutilmagan xatolik");
    } finally {
      setImproveLoading(false);
    }
  };

  // Delete Question
  const handleDeleteQuestion = (index: number) => {
    if (!generatedDraft) return;
    if (generatedDraft.questions.length <= 1) {
      toast.error("Topshiriqda kamida 1 ta savol qolishi kerak");
      return;
    }
    const updated = generatedDraft.questions.filter((_, i) => i !== index);
    setGeneratedDraft({ ...generatedDraft, questions: updated });
    toast.info("Savol o‘chirildi");
  };

  // Convert to Questions Draft format
  const getDraftQuestionsForManual = (): QuestionDraft[] => {
    if (!generatedDraft) return [];
    return generatedDraft.questions.map((q, qIndex) => ({
      position: qIndex + 1,
      questionText: q.question,
      options: q.options.map((opt, optIndex) => ({
        position: optIndex + 1,
        optionText: opt.text,
        isCorrect: opt.isCorrect,
      })),
    }));
  };

  // Save as Normal Draft or Publish
  const handleSaveDraftOrPublish = async (andPublish = false) => {
    if (!generatedDraft) return;
    setSaveLoading(true);

    const questionsDraft = getDraftQuestionsForManual();

    try {
      const createRes = await createAssignmentAction({
        groupId: selectedGroupId,
        title: generatedDraft.title.trim(),
        description: generatedDraft.description.trim() || undefined,
        scoringBasePoints: 1000,
        scoringRankStep: 100,
        scoringMinPoints: 100,
        antiCheatMode: true,
        questions: questionsDraft,
      });

      if (!createRes.success || !createRes.id) {
        toast.error(createRes.error || "Topshiriqni saqlashda xatolik");
        return;
      }

      if (andPublish) {
        const pubRes = await publishAssignmentAction(createRes.id, true);
        if (pubRes.success) {
          toast.success("Topshiriq saqlandi va Telegram guruhiga yuborildi!");
        } else {
          toast.warning("Topshiriq saqlandi, ammo Telegramga yuborishda xatolik: " + pubRes.error);
        }
      } else {
        toast.success("Topshiriq qoralama sifatida saqlandi");
      }

      router.push(`/assignments/${createRes.id}`);
    } catch {
      toast.error("Kutilmagan xatolik yuz berdi");
    } finally {
      setSaveLoading(false);
    }
  };

  // If user clicked "Manual Editor with this draft data"
  if (forwardToManualBuilder && generatedDraft) {
    return (
      <AssignmentBuilder
        groups={groups}
        initialData={{
          id: "",
          groupId: selectedGroupId,
          title: generatedDraft.title,
          description: generatedDraft.description,
          scoringBasePoints: 1000,
          scoringRankStep: 100,
          scoringMinPoints: 100,
          antiCheatMode: true,
          questions: getDraftQuestionsForManual(),
        }}
      />
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      {/* Top Header & Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border">
        <Button variant="ghost" size="sm" asChild className="gap-2 self-start h-9 text-xs">
          <Link href="/assignments">
            <ArrowLeft className="w-4 h-4" />
            <span>Topshiriqlar ro‘yxatiga qaytish</span>
          </Link>
        </Button>

        <div className="flex items-center p-1 bg-muted/60 rounded-xl border border-border gap-1 self-start sm:self-auto">
          <button
            type="button"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 text-white shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI bilan yaratish</span>
          </button>
          <button
            type="button"
            onClick={onSwitchToManual}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            <PenTool className="w-3.5 h-3.5" />
            <span>Qo‘lda yaratish</span>
          </button>
        </div>
      </div>

      {/* AI Not Configured Alert Banner */}
      {isConfigured === false && (
        <Card className="border-amber-200 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20 shadow-xs">
          <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-xs text-amber-800 dark:text-amber-300">
              <AlertCircle className="w-5 h-5 shrink-0 text-amber-600" />
              <div>
                <p className="font-bold">AI xizmati sozlanmagan</p>
                <p className="text-muted-foreground">
                  Serverda AI_API_KEY belgilanmagan. Topshiriqni qo‘lda yaratishingiz mumkin.
                </p>
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onSwitchToManual}
              className="text-xs h-8 shrink-0 gap-1.5 border-amber-300 text-amber-900 dark:text-amber-200"
            >
              <PenTool className="w-3.5 h-3.5" />
              <span>Qo‘lda yaratish</span>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* IF NOT GENERATED YET: SHOW GENERATOR FORM */}
      {!generatedDraft ? (
        <div className="space-y-5 animate-in fade-in duration-200">
          {/* 1. Manba (Source) Card */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2 text-blue-600 dark:text-blue-400">
                <Wand2 className="w-5 h-5" />
                <span>1. Test Manbasi</span>
              </CardTitle>
              <CardDescription className="text-xs">
                AI qaysi mavzu yoki material asosida savollar tuzishini tanlang
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 3 Source Switch Buttons */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setSourceType("topic")}
                  className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 text-xs transition-all ${
                    sourceType === "topic"
                      ? "border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300 font-bold shadow-xs"
                      : "border-border hover:bg-muted text-muted-foreground"
                  }`}
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Mavzu yozish</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSourceType("crm_lesson")}
                  className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 text-xs transition-all ${
                    sourceType === "crm_lesson"
                      ? "border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300 font-bold shadow-xs"
                      : "border-border hover:bg-muted text-muted-foreground"
                  }`}
                >
                  <Layers className="w-4 h-4" />
                  <span>CRM’dagi darsdan</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSourceType("text")}
                  className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 text-xs transition-all ${
                    sourceType === "text"
                      ? "border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300 font-bold shadow-xs"
                      : "border-border hover:bg-muted text-muted-foreground"
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>Matndan</span>
                </button>
              </div>

              {/* Source 1: Topic */}
              {sourceType === "topic" && (
                <div className="space-y-3 pt-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="topic" className="text-xs font-semibold">
                      Dars mavzusi <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id="topic"
                      placeholder="Masalan: JavaScript array metodlari va funksiyalar"
                      value={topicInput}
                      onChange={(e) => setTopicInput(e.target.value)}
                      className="h-10 text-sm font-medium"
                      autoFocus
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="instruction" className="text-xs font-semibold">
                      Qo‘shimcha ko‘rsatma (ixtiyoriy)
                    </Label>
                    <Input
                      id="instruction"
                      placeholder="Masalan: O‘quvchilar yangi boshlovchi. Amaliy misollar ko‘proq bo‘lsin."
                      value={instructionInput}
                      onChange={(e) => setInstructionInput(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>
                </div>
              )}

              {/* Source 2: CRM Lesson */}
              {sourceType === "crm_lesson" && (
                <div className="space-y-3 pt-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Guruhni tanlang</Label>
                      <select
                        value={selectedGroupId}
                        onChange={(e) => setSelectedGroupId(e.target.value)}
                        className="w-full h-10 px-3 rounded-lg border border-input bg-background text-xs font-medium"
                      >
                        {groups.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.name} ({g.course_name})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Darsni tanlang</Label>
                      <select
                        value={selectedLessonId}
                        onChange={(e) => setSelectedLessonId(e.target.value)}
                        disabled={loadingLessons || groupLessons.length === 0}
                        className="w-full h-10 px-3 rounded-lg border border-input bg-background text-xs font-medium"
                      >
                        {groupLessons.length === 0 ? (
                          <option value="">Guruhda darslar mavjud emas</option>
                        ) : (
                          groupLessons.map((l) => (
                            <option key={l.id} value={l.id}>
                              {l.topic}
                            </option>
                          ))
                        )}
                      </select>
                    </div>
                  </div>

                  {lessonContext && (
                    <div className="p-3.5 rounded-xl bg-muted/60 border border-border text-xs space-y-1.5">
                      <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-bold">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Tanlangan dars ma'lumotlari:</span>
                      </div>
                      <p className="font-semibold text-foreground">
                        Mavzu: {lessonContext.topic}
                      </p>
                      {lessonContext.description && (
                        <p className="text-muted-foreground line-clamp-2">
                          Tavsif: {lessonContext.description}
                        </p>
                      )}
                      {lessonContext.homework && (
                        <p className="text-muted-foreground line-clamp-1">
                          Vazifa: {lessonContext.homework}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Source 3: Text */}
              {sourceType === "text" && (
                <div className="space-y-1.5 pt-2">
                  <Label htmlFor="textMaterial" className="text-xs font-semibold">
                    Materialni shu yerga joylashtiring <span className="text-rose-500">*</span>
                  </Label>
                  <Textarea
                    id="textMaterial"
                    placeholder="Dars konspekti, kitobdan parcha yoki mavzu tushuntirishini joylashtiring. AI asosan shu matndan savollar tuzadi..."
                    value={textMaterialInput}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setTextMaterialInput(e.target.value)}
                    rows={6}
                    className="text-xs font-mono"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Belgilar soni: {textMaterialInput.length} ta (maksimal 10 000 belgi)
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 2. Generation Settings Card */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2 text-purple-600 dark:text-purple-400">
                <Zap className="w-5 h-5" />
                <span>2. Test Parametrlari</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Savollar soni, qiyinlik darajasi va javob variantlari
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Group Selector if not already in lesson mode */}
              {sourceType !== "crm_lesson" && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">O‘quv guruhi</Label>
                  <select
                    value={selectedGroupId}
                    onChange={(e) => setSelectedGroupId(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-input bg-background text-xs font-medium"
                  >
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name} ({g.course_name})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Question Count */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Savollar soni</Label>
                <div className="flex flex-wrap items-center gap-2">
                  {[5, 10, 15, 20].map((cnt) => (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => {
                        setQuestionCount(cnt);
                        setCustomQuestionCount("");
                      }}
                      className={`px-3.5 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                        questionCount === cnt && !customQuestionCount
                          ? "border-purple-600 bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-300"
                          : "border-border text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {cnt} ta
                    </button>
                  ))}

                  <div className="flex items-center gap-1.5 ml-auto">
                    <span className="text-xs text-muted-foreground">Boshqa:</span>
                    <Input
                      type="number"
                      min={3}
                      max={30}
                      placeholder="12"
                      value={customQuestionCount}
                      onChange={(e) => setCustomQuestionCount(e.target.value)}
                      className="w-16 h-8 text-xs text-center font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Difficulty & Option Count Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                {/* Difficulty */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Qiyinlik darajasi</Label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {(["Oson", "O‘rtacha", "Qiyin", "Aralash"] as QuestionDifficulty[]).map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setDifficulty(d)}
                        className={`py-1.5 px-1 rounded-lg border text-[11px] font-bold text-center transition-all ${
                          difficulty === d
                            ? "border-purple-600 bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-300"
                            : "border-border text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Option Count */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Variantlar soni</Label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[3, 4, 5].map((cnt) => (
                      <button
                        key={cnt}
                        type="button"
                        onClick={() => setOptionCount(cnt)}
                        className={`py-1.5 rounded-lg border text-[11px] font-bold text-center transition-all ${
                          optionCount === cnt
                            ? "border-purple-600 bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-300"
                            : "border-border text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        {cnt} ta (A-{cnt === 3 ? "C" : cnt === 4 ? "D" : "E"})
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Question Style */}
              <div className="space-y-2 pt-1">
                <Label className="text-xs font-semibold">Savol uslubi</Label>
                <div className="flex flex-wrap gap-1.5">
                  {(["Aralash", "Nazariy", "Amaliy", "Kodli", "Mantiqiy"] as QuestionStyle[]).map((st) => {
                    const isSelected = selectedStyles.includes(st);
                    return (
                      <button
                        key={st}
                        type="button"
                        onClick={() => toggleStyle(st)}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
                          isSelected
                            ? "border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300 font-bold"
                            : "border-border text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        {st}
                      </button>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Main CTA Button */}
          <div className="pt-2">
            <Button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating || isConfigured === false}
              className="w-full h-12 text-sm font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/20 gap-2 rounded-xl"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>AI savollarni tayyorlamoqda...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>✨ AI bilan topshiriq yaratish</span>
                </>
              )}
            </Button>

            {isGenerating && (
              <div className="mt-3 p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40 text-center animate-in fade-in">
                <p className="text-xs font-semibold text-blue-800 dark:text-blue-300 flex items-center justify-center gap-2">
                  <Sparkles className="w-4 h-4 animate-pulse text-blue-600" />
                  <span>{loadingMessageIndex === 0 ? "Mavzu tahlil qilinmoqda..." : loadingMessageIndex === 1 ? "Savollar yaratilmoqda..." : "Variantlar tekshirilmoqda..."}</span>
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Bu taxminan 5–15 soniya vaqt oladi. Iltimos, kuting...
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* IF GENERATED: SHOW AI RESULT PREVIEW SCREEN */
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Header Banner */}
          <Card className="shadow-sm border-blue-200 dark:border-blue-900/60 bg-blue-50/20 dark:bg-blue-950/10">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-600 text-white">
                      <Sparkles className="w-3.5 h-3.5" />
                      AI Qoralamasi
                    </span>
                    <span className="text-xs font-semibold text-muted-foreground">
                      {generatedDraft.questions.length} ta savol
                    </span>
                  </div>

                  <Input
                    value={generatedDraft.title}
                    onChange={(e) =>
                      setGeneratedDraft({ ...generatedDraft, title: e.target.value })
                    }
                    className="text-lg font-bold text-foreground bg-transparent border-0 px-0 h-9 focus-visible:ring-0"
                    placeholder="Topshiriq sarlavhasi"
                  />
                  <Input
                    value={generatedDraft.description}
                    onChange={(e) =>
                      setGeneratedDraft({ ...generatedDraft, description: e.target.value })
                    }
                    className="text-xs text-muted-foreground bg-transparent border-0 px-0 h-7 focus-visible:ring-0"
                    placeholder="Qisqacha tavsif..."
                  />
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setRegenerateConfirmOpen(true)}
                  className="text-xs h-9 gap-1.5 shrink-0 self-start sm:self-auto"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Barchasini qayta yaratish</span>
                </Button>
              </div>
            </CardHeader>
          </Card>

          {/* Questions List Preview */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-base font-bold text-foreground">
                Savollar ({generatedDraft.questions.length} ta)
              </h2>
              <span className="text-xs text-muted-foreground">
                ✅ Yashil belgi faqat sizga ko‘rinadi (o‘quvchiga ko‘rinmaydi)
              </span>
            </div>

            {generatedDraft.questions.map((q, qIndex) => {
              const letters = ["A", "B", "C", "D", "E", "F"];
              const isReloadingThis = reloadingQuestionIndex === qIndex;

              return (
                <Card
                  key={qIndex}
                  className="shadow-sm border border-border relative overflow-hidden transition-all"
                >
                  {isReloadingThis && (
                    <div className="absolute inset-0 bg-background/80 backdrop-blur-xs z-10 flex items-center justify-center gap-2 text-xs font-bold text-blue-600">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Savol yangilanmoqda...</span>
                    </div>
                  )}

                  <CardHeader className="pb-2.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5 flex-1 min-w-0">
                        <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                          {qIndex + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-sm sm:text-base text-foreground leading-snug">
                            {q.question}
                          </h3>
                        </div>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3 pt-0">
                    {/* Options Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {q.options.map((opt, optIndex) => (
                        <div
                          key={optIndex}
                          className={`p-2.5 rounded-xl border flex items-center gap-2 ${
                            opt.isCorrect
                              ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 font-semibold"
                              : "border-border bg-card text-foreground"
                          }`}
                        >
                          <span className="font-bold text-muted-foreground w-4 text-center">
                            {letters[optIndex]}
                          </span>
                          <span className="flex-1">{opt.text}</span>
                          {opt.isCorrect && (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Teacher Explanation */}
                    {q.explanation && (
                      <div className="p-2 rounded-lg bg-muted/50 border border-border/60 text-[11px] text-muted-foreground flex items-center gap-1.5">
                        <span className="font-bold text-blue-600 dark:text-blue-400 shrink-0">
                          💡 Izoh:
                        </span>
                        <span className="truncate">{q.explanation}</span>
                      </div>
                    )}

                    {/* Toolbar under each question */}
                    <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-border/60">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRegenerateSingle(qIndex)}
                        disabled={isReloadingThis}
                        className="h-8 text-xs gap-1 text-muted-foreground hover:text-blue-600"
                        title="Ushbu savolni AI orqali boshqasiga almashtirish"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Almashtirish</span>
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setImproveTargetIndex(qIndex);
                          setImproveInstruction("");
                          setImproveModalOpen(true);
                        }}
                        className="h-8 text-xs gap-1 text-muted-foreground hover:text-purple-600"
                        title="AI ga ko‘rsatma berib savolni yaxshilash"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Yaxshilash</span>
                      </Button>

                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDeleteQuestion(qIndex)}
                        className="h-8 w-8 text-muted-foreground hover:text-rose-600"
                        title="Savolni o‘chirish"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Bottom Actions Bar */}
          <div className="p-4 rounded-2xl bg-card border border-border shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setForwardToManualBuilder(true)}
              className="w-full sm:w-auto h-10 text-xs font-semibold gap-1.5"
            >
              <PenTool className="w-4 h-4" />
              <span>Qo‘lda tahrirlash (Konstruktor)</span>
            </Button>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleSaveDraftOrPublish(false)}
                disabled={saveLoading}
                className="flex-1 sm:flex-initial h-10 text-xs font-semibold gap-1.5"
              >
                {saveLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>Qoralama saqlash</span>
              </Button>

              <Button
                type="button"
                onClick={() => handleSaveDraftOrPublish(true)}
                disabled={saveLoading}
                className="flex-1 sm:flex-initial h-10 text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white gap-1.5"
              >
                {saveLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span>Telegramga e'lon qilish</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Improve Question Modal */}
      <Dialog open={improveModalOpen} onOpenChange={setImproveModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              <span>{improveTargetIndex !== null ? `${improveTargetIndex + 1}-savolni yaxshilash` : "Savolni yaxshilash"}</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              AI ga savolni qanday o‘zgartirish bo‘yicha ko‘rsatma bering:
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 my-2">
            <div className="flex flex-wrap gap-1.5">
              {[
                "Bu savolni osonroq qil",
                "Variantlarni murakkabroq qil",
                "Kodli savolga aylantir",
                "Amaliy misol bilan boyit",
              ].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setImproveInstruction(preset)}
                  className="px-2.5 py-1 rounded-lg border text-[11px] font-medium bg-muted hover:bg-muted/80 text-foreground"
                >
                  {preset}
                </button>
              ))}
            </div>

            <Textarea
              placeholder="Masalan: Savolga 3 qator JavaScript kod misoli qo‘sh va natijasini so‘ra..."
              value={improveInstruction}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setImproveInstruction(e.target.value)}
              rows={3}
              className="text-xs font-medium"
              autoFocus
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setImproveModalOpen(false)}
              disabled={improveLoading}
            >
              Bekor qilish
            </Button>
            <Button
              type="button"
              onClick={handleImproveSingle}
              disabled={improveLoading || !improveInstruction.trim()}
              className="gap-1.5 bg-purple-600 hover:bg-purple-700 text-white"
            >
              {improveLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              <span>Yaxshilash</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Regenerate All Confirmation Modal */}
      <ConfirmDialog
        open={regenerateConfirmOpen}
        onOpenChange={setRegenerateConfirmOpen}
        title="Barcha savollarni qayta yaratishni tasdiqlaysizmi?"
        description="Hozirgi barcha savollar o‘rniga yangi test savollari noldan generatsiya qilinadi."
        confirmText="Ha, qayta yaratilsin"
        cancelText="Bekor qilish"
        variant="default"
        loading={isGenerating}
        onConfirm={async () => {
          setRegenerateConfirmOpen(false);
          await handleGenerate();
        }}
      />
    </div>
  );
}
