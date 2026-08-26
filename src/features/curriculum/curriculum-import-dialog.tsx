"use client";

import * as React from "react";
import {
  CurriculumImportPreview,
  CurriculumImportRow,
} from "@/types/curriculum";
import {
  generateCurriculumExcelTemplate,
  parseExcelCurriculumFile,
  parseBulkTextCurriculum,
} from "@/lib/curriculum-import";
import { bulkImportCurriculumItemsAction } from "@/actions/curriculum";
import { Button } from "@/components/ui/button";
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
} from "lucide-react";
import { toast } from "sonner";

interface CurriculumImportDialogProps {
  curriculumId: string;
  curriculumName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CurriculumImportDialog({
  curriculumId,
  curriculumName,
  open,
  onOpenChange,
  onSuccess,
}: CurriculumImportDialogProps) {
  const [tab, setTab] = React.useState<"excel" | "text">("excel");
  const [file, setFile] = React.useState<File | null>(null);
  const [textInput, setTextInput] = React.useState<string>("");

  const [preview, setPreview] = React.useState<CurriculumImportPreview | null>(null);
  const [previewLoading, setPreviewLoading] = React.useState(false);
  const [importLoading, setImportLoading] = React.useState(false);

  // Download template handler
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

  // Parse Excel File
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    setFile(selectedFile);
    setPreviewLoading(true);

    try {
      const buffer = await selectedFile.arrayBuffer();
      const result = parseExcelCurriculumFile(buffer);
      setPreview(result);
      if (result.validRows.length === 0 && result.warningRows.length === 0) {
        toast.error("Faylda to‘g‘ri ma'lumotlar topilmadi");
      }
    } catch {
      toast.error("Excel faylni o‘qib bo‘lmadi");
      setPreview(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  // Parse Bulk Text
  const handleParseText = () => {
    if (!textInput.trim()) {
      toast.error("Iltimos, matnni kiriting");
      return;
    }
    const rows = parseBulkTextCurriculum(textInput);
    if (rows.length === 0) {
      toast.error("Hech qanday mavzu aniqlanmadi");
      return;
    }

    setPreview({
      totalRows: rows.length,
      validRows: rows,
      warningRows: [],
      invalidRows: [],
    });
  };

  // Perform Import
  const handleImport = async () => {
    if (!preview) return;
    const allRowsToImport = [
      ...preview.validRows,
      ...preview.warningRows.map((w) => w.row),
    ];

    if (allRowsToImport.length === 0) {
      toast.error("Import qilish uchun yaroqli qatorlar yo‘q");
      return;
    }

    setImportLoading(true);
    try {
      const res = await bulkImportCurriculumItemsAction(curriculumId, allRowsToImport);
      if (res.success) {
        toast.success(`✨ ${res.count} ta mavzu muvaffaqiyatli import qilindi!`);
        onOpenChange(false);
        setFile(null);
        setTextInput("");
        setPreview(null);
        onSuccess();
      } else {
        toast.error(res.error || "Import qilishda xatolik yuz berdi");
      }
    } catch {
      toast.error("Kutilmagan xatolik");
    } finally {
      setImportLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-4 sm:p-6 overflow-hidden">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
            <Upload className="w-5 h-5 text-blue-600" />
            <span>Mavzularni yuklash — {curriculumName}</span>
          </DialogTitle>
          <DialogDescription className="text-xs">
            Excel fayl orqali yoki matndan nusxa olib o‘quv rejasiga mavzularni bir vaqtda qo‘shing.
          </DialogDescription>
        </DialogHeader>

        {/* Source Mode Tabs */}
        <div className="flex items-center gap-2 border-b border-border pb-2">
          <button
            type="button"
            onClick={() => {
              setTab("excel");
              setPreview(null);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              tab === "excel"
                ? "bg-blue-600 text-white"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Excel (.xlsx) orqali</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setTab("text");
              setPreview(null);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              tab === "text"
                ? "bg-blue-600 text-white"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Matndan (Ro‘yxat)</span>
          </button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleDownloadTemplate}
            className="ml-auto text-xs h-7 gap-1 text-blue-600 dark:text-blue-400"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Namuna (.xlsx)</span>
          </Button>
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto space-y-4 py-2">
          {tab === "excel" ? (
            <div className="space-y-3">
              <label
                htmlFor="curriculum-excel-upload"
                className="border-2 border-dashed border-border hover:border-blue-500 rounded-2xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer bg-muted/20 hover:bg-muted/40 transition-all text-center"
              >
                <FileSpreadsheet className="w-10 h-10 text-blue-600" />
                <p className="text-xs font-bold text-foreground">
                  {file ? file.name : "Excel faylni tanlang yoki shu yerga tashlang"}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  .xlsx va .csv formatlar qo‘llab-quvvatlanadi
                </p>
                <input
                  id="curriculum-excel-upload"
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>
          ) : (
            <div className="space-y-2">
              <Label className="text-xs font-semibold">
                Mavzular ro‘yxatini joylashtiring (Har bir qator 1 ta mavzu):
              </Label>
              <Textarea
                placeholder={`1. Kompyuter bilan tanishish\n2. Fayllar va papkalar\n3. Telegram Desktop sozlash\n4. Terminal buyruqlari...`}
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                rows={6}
                className="text-xs font-mono"
              />
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={handleParseText}
                className="w-full text-xs h-8"
              >
                Qatorlarni tahlil qilish (Tekshirish)
              </Button>
            </div>
          )}

          {/* Loading Indicator */}
          {previewLoading && (
            <div className="p-6 flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              <p className="text-xs">Fayl tahlil qilinmoqda...</p>
            </div>
          )}

          {/* Preview State */}
          {preview && (
            <div className="space-y-3 animate-in fade-in">
              {/* Stat Summary */}
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-300">
                  <div className="flex items-center justify-center gap-1 font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{preview.validRows.length} ta</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Yaroqli</p>
                </div>

                <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-amber-800 dark:text-amber-300">
                  <div className="flex items-center justify-center gap-1 font-bold">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>{preview.warningRows.length} ta</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Ogohlantirish</p>
                </div>

                <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-rose-800 dark:text-rose-300">
                  <div className="flex items-center justify-center gap-1 font-bold">
                    <XCircle className="w-3.5 h-3.5" />
                    <span>{preview.invalidRows.length} ta</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Xato (tashlab ketiladi)</p>
                </div>
              </div>

              {/* Preview Rows List */}
              <div className="space-y-1.5 max-h-48 overflow-y-auto border border-border rounded-xl p-2 bg-muted/20">
                {[...preview.validRows, ...preview.warningRows.map((w) => w.row)]
                  .slice(0, 50)
                  .map((r, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded-lg bg-card border border-border text-xs flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                          {r.orderNumber || idx + 1}
                        </span>
                        <span className="font-semibold text-foreground truncate">
                          {r.title}
                        </span>
                      </div>
                      {r.category && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground shrink-0">
                          {r.category}
                        </span>
                      )}
                    </div>
                  ))}
                {preview.totalRows > 50 && (
                  <p className="text-center text-[11px] text-muted-foreground py-1">
                    ... va yana {preview.totalRows - 50} ta mavzu
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={importLoading}
          >
            Bekor qilish
          </Button>

          <Button
            type="button"
            onClick={handleImport}
            disabled={
              importLoading ||
              !preview ||
              (preview.validRows.length === 0 && preview.warningRows.length === 0)
            }
            className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
          >
            {importLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Layers className="w-4 h-4" />
            )}
            <span>
              {preview
                ? `${preview.validRows.length + preview.warningRows.length} ta mavzuni yuklash`
                : "Import qilish"}
            </span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
