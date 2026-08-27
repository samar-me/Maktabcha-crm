"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ParsedRowItem,
  UniversalParseResult,
  CurriculumImportRow,
} from "@/lib/curriculum-import/types";
import {
  ACCEPTED_FILE_TYPES_ATTR,
  MAX_FILE_SIZE_MB,
  formatFileSize,
  generateCurriculumExcelTemplate,
  parseBulkTextCurriculum,
  normalizeParsedRows,
} from "@/lib/curriculum-import/index";
import { parseExcelSheet } from "@/lib/curriculum-import/excel-parser";
import { parseCsvContent } from "@/lib/curriculum-import/csv-parser";
import { parseTextContent } from "@/lib/curriculum-import/text-parser";
import {
  parseUniversalCurriculumFileAction,
  parseCurriculumTextWithAIAction,
  bulkImportCurriculumItemsAction,
  createCurriculumAction,
  getCurriculaAction,
} from "@/actions/curriculum";
import { Curriculum } from "@/types/curriculum";
import { Group } from "@/types/database";
import { getGroups } from "@/services/groups";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Upload,
  FileSpreadsheet,
  FileText,
  Download,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  Layers,
  Sparkles,
  Edit2,
  Trash2,
  Plus,
  ChevronDown,
  ChevronUp,
  FileCode,
  File,
  Check,
  RefreshCw,
  Info,
  ArrowRight,
  BookOpen,
} from "lucide-react";
import { toast } from "sonner";

interface UniversalImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  curriculumId?: string; // Optional: If opened from specific curriculum detail
  curriculumName?: string;
  onSuccess?: (targetCurriculumId?: string) => void;
}

