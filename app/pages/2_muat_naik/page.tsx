"use client";

import { ChangeEvent, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Icon from "@/app/components/Icon/Icon";
import { ROUTES } from "../../constants/routes";
import CategoryTabs from "./components/CategoryTabs";
import DemoDocumentButton from "./components/DemoDocumentButton";
import ParsingModeTabs from "./components/ParsingModeTabs";
import ProcessingQueueTable from "./components/ProcessingQueueTable";
import UploadDropzone from "./components/UploadDropzone";
import {
  categoryByDraftKind,
  draftKindByCategory,
  reviewRoutes,
} from "./components/constants";
import {
  type ExtractResult,
  type ProcessingDraft,
  type ProcessingDraftSummary,
} from "./components/extract-review-shared";
import type { Category, ParsingMode } from "./components/types";

function getCategoryFromParam(categoryParam: string | null): Category {
  if (!categoryParam) {
    return "Bayaran";
  }

  return categoryByDraftKind[categoryParam as ProcessingDraft["kind"]] ?? "Bayaran";
}

const uploadRouteByKind: Record<ProcessingDraft["kind"], string> = {
  bayaran: "/api/uploaded-documents/bayaran/upload",
  tunggakan: "/api/uploaded-documents/tunggakan/upload",
  penghuni: "/api/uploaded-documents/penghuni/upload",
  kuarters: "/api/uploaded-documents/kuarters/upload",
};

export default function MuatNaikPage() {
  return (
    <Suspense fallback={<MuatNaikPageFallback />}>
      <MuatNaikPageContent />
    </Suspense>
  );
}

function MuatNaikPageFallback() {
  return (
    <div className="flex min-h-[calc(100vh-120px)] items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#D9E1F3] border-t-dark-blue" />
    </div>
  );
}

function MuatNaikPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeCategory, setActiveCategory] = useState<Category>(() =>
    getCategoryFromParam(searchParams.get("kategori")),
  );
  const [parsingMode, setParsingMode] = useState<ParsingMode>("strict");
  const [tunggakanDate, setTunggakanDate] = useState("");
  const [selectedFileName, setSelectedFileName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState("");
  const [processingError, setProcessingError] = useState("");
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingStage, setProcessingStage] = useState("");
  const [processingDrafts, setProcessingDrafts] = useState<ProcessingDraftSummary[]>(
    [],
  );
  const [isLoadingQueue, setIsLoadingQueue] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const today = startOfDay(new Date());
  const activeDraftKind = draftKindByCategory[activeCategory];
  const activeRows = useMemo(
    () =>
      activeDraftKind
        ? processingDrafts.filter((draft) => draft.kind === activeDraftKind)
        : [],
    [activeDraftKind, processingDrafts],
  );

  // Load processing drafts when active category changes or on initial mount
  useEffect(() => {
    async function loadProcessingDrafts() {
      if (!activeDraftKind) {
        setProcessingDrafts([]);
        return;
      }

      setIsLoadingQueue(true);

      try {
        const category = activeDraftKind.toUpperCase();
        const response = await fetch(`/api/uploaded-documents?category=${category}`);
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result?.message ?? "Gagal mendapatkan barisan pemprosesan.");
        }

        setProcessingDrafts(result.data?.documents ?? []);
      } catch (error) {
        setProcessingError(
          error instanceof Error
            ? error.message
            : "Gagal mendapatkan barisan pemprosesan.",
        );
        setProcessingDrafts([]);
      } finally {
        setIsLoadingQueue(false);
      }
    }

    void loadProcessingDrafts();
  }, [activeDraftKind]);

  // Cleanup on component unmount - abort any ongoing processing
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  // Handler for file selection button click
  function handleChooseFile() {
    fileInputRef.current?.click();
  }

  // Handler for file input change event
  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setSelectedFileName(file?.name ?? "");
    setSelectedFile(file ?? null);
    setProcessingError("");
    setProcessingProgress(0);
    setProcessingStage("");
  }

  function handleClearSelectedFile() {
    setSelectedFileName("");
    setSelectedFile(null);
    setProcessingError("");
    setProcessingProgress(0);
    setProcessingStage("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  // Handler for upload button click - initiates file processing
  async function handleUploadAction() {
    const extractKind = reviewRoutes[activeCategory];

    if (extractKind === "tunggakan" && !tunggakanDate) {
      setProcessingError("Sila pilih tarikh tunggakan sebelum muat naik fail.");
      return;
    }

    if (extractKind === "tunggakan" && isDateAfter(tunggakanDate, today)) {
      setProcessingError("Tarikh tunggakan tidak boleh melebihi tarikh hari ini.");
      return;
    }

    if (!selectedFile) {
      handleChooseFile();
      return;
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    setIsProcessing(true);
    setProcessingStep("Mengekstrak data daripada dokumen...");
    setProcessingError("");
    setProcessingProgress(8);
    setProcessingStage("Menyediakan fail untuk kenal pasti...");

    const progressTimer = window.setInterval(() => {
      setProcessingProgress((currentProgress) => {
        if (currentProgress >= 99) {
          return currentProgress;
        }

        return currentProgress + (currentProgress < 55 ? 4 : 2);
      });
    }, 700);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("parsingMode", parsingMode);

      setProcessingProgress(18);
      setProcessingStage(`Mengekstrak data ${extractKind}...`);
      const response = await fetch(`/api/extract/${extractKind}`, {
        method: "POST",
        body: formData,
        signal: abortController.signal,
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        throw new Error(
          errorBody?.message ?? `Gagal mengekstrak data ${extractKind}.`,
        );
      }

      const extractionResult = await response.json();
      const extractedData = extractionResult.data?.extractResult;
      if (!extractedData) {
        throw new Error(`Gagal mengekstrak data ${extractKind}.`);
      }

      const extractResultToSave: ExtractResult =
        extractKind === "tunggakan" && extractedData.documentType === "tunggakan"
          ? { ...extractedData, lastUpdatedMonth: tunggakanDate }
          : (extractedData as ExtractResult);

      const saveResponse = await fetch(uploadRouteByKind[extractKind], {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileName: selectedFile.name,
          fileType: selectedFile.type || selectedFile.name.split(".").pop() || "file",
          fileSize: selectedFile.size,
          extractResult: extractResultToSave,
        }),
        signal: abortController.signal,
      });
      const saveResult = await saveResponse.json();

      if (!saveResponse.ok || !saveResult.data?.document) {
        throw new Error(
          saveResult?.message ?? "Gagal menyimpan dokumen ke pangkalan data.",
        );
      }

      const draft = saveResult.data.document as ProcessingDraft;
      setProcessingProgress(96);
      setProcessingStage("Membuka halaman semakan...");
      setProcessingDrafts((currentDrafts) => [draft, ...currentDrafts]);
      router.push(
        `${ROUTES.muatNaik}/semakan/${extractKind}?draftId=${encodeURIComponent(draft.id)}`,
      );
    } catch (error) {
      const extractKind = reviewRoutes[activeCategory];
      if (error instanceof DOMException && error.name === "AbortError") {
        setProcessingError("Proses kenal pasti telah dibatalkan.");
        setProcessingStage("");
        setProcessingProgress(0);
        return;
      }

      setProcessingError(
        error instanceof Error
          ? error.message
          : `Gagal mengekstrak data ${extractKind}.`,
      );
    } finally {
      window.clearInterval(progressTimer);
      abortControllerRef.current = null;
      setIsProcessing(false);
      setProcessingStep("");
    }
  }

  function handleCancelProcessing() {
    abortControllerRef.current?.abort();
  }

  function handleContinueDraft(draft: ProcessingDraftSummary) {
    router.push(
      `${ROUTES.muatNaik}/semakan/${draft.kind}?draftId=${encodeURIComponent(draft.id)}`,
    );
  }

  async function handleDeleteDraft(draftId: string) {
    const response = await fetch(`/api/uploaded-documents/${draftId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const result = await response.json().catch(() => null);
      setProcessingError(result?.message ?? "Gagal memadam dokumen.");
      return;
    }

    setProcessingDrafts((currentDrafts) =>
      currentDrafts.filter((draft) => draft.id !== draftId),
    );
  }

  return (
    <section className="min-h-full bg-background">
      <div className="flex w-full flex-col gap-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-1">
            <h1 className="text-[30px] font-extrabold leading-tight text-[#07162F]">
              Muat Naik Document
            </h1>
            <p className="text-[15px] font-medium text-[#667085]">
              Sila muat naik fail untuk pemprosesan maklumat sistem.
            </p>
          </div>

          <DemoDocumentButton activeCategory={activeCategory} />
        </div>

        <CategoryTabs
          activeCategory={activeCategory}
          disabled={isProcessing}
          onCategoryChange={setActiveCategory}
          rightContent={
            <ParsingModeTabs
              value={parsingMode}
              disabled={isProcessing}
              onChange={setParsingMode}
            />
          }
        />

        {activeDraftKind === "tunggakan" ? (
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#DCE2F1] bg-white px-5 py-4 shadow-sm">
            <div className="min-w-0">
              <p className="text-sm font-extrabold text-[#07162F]">
                Tarikh Tunggakan
              </p>
              <p className="mt-1 text-xs font-semibold text-[#667085]">
                Pilih tarikh rujukan tunggakan sebelum memproses fail.
              </p>
            </div>
            <DatePickerField
              label="Tarikh Tunggakan"
              value={tunggakanDate}
              maxDate={today}
              disabled={isProcessing}
              onChange={(value) => {
                setTunggakanDate(value);
                setProcessingError("");
              }}
            />
          </div>
        ) : null}

        <UploadDropzone
          fileInputRef={fileInputRef}
          selectedFileName={selectedFileName}
          isProcessing={isProcessing}
          processingStep={processingStep}
          processingStage={processingStage}
          processingProgress={processingProgress}
          processingError={processingError}
          onFileChange={handleFileChange}
          onUploadAction={handleUploadAction}
          onClearSelectedFile={handleClearSelectedFile}
          onCancelProcessing={handleCancelProcessing}
        />

        <ProcessingQueueTable
          activeCategory={activeCategory}
          rows={activeRows}
          isLoading={isLoadingQueue}
          onContinueDraft={handleContinueDraft}
          onDeleteDraft={handleDeleteDraft}
        />
      </div>
    </section>
  );
}

function DatePickerField({
  label,
  value,
  maxDate,
  disabled = false,
  onChange,
}: {
  label: string;
  value: string;
  maxDate?: Date;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  const initialDate = parseDateInput(value);
  const normalizedMaxDate = maxDate ? startOfDay(maxDate) : null;
  const [isOpen, setIsOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(
    initialDate ?? startOfDay(new Date()),
  );
  const days = buildCalendarDays(visibleMonth);
  const nextMonth = addMonths(visibleMonth, 1);
  const isNextMonthDisabled =
    normalizedMaxDate &&
    new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 1) >
      new Date(
        normalizedMaxDate.getFullYear(),
        normalizedMaxDate.getMonth(),
        1,
      );

  return (
    <label className="block w-full sm:w-72">
      <span className="mb-2 block text-xs font-extrabold uppercase tracking-[0.18em] text-grey">
        {label}
      </span>
      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          className={`flex min-h-11 w-full items-center gap-3 rounded-2xl border bg-white py-2 pl-3 pr-4 text-left text-sm font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_3px_10px_rgba(15,23,42,0.04)] outline-none transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
            isOpen
              ? "border-dark-blue text-dark-blue"
              : "border-light-grey/25 text-dark-grey hover:border-dark-blue/30"
          }`}
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          onClick={() => setIsOpen((currentState) => !currentState)}
        >
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-xl bg-light-blue text-dark-blue">
            <Icon icon="calendar_month" size={17} />
          </span>
          <span className={value ? "truncate" : "truncate text-grey"}>
            {value ? formatDateLabel(value) : "Pilih tarikh"}
          </span>
        </button>

        {isOpen ? (
          <div
            className="absolute right-0 top-full z-40 mt-2 w-72 rounded-3xl border border-light-grey/20 bg-white p-3 shadow-[0_18px_45px_rgba(13,47,86,0.16)]"
            role="dialog"
            aria-label={`Pilih ${label}`}
          >
            <div className="mb-3 flex items-center justify-between">
              <button
                type="button"
                className="grid h-9 w-9 place-items-center rounded-xl text-grey transition-colors hover:bg-light-blue hover:text-dark-blue"
                aria-label="Bulan sebelumnya"
                onClick={() =>
                  setVisibleMonth((currentDate) => addMonths(currentDate, -1))
                }
              >
                <Icon icon="chevron_left" size={20} />
              </button>
              <div className="text-sm font-extrabold text-dark-grey">
                {formatMonthLabel(visibleMonth)}
              </div>
              <button
                type="button"
                disabled={Boolean(isNextMonthDisabled)}
                className="grid h-9 w-9 place-items-center rounded-xl text-grey transition-colors hover:bg-light-blue hover:text-dark-blue disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-grey"
                aria-label="Bulan seterusnya"
                onClick={() =>
                  setVisibleMonth((currentDate) => addMonths(currentDate, 1))
                }
              >
                <Icon icon="chevron_right" size={20} />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-extrabold uppercase tracking-[0.12em] text-grey">
              {["A", "I", "S", "R", "K", "J", "S"].map((dayLabel, index) => (
                <div key={`${dayLabel}-${index}`} className="py-1.5">
                  {dayLabel}
                </div>
              ))}
            </div>

            <div className="mt-1 grid grid-cols-7 gap-1">
              {days.map((day) => {
                const dayValue = formatDateInput(day.date);
                const isSelected = dayValue === value;
                const isVisibleMonth =
                  day.date.getMonth() === visibleMonth.getMonth();
                const isDisabled = normalizedMaxDate
                  ? startOfDay(day.date) > normalizedMaxDate
                  : false;

                return (
                  <button
                    key={dayValue}
                    type="button"
                    disabled={isDisabled}
                    className={`grid h-9 place-items-center rounded-xl text-sm font-bold transition-colors ${
                      isDisabled
                        ? "cursor-not-allowed text-light-grey/60"
                        : isSelected
                        ? "bg-dark-blue text-white"
                        : isVisibleMonth
                          ? "text-dark-grey hover:bg-light-blue hover:text-dark-blue"
                          : "text-light-grey hover:bg-light-blue"
                    }`}
                    onClick={() => {
                      if (isDisabled) {
                        return;
                      }

                      onChange(dayValue);
                      setIsOpen(false);
                    }}
                  >
                    {day.date.getDate()}
                  </button>
                );
              })}
            </div>

            {value ? (
              <button
                type="button"
                className="mt-3 w-full rounded-xl border border-light-grey/25 px-3 py-2 text-sm font-semibold text-grey transition-colors hover:border-dark-blue hover:text-dark-blue"
                onClick={() => {
                  onChange("");
                  setIsOpen(false);
                }}
              >
                Kosongkan tarikh
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </label>
  );
}

function parseDateInput(value: string | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const date = new Date(`${value}T00:00:00`);

  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function buildCalendarDays(monthDate: Date) {
  const firstDayOfMonth = new Date(
    monthDate.getFullYear(),
    monthDate.getMonth(),
    1,
  );
  const firstCalendarDate = new Date(firstDayOfMonth);
  firstCalendarDate.setDate(
    firstCalendarDate.getDate() - firstCalendarDate.getDay(),
  );

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(firstCalendarDate);
    date.setDate(firstCalendarDate.getDate() + index);

    return { date };
  });
}

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function isDateAfter(value: string, maxDate: Date) {
  const date = parseDateInput(value);

  return Boolean(date && startOfDay(date) > startOfDay(maxDate));
}

function formatDateLabel(value: string) {
  const date = parseDateInput(value);

  if (!date) {
    return value;
  }

  return new Intl.DateTimeFormat("ms-MY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatMonthLabel(date: Date) {
  return new Intl.DateTimeFormat("ms-MY", {
    month: "long",
    year: "numeric",
  }).format(date);
}