export function CurriculumImportDialog({
  open,
  onOpenChange,
  curriculumId: initialCurriculumId,
  curriculumName: initialCurriculumName,
  onSuccess,
}: UniversalImportDialogProps) {
  const router = useRouter();

  // Wizard Tab: "file" | "text"
  const [tab, setTab] = React.useState<"file" | "text">("file");

  // Step: 1 (Upload), 2 (Analyze), 3 (Preview & Edit), 4 (Done)
  const [step, setStep] = React.useState<1 | 2 | 3 | 4>(1);

  // File state
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const [loadingStage, setLoadingStage] = React.useState<string>("Fayl tahlil qilinmoqda...");
  const [rawTextInput, setRawTextInput] = React.useState<string>("");

  // Parsed result
  const [parseResult, setParseResult] = React.useState<UniversalParseResult | null>(null);
  const [parsedRows, setParsedRows] = React.useState<ParsedRowItem[]>([]);
  const [unparsedText, setUnparsedText] = React.useState<string>("");
  const [showUnparsed, setShowUnparsed] = React.useState(false);
  const [isAiProcessing, setIsAiProcessing] = React.useState(false);

  // Destination curriculum configuration
  const [importMode, setImportMode] = React.useState<"new" | "existing">(
    initialCurriculumId ? "existing" : "new"
  );
  const [targetCurriculumId, setTargetCurriculumId] = React.useState<string>(
    initialCurriculumId || ""
  );
  const [newCurriculumName, setNewCurriculumName] = React.useState<string>("");
  const [newCourseName, setNewCourseName] = React.useState<string>("");
  const [newGroupId, setNewGroupId] = React.useState<string>("");

  // Existing curricula & groups list
  const [curriculaList, setCurriculaList] = React.useState<Curriculum[]>([]);
  const [groupsList, setGroupsList] = React.useState<Group[]>([]);

  // Item currently being edited in modal
  const [editingRow, setEditingRow] = React.useState<ParsedRowItem | null>(null);

  // Import loading state
  const [importing, setImporting] = React.useState(false);
  const [importedCount, setImportedCount] = React.useState(0);
  const [finalCurriculumId, setFinalCurriculumId] = React.useState<string>("");

  // Load existing curricula and groups when dialog opens
  React.useEffect(() => {
    if (!open) return;
    async function loadMeta() {
      try {
        const [cRes, gList] = await Promise.all([
          getCurriculaAction(),
          getGroups().catch(() => []),
        ]);
        if (cRes.success && cRes.data) {
          setCurriculaList(cRes.data);
          if (!targetCurriculumId && cRes.data.length > 0) {
            setTargetCurriculumId(cRes.data[0].id);
          }
        }
        setGroupsList(gList);
      } catch {
        // silent fallback
      }
    }
    loadMeta();
  }, [open, targetCurriculumId]);

  // Reset state when opening dialog
  React.useEffect(() => {
    if (open) {
      setStep(1);
      setSelectedFile(null);
      setParseResult(null);
      setParsedRows([]);
      setUnparsedText("");
      setShowUnparsed(false);
      setImportMode(initialCurriculumId ? "existing" : "new");
      setTargetCurriculumId(initialCurriculumId || "");
      setNewCurriculumName(initialCurriculumName || "");
      setRawTextInput("");
    }
  }, [open, initialCurriculumId, initialCurriculumName]);

  // Handle Download Excel Template
  const handleDownloadTemplate = () => {
    try {
      const data = generateCurriculumExcelTemplate();
      const blob = new Blob([data.buffer as any], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "ish-reja-namuna.xlsx";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Excel namuna fayli yuklab olindi");
    } catch {
      toast.error("Namuna faylini yuklab olishda xatolik");
    }
  };

  // Perform file upload and analysis
  const handleAnalyzeFile = async (fileToParse: File, sheetName?: string) => {
    setSelectedFile(fileToParse);
    setStep(2);
    setLoadingStage("Fayl tahlil qilinmoqda...");

    let t1: any;
    let t2: any;

    try {
      // Animation stages
      t1 = setTimeout(() => {
        setLoadingStage("Matn ajratilmoqda va formatlar tekshirilmoqda...");
      }, 400);

      t2 = setTimeout(() => {
        setLoadingStage("Mavzular va dars rejalari aniqlanmoqda...");
      }, 900);

      const ext = fileToParse.name.split(".").pop()?.toLowerCase();
      let result: UniversalParseResult;

      // ⚡️ FAST PATH: Direct in-browser parsing for XLSX, XLS, CSV, TXT (Instant, 0ms latency)
      if (ext === "xlsx" || ext === "xls") {
        const arrayBuf = await fileToParse.arrayBuffer();
        const excelRes = parseExcelSheet(arrayBuf, sheetName);
        const normalized = normalizeParsedRows(excelRes.rows);
        result = {
          success: true,
          fileType: ext as any,
          fileName: fileToParse.name,
          fileSizeFormatted: formatFileSize(fileToParse.size),
          items: normalized,
          sheets: excelRes.sheets,
          selectedSheet: excelRes.selectedSheet,
        };
      } else if (ext === "csv") {
        const text = await fileToParse.text();
        const csvRows = parseCsvContent(text);
        const normalized = normalizeParsedRows(csvRows);
        result = {
          success: true,
          fileType: "csv",
          fileName: fileToParse.name,
          fileSizeFormatted: formatFileSize(fileToParse.size),
          items: normalized,
        };
      } else if (ext === "txt") {
        const text = await fileToParse.text();
        const txtRes = parseTextContent(text);
        const normalized = normalizeParsedRows(txtRes.rows);
        result = {
          success: true,
          fileType: "txt",
          fileName: fileToParse.name,
          fileSizeFormatted: formatFileSize(fileToParse.size),
          detectedTitle: txtRes.detectedTitle,
          detectedDescription: txtRes.detectedDescription,
          items: normalized,
          unparsedText: txtRes.unparsedText,
        };
      } else {
        // 🔒 SERVER PATH: For Word (.docx) and PDF (.pdf)
        const formData = new FormData();
        formData.append("file", fileToParse);
        if (sheetName) {
          formData.append("sheetName", sheetName);
        }

        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error("Fayl tahlil qilish vaqti tugadi (Timeout). Qayta urinib ko‘ring.")),
            25000
          )
        );

        const serverActionPromise = parseUniversalCurriculumFileAction(formData);
        const res: any = await Promise.race([serverActionPromise, timeoutPromise]);

        if (!res.success || !res.result) {
          toast.error(res.error || "Faylni tahlil qilishda xatolik yuz berdi");
          setStep(1);
          return;
        }
        result = res.result;
      }

      setParseResult(result);
      setParsedRows(result.items || []);
      setUnparsedText(result.unparsedText || "");

      // Auto-prefill curriculum name if detected
      if (result.detectedTitle && !newCurriculumName) {
        setNewCurriculumName(result.detectedTitle);
      } else if (!newCurriculumName) {
        const baseName = fileToParse.name.replace(/\.[^/.]+$/, "").replace(/[_\-]/g, " ");
        setNewCurriculumName(baseName.charAt(0).toUpperCase() + baseName.slice(1));
      }

      if (result.isScannedPdf && result.items.length === 0) {
        toast.warning(
          "Bu PDF skanerlangan rasm ko‘rinishida. Matnni avtomatik o‘qib bo‘lmadi."
        );
      } else if (result.items.length === 0) {
        toast.warning("Fayldan dars mavzulari aniqlanmadi. Matnni tekshirib ko‘ring.");
      } else {
        toast.success(`${result.items.length} ta dars mavzusi aniqlandi`);
      }

      setStep(3);
    } catch (err: any) {
      console.error("File analyze error:", err);
      toast.error(err.message || "Faylni o‘qishda xatolik yuz berdi");
      setStep(1);
    } finally {
      clearTimeout(t1);
      clearTimeout(t2);
    }
  };

  // Perform text parsing from direct textarea
  const handleAnalyzeText = () => {
    if (!rawTextInput.trim()) {
      toast.error("Iltimos, matn kiriting");
      return;
    }

    setStep(2);
    setLoadingStage("Matn tahlil qilinmoqda...");

    setTimeout(() => {
      try {
        const parsed = parseBulkTextCurriculum(rawTextInput);
        const normalized = normalizeParsedRows(parsed);
        setParsedRows(normalized);
        setParseResult({
          success: true,
          fileType: "txt",
          fileName: "Kiritilgan matn",
          fileSizeFormatted: `${rawTextInput.length} belgi`,
          items: normalized,
        });

        if (!newCurriculumName) {
          setNewCurriculumName("Yangi o‘quv rejasi");
        }

        toast.success(`${normalized.length} ta mavzu aniqlandi`);
        setStep(3);
      } catch {
        toast.error("Matnni tahlil qilishda xatolik");
        setStep(1);
      }
    }, 400);
  };

  // AI-Assisted Structure Extraction for unparsed / messy content
  const handleAiStructureEnhance = async (textToProcess?: string) => {
    const content = textToProcess || unparsedText || rawTextInput;
    if (!content.trim()) {
      toast.error("AI tahlili uchun matn topilmadi");
      return;
    }

    try {
      setIsAiProcessing(true);
      toast.info("AI hujjat tuzilishini tahlil qilmoqda...");

      const res = await parseCurriculumTextWithAIAction(content);
      if (!res.success || !res.data) {
        toast.error(res.error || "AI tahlilida xatolik yuz berdi");
        return;
      }

      const aiItems = res.data.items || [];
      if (aiItems.length === 0) {
        toast.warning("AI yangi mavzular topa olmadi");
        return;
      }

      const nextStartOrder = parsedRows.length > 0
        ? Math.max(...parsedRows.map((r) => r.orderNumber || 1)) + 1
        : 1;

      const normalized = normalizeParsedRows(aiItems, nextStartOrder);
      setParsedRows((prev) => [...prev, ...normalized]);

      if (res.data.courseTitle && !newCurriculumName) {
        setNewCurriculumName(res.data.courseTitle);
      }

      toast.success(`✨ AI ${normalized.length} ta dars mavzusini muvaffaqiyatli aniqladi`);
      setUnparsedText("");
      setShowUnparsed(false);
    } catch (err: any) {
      toast.error(err.message || "AI bilan tahlil qilishda xatolik");
    } finally {
      setIsAiProcessing(false);
    }
  };

  // Drag & Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleAnalyzeFile(files[0]);
    }
  };

  // Row operations
  const handleDeleteRow = (id: string) => {
    setParsedRows((prev) => prev.filter((r) => r.id !== id));
    toast.info("Mavzu ro‘yxatdan o‘chirildi");
  };

  const handleSaveRowEdit = (updated: ParsedRowItem) => {
    setParsedRows((prev) =>
      prev.map((r) => (r.id === updated.id ? { ...updated, status: "valid", errors: [] } : r))
    );
    setEditingRow(null);
    toast.success("Mavzu yangilandi");
  };

  const handleAddNewTopic = () => {
    const nextOrder = parsedRows.length > 0
      ? Math.max(...parsedRows.map((r) => r.orderNumber || 1)) + 1
      : 1;

    const newRow: ParsedRowItem = {
      id: `new-${Date.now()}`,
      orderNumber: nextOrder,
      title: "Yangi dars mavzusi",
      description: "",
      objective: "",
      practice: "",
      homeworkPlan: "",
      durationMinutes: 90,
      status: "valid",
      warnings: [],
      errors: [],
    };

    setParsedRows((prev) => [...prev, newRow]);
    setEditingRow(newRow);
  };

  // KPI Calculations
  const totalCount = parsedRows.length;
  const readyCount = parsedRows.filter((r) => r.status === "valid").length;
  const warningCount = parsedRows.filter((r) => r.status === "warning").length;
  const errorCount = parsedRows.filter((r) => r.status === "error").length;

  // Final Database Import
  const handleFinalImport = async () => {
    if (parsedRows.length === 0) {
      toast.error("Import qilish uchun kamida 1 ta mavzu bo‘lishi kerak");
      return;
    }

    if (errorCount > 0) {
      toast.error("Xatolik mavjud mavzularni to‘g‘rilang yoki o‘chirib tashlang");
      return;
    }

    try {
      setImporting(true);
      let targetId = targetCurriculumId;

      // 1. If "new" mode, create curriculum first
      if (importMode === "new") {
        if (!newCurriculumName.trim()) {
          toast.error("Ish reja nomini kiriting");
          setImporting(false);
          return;
        }

        const createRes = await createCurriculumAction({
          name: newCurriculumName.trim(),
          course_name: newCourseName.trim() || newCurriculumName.trim(),
          group_id: newGroupId || undefined,
          description: parseResult?.detectedDescription || `Fayldan import qilingan o‘quv rejasi (${selectedFile?.name || "matn"})`,
          status: "Faol",
        });

        if (!createRes.success || !createRes.id) {
          toast.error(createRes.error || "Yangi ish reja yaratishda xatolik");
          setImporting(false);
          return;
        }

        targetId = createRes.id;
      }

      if (!targetId) {
        toast.error("Ish reja tanlanmadi");
        setImporting(false);
        return;
      }

      // 2. Prepare payload rows
      const payloadRows: CurriculumImportRow[] = parsedRows.map((r, idx) => ({
        orderNumber: r.orderNumber || idx + 1,
        title: r.title.trim(),
        description: r.description || "",
        objective: r.objective || "",
        practice: r.practice || "",
        homeworkPlan: r.homeworkPlan || "",
        durationMinutes: r.durationMinutes || 90,
        category: r.category || "",
        plannedDate: r.plannedDate,
      }));

      // 3. Bulk insert into Supabase
      const importRes = await bulkImportCurriculumItemsAction(targetId, payloadRows);

      if (!importRes.success) {
        toast.error(importRes.error || "Mavzularni bazaga yozishda xatolik");
        setImporting(false);
        return;
      }

      setImportedCount(importRes.count || payloadRows.length);
      setFinalCurriculumId(targetId);
      setStep(4);
      toast.success(`🎉 ${importRes.count || payloadRows.length} ta dars mavzusi saqlandi!`);

      if (onSuccess) {
        onSuccess(targetId);
      }
    } catch (err: any) {
      toast.error(err.message || "Import jarayonida kutilmagan xatolik");
    } finally {
      setImporting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[780px] max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl border-border bg-card shadow-2xl">
          {/* Header */}
          <DialogHeader className="p-6 pb-4 border-b border-border bg-muted/20">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    <Upload className="w-5 h-5" />
                  </div>
                  <span>📥 Ish rejani fayldan yuklash</span>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Excel (.xlsx, .xls), Word (.docx), PDF (.pdf), CSV yoki matn fayllaridan avtomatik o‘qish
                </DialogDescription>
              </div>

              {/* Download Excel Template button */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadTemplate}
                className="hidden sm:flex items-center gap-1.5 text-xs h-8 rounded-lg border-dashed"
              >
                <Download className="w-3.5 h-3.5 text-emerald-600" />
                <span>Excel namuna olish</span>
              </Button>
            </div>

            {/* Stepper indicator */}
            <div className="flex items-center gap-2 pt-3">
              {[
                { s: 1, label: "Fayl tanlash" },
                { s: 2, label: "Tahlil qilish" },
                { s: 3, label: "Mavzularni tekshirish" },
                { s: 4, label: "Natija" },
              ].map((st) => (
                <div
                  key={st.s}
                  className={`flex-1 flex items-center gap-1.5 py-1 px-2 rounded-lg text-xs font-semibold transition-all ${
                    step === st.s
                      ? "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                      : step > st.s
                      ? "text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/30"
                      : "text-muted-foreground/60 bg-muted/40"
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                      step === st.s
                        ? "bg-blue-600 text-white"
                        : step > st.s
                        ? "bg-emerald-600 text-white"
                        : "bg-muted-foreground/30 text-foreground"
                    }`}
                  >
                    {step > st.s ? <Check className="w-2.5 h-2.5" /> : st.s}
                  </span>
                  <span className="truncate hidden sm:inline">{st.label}</span>
                </div>
              ))}
            </div>
          </DialogHeader>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* ================= STEP 1: FILE PICKER & TABS ================= */}
            {step === 1 && (
              <div className="space-y-4">
                {/* Mode Tabs: Fayl yuklash / Matn joylash */}
                <div className="grid grid-cols-2 p-1 bg-muted/50 rounded-xl border border-border">
                  <button
                    type="button"
                    onClick={() => setTab("file")}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-2 ${
                      tab === "file"
                        ? "bg-card text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                    <span>Fayl tanlash (Excel, Word, PDF, CSV, TXT)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTab("text")}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-2 ${
                      tab === "text"
                        ? "bg-card text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <FileText className="w-4 h-4 text-purple-600" />
                    <span>✍️ Matndan nusxa olib joylash</span>
                  </button>
                </div>

                {tab === "file" ? (
                  <div className="space-y-4">
                    {/* Drag and Drop Zone */}
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`relative border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center transition-all flex flex-col items-center justify-center cursor-pointer select-none ${
                        isDragging
                          ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 scale-[0.99]"
                          : "border-border hover:border-muted-foreground/50 bg-card/60"
                      }`}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept={ACCEPTED_FILE_TYPES_ATTR}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleAnalyzeFile(f);
                        }}
                        style={{ display: "none" }}
                      />

                      <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-3 shadow-inner">
                        <Upload className="w-7 h-7 animate-pulse" />
                      </div>

                      <h3 className="text-base font-semibold text-foreground mb-1">
                        Faylni shu yerga tashlang yoki tanlang
                      </h3>
                      <p className="text-xs text-muted-foreground max-w-sm mb-4">
                        Tizim hujjatdagi barcha dars mavzulari, mazmuni va amaliyotlarini avtomatik
                        aniqlaydi.
                      </p>

                      <Button size="sm" className="rounded-xl gap-2 text-xs">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Fayl tanlash</span>
                      </Button>

                      {/* Format Badges */}
                      <div className="flex flex-wrap items-center justify-center gap-1.5 mt-6 pt-4 border-t border-border/60 w-full max-w-md">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/50">
                          .XLSX
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/50">
                          .XLS
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/50">
                          .DOCX
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200/50">
                          .PDF
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/50">
                          .CSV
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200/50">
                          .TXT
                        </span>
                        <span className="text-[10px] text-muted-foreground ml-1">
                          (Maksimal {MAX_FILE_SIZE_MB} MB)
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Text input mode */
                  <div className="space-y-3">
                    <Label className="text-xs font-semibold">
                      Dars mavzulari ro‘yxatini nusxalab bu yerga joylang:
                    </Label>
                    <Textarea
                      rows={9}
                      placeholder={`1. Kompyuter tuzilishi va operatsion tizim\n2. Internet va raqamli xavfsizlik\n3. Matn muharrirlari bilan ishlash\n4. Algoritmlar va dasturlash asoslari`}
                      value={rawTextInput}
                      onChange={(e) => setRawTextInput(e.target.value)}
                      className="font-mono text-xs leading-relaxed"
                    />
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Har bir darsni yangi qatordan yozing (1. 2. yoki shunchaki mavzu)</span>
                      <Button
                        size="sm"
                        onClick={handleAnalyzeText}
                        disabled={!rawTextInput.trim()}
                        className="text-xs rounded-xl"
                      >
                        <span>Tahlil qilish</span>
                        <ArrowRight className="w-3.5 h-3.5 ml-1" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ================= STEP 2: ANALYZING LOADER ================= */}
            {step === 2 && (
              <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-inner">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-foreground">{loadingStage}</h3>
                  <p className="text-xs text-muted-foreground">
                    Hujjat tuzilishi, jadvallar va mavzular qatorlari tahlil qilinmoqda...
                  </p>
                </div>
              </div>
            )}

            {/* ================= STEP 3: PREVIEW & EDIT ================= */}
            {step === 3 && (
              <div className="space-y-5">
                {/* Document Metadata & Sheet Selector Bar */}
                <div className="p-3.5 rounded-xl bg-muted/40 border border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-card border border-border text-foreground font-semibold flex items-center gap-1.5">
                      <File className="w-4 h-4 text-blue-600" />
                      <span className="truncate max-w-[200px]">{parseResult?.fileName || "Fayl"}</span>
                    </div>
                    <span className="text-muted-foreground uppercase font-bold text-[10px] px-2 py-0.5 rounded bg-muted">
                      {parseResult?.fileType}
                    </span>
                    <span className="text-muted-foreground">
                      {parseResult?.fileSizeFormatted}
                    </span>
                  </div>

                  {/* Multi-sheet selector for Excel */}
                  {parseResult?.sheets && parseResult.sheets.length > 1 && selectedFile && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground">Varaq:</span>
                      <select
                        value={parseResult.selectedSheet}
                        onChange={(e) => handleAnalyzeFile(selectedFile, e.target.value)}
                        className="h-7 px-2 rounded-md border border-input bg-card text-xs font-medium"
                      >
                        {parseResult.sheets.map((sh) => (
                          <option key={sh.name} value={sh.name}>
                            {sh.name} ({sh.rowCount} qator)
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Re-upload or AI button */}
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setStep(1)}
                      className="h-7 px-2 text-xs text-muted-foreground"
                    >
                      Boshqa fayl
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAiStructureEnhance()}
                      disabled={isAiProcessing}
                      className="h-7 px-2.5 text-xs text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/40"
                    >
                      {isAiProcessing ? (
                        <Loader2 className="w-3 h-3 animate-spin mr-1" />
                      ) : (
                        <Sparkles className="w-3 h-3 text-purple-600 mr-1" />
                      )}
                      <span>✨ AI bilan tartiblash</span>
                    </Button>
                  </div>
                </div>

                {/* Scanned PDF warning notice if detected */}
                {parseResult?.isScannedPdf && parsedRows.length === 0 && (
                  <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 space-y-2">
                    <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-xs">
                      <AlertTriangle className="w-4 h-4" />
                      <span>Bu PDF skanerlangan rasm ko‘rinishida</span>
                    </div>
                    <p className="text-xs text-amber-700 dark:text-amber-400">
                      Ushbu PDF faylida standart matn qatlami topilmadi. AI matnni tahlil qilib ko‘rishi
                      mumkin yoki matnni qo‘lda nusxalab qo‘yishingiz mumkin.
                    </p>
                    <Button
                      size="sm"
                      onClick={() => handleAiStructureEnhance(parseResult?.unparsedText)}
                      disabled={isAiProcessing}
                      className="text-xs h-8 bg-amber-600 hover:bg-amber-700 text-white rounded-lg gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>✨ AI yordamida o‘qish</span>
                    </Button>
                  </div>
                )}

                {/* Target Curriculum Configuration */}
                <div className="p-4 rounded-2xl bg-card border border-border space-y-3">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-blue-600" />
                      <span className="text-xs font-bold text-foreground">
                        Qayerga import qilinadi?
                      </span>
                    </div>

                    {/* Mode toggle */}
                    <div className="flex items-center p-1 bg-muted/60 rounded-xl border border-border gap-1">
                      <button
                        type="button"
                        onClick={() => setImportMode("new")}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                          importMode === "new"
                            ? "bg-card text-foreground shadow-xs"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        ➕ Yangi ish reja
                      </button>
                      <button
                        type="button"
                        onClick={() => setImportMode("existing")}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                          importMode === "existing"
                            ? "bg-card text-foreground shadow-xs"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        📌 Mavjud rejaga qo‘shish
                      </button>
                    </div>
                  </div>

                  {importMode === "new" ? (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                      <div className="space-y-1 sm:col-span-2">
                        <Label className="text-[11px] font-semibold text-muted-foreground">
                          Yangi ish reja nomi *
                        </Label>
                        <Input
                          placeholder="Masalan: Frontend Web Dasturlash — 6 oylik"
                          value={newCurriculumName}
                          onChange={(e) => setNewCurriculumName(e.target.value)}
                          className="h-8 text-xs font-medium"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] font-semibold text-muted-foreground">
                          Guruh (ixtiyoriy)
                        </Label>
                        <select
                          value={newGroupId}
                          onChange={(e) => setNewGroupId(e.target.value)}
                          className="w-full h-8 px-2.5 rounded-md border border-input bg-background text-xs font-medium"
                        >
                          <option value="">Umumiy o‘quv dasturi</option>
                          {groupsList.map((g) => (
                            <option key={g.id} value={g.id}>
                              {g.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1 pt-1">
                      <Label className="text-[11px] font-semibold text-muted-foreground">
                        Mavjud ish rejasini tanlang *
                      </Label>
                      <select
                        value={targetCurriculumId}
                        onChange={(e) => setTargetCurriculumId(e.target.value)}
                        className="w-full h-8 px-2.5 rounded-md border border-input bg-background text-xs font-medium"
                      >
                        {curriculaList.length === 0 ? (
                          <option value="">Faol ish reja mavjud emas</option>
                        ) : (
                          curriculaList.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name} ({c.items_count || 0} ta mavzu mavjud)
                            </option>
                          ))
                        )}
                      </select>
                    </div>
                  )}
                </div>

                {/* KPI Summary Bar */}
                <div className="grid grid-cols-4 gap-2">
                  <div className="p-2.5 rounded-xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 text-center">
                    <span className="text-muted-foreground block text-[10px] font-semibold">
                      Jami topildi
                    </span>
                    <span className="font-bold text-base text-blue-700 dark:text-blue-300">
                      {totalCount}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 text-center">
                    <span className="text-muted-foreground block text-[10px] font-semibold">
                      Tayyor
                    </span>
                    <span className="font-bold text-base text-emerald-700 dark:text-emerald-300">
                      {readyCount}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-amber-50/50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/40 text-center">
                    <span className="text-muted-foreground block text-[10px] font-semibold">
                      Ogohlantirish
                    </span>
                    <span className="font-bold text-base text-amber-700 dark:text-amber-300">
                      {warningCount}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-rose-50/50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/40 text-center">
                    <span className="text-muted-foreground block text-[10px] font-semibold">
                      Xatolik
                    </span>
                    <span className="font-bold text-base text-rose-700 dark:text-rose-300">
                      {errorCount}
                    </span>
                  </div>
                </div>

                {/* Items List Header */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs font-bold text-foreground">
                    Dars mavzulari ({parsedRows.length} ta)
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAddNewTopic}
                    className="h-7 px-2.5 text-xs rounded-lg gap-1 border-dashed"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Mavzu qo‘shish</span>
                  </Button>
                </div>

                {/* Items Scrollable List */}
                <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                  {parsedRows.length === 0 ? (
                    <div className="p-6 text-center text-xs text-muted-foreground bg-muted/20 rounded-xl border border-dashed border-border">
                      Hozircha hech qanday mavzu aniqlanmadi.
                    </div>
                  ) : (
                    parsedRows.map((row, idx) => (
                      <div
                        key={row.id}
                        className={`p-3 rounded-xl border transition-all text-xs flex items-start justify-between gap-3 ${
                          row.status === "error"
                            ? "bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50"
                            : row.status === "warning"
                            ? "bg-amber-50/40 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50"
                            : "bg-card border-border hover:border-muted-foreground/40"
                        }`}
                      >
                        <div className="flex items-start gap-2.5 flex-1 min-w-0">
                          <span className="font-mono font-bold text-muted-foreground w-6 pt-0.5 text-right shrink-0">
                            №{row.orderNumber || idx + 1}
                          </span>

                          <div className="space-y-1 flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-semibold text-foreground text-xs leading-snug">
                                {row.title}
                              </h4>
                              {row.durationMinutes && (
                                <span className="text-[10px] text-muted-foreground font-mono">
                                  ({row.durationMinutes} daq)
                                </span>
                              )}
                            </div>

                            {/* Details preview */}
                            {(row.objective || row.description || row.practice) && (
                              <p className="text-[11px] text-muted-foreground line-clamp-1">
                                {row.objective || row.description || row.practice}
                              </p>
                            )}

                            {/* Warnings/Errors tags */}
                            {row.warnings.map((w, i) => (
                              <span
                                key={i}
                                className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-100/60 dark:bg-amber-950/60 px-1.5 py-0.2 rounded mr-1"
                              >
                                <AlertTriangle className="w-2.5 h-2.5" />
                                {w}
                              </span>
                            ))}
                            {row.errors.map((e, i) => (
                              <span
                                key={i}
                                className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-700 dark:text-rose-300 bg-rose-100/60 dark:bg-rose-950/60 px-1.5 py-0.2 rounded mr-1"
                              >
                                <XCircle className="w-2.5 h-2.5" />
                                {e}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingRow(row)}
                            className="h-7 w-7 p-0 rounded-lg text-muted-foreground hover:text-foreground"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteRow(row.id)}
                            className="h-7 w-7 p-0 rounded-lg text-muted-foreground hover:text-rose-600"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Collapsible Unparsed Text Area */}
                {unparsedText && (
                  <div className="rounded-xl border border-border overflow-hidden text-xs">
                    <button
                      type="button"
                      onClick={() => setShowUnparsed(!showUnparsed)}
                      className="w-full p-2.5 bg-muted/40 hover:bg-muted/60 flex items-center justify-between font-semibold text-muted-foreground"
                    >
                      <div className="flex items-center gap-1.5">
                        <Info className="w-3.5 h-3.5" />
                        <span>Aniqlanmagan qo‘shimcha matn (ko‘rish)</span>
                      </div>
                      {showUnparsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    {showUnparsed && (
                      <div className="p-3 bg-card space-y-2 border-t border-border">
                        <pre className="text-[11px] font-mono text-muted-foreground max-h-24 overflow-y-auto whitespace-pre-wrap">
                          {unparsedText}
                        </pre>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAiStructureEnhance(unparsedText)}
                          disabled={isAiProcessing}
                          className="h-7 text-xs rounded-lg gap-1.5"
                        >
                          <Sparkles className="w-3 h-3 text-purple-600" />
                          <span>✨ Ushbu qismini AI bilan tartiblash</span>
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ================= STEP 4: IMPORT COMPLETED ================= */}
            {step === 4 && (
              <div className="py-8 flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-inner">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-foreground">Import muvaffaqiyatli yakunlandi!</h3>
                  <p className="text-xs text-muted-foreground max-w-sm">
                    <strong className="text-foreground">{importedCount} ta</strong> dars mavzusi ish
                    rejasiga muvaffaqiyatli saqlandi.
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <Button
                    onClick={() => {
                      onOpenChange(false);
                      if (finalCurriculumId) {
                        router.push(`/curriculum/${finalCurriculumId}`);
                      }
                    }}
                    className="rounded-xl gap-2 text-xs"
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>Ish rejani ochish</span>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    className="rounded-xl text-xs"
                  >
                    Yopish
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          {step === 3 && (
            <DialogFooter className="p-4 border-t border-border bg-muted/20 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStep(1)}
                className="text-xs rounded-xl"
              >
                Orqaga
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onOpenChange(false)}
                  className="text-xs rounded-xl"
                >
                  Bekor qilish
                </Button>
                <Button
                  size="sm"
                  onClick={handleFinalImport}
                  disabled={importing || parsedRows.length === 0 || errorCount > 0}
                  className="text-xs rounded-xl gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {importing ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  <span>Import qilish ({parsedRows.length} ta mavzu)</span>
                </Button>
              </div>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Row Edit Modal */}
      {editingRow && (
        <Dialog open={!!editingRow} onOpenChange={() => setEditingRow(null)}>
          <DialogContent className="sm:max-w-[500px] p-6 space-y-4 rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-base font-bold">
                Mavzuni tahrirlash (№{editingRow.orderNumber})
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold">Mavzu nomi *</Label>
                <Input
                  value={editingRow.title}
                  onChange={(e) => setEditingRow({ ...editingRow, title: e.target.value })}
                  className="h-8 text-xs font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold">Dars raqami</Label>
                  <Input
                    type="number"
                    value={editingRow.orderNumber || 1}
                    onChange={(e) =>
                      setEditingRow({ ...editingRow, orderNumber: parseInt(e.target.value, 10) || 1 })
                    }
                    className="h-8 text-xs font-medium"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold">Davomiyligi (daqiqa)</Label>
                  <Input
                    type="number"
                    value={editingRow.durationMinutes || 90}
                    onChange={(e) =>
                      setEditingRow({
                        ...editingRow,
                        durationMinutes: parseInt(e.target.value, 10) || 90,
                      })
                    }
                    className="h-8 text-xs font-medium"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-semibold">Dars maqsadi</Label>
                <Input
                  value={editingRow.objective || ""}
                  onChange={(e) => setEditingRow({ ...editingRow, objective: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-semibold">Asosiy mazmun / Nazariya</Label>
                <Textarea
                  rows={2}
                  value={editingRow.description || ""}
                  onChange={(e) => setEditingRow({ ...editingRow, description: e.target.value })}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-semibold">Amaliy mashg‘ulot</Label>
                <Input
                  value={editingRow.practice || ""}
                  onChange={(e) => setEditingRow({ ...editingRow, practice: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-semibold">Uyga vazifa rejasi</Label>
                <Input
                  value={editingRow.homeworkPlan || ""}
                  onChange={(e) => setEditingRow({ ...editingRow, homeworkPlan: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <DialogFooter className="pt-2 flex items-center justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditingRow(null)}
                className="text-xs"
              >
                Bekor qilish
              </Button>
              <Button
                size="sm"
                onClick={() => handleSaveRowEdit(editingRow)}
                className="text-xs rounded-xl"
              >
                Saqlash
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
