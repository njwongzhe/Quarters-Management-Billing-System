"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ROUTES } from "@/app/constants/routes";
import CategoryTabs from "./CategoryTabs";
import DemoDocumentButton from "./DemoDocumentButton";
import ParsingModeTabs from "./ParsingModeTabs";
import ProcessingQueueTable from "./ProcessingQueueTable";
import { DateField } from "@/app/components/InputField";
import UploadDropzone from "./UploadDropzone";
import AiServiceStatus from "./AiServiceStatus";
import {
  reviewRoutes,
} from "./constants";
import {
  type ProcessingDraftSummary,
} from "./extract-review-shared";
import type { Category, ParsingMode } from "./types";

export default function MuatNaikPageClient({
  initialCategory,
  initialDrafts,
}: {
  initialCategory: Category;
  initialDrafts: ProcessingDraftSummary[];
}) {
  const router = useRouter();
  const [activeCategory, setActiveCategory] =
    useState<Category>(initialCategory);
  const [parsingMode, setParsingMode] = useState<ParsingMode>("strict");
  const [tunggakanDate, setTunggakanDate] = useState("");
  const [selectedFileName, setSelectedFileName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState("");
  const [processingError, setProcessingError] = useState("");
  const [processingProgress, setProcessingProgress] = useState<number | null>(0);
  const [processingStage, setProcessingStage] = useState("");
  const [processingDrafts, setProcessingDrafts] = useState<ProcessingDraftSummary[]>(
    initialDrafts,
  );
  const [isLoadingQueue, setIsLoadingQueue] = useState(false);
  const shouldSkipInitialQueueFetchRef = useRef(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const today = startOfDay(new Date());
  // activeDraftKind resolves the current category to its API kind (e.g. "bayaran", "tunggakan")
  const activeDraftKind = reviewRoutes[activeCategory];
  // Only show drafts that match the active category kind
  const activeRows = useMemo(
    () => processingDrafts.filter((draft) => draft.kind === activeDraftKind),
    [activeDraftKind, processingDrafts],
  );

  // Load processing drafts when active category changes or on initial mount
  useEffect(() => {
    if (shouldSkipInitialQueueFetchRef.current) {
      shouldSkipInitialQueueFetchRef.current = false;
      return;
    }

    async function loadProcessingDrafts() {
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
    setProcessingStep("Memuat naik dokumen...");
    setProcessingError("");
    setProcessingProgress(0);
    setProcessingStage("Menghantar fail ke pelayan...");

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("parsingMode", parsingMode);
      formData.append("createDraft", "true");

      if (extractKind === "tunggakan") {
        formData.append("tunggakanDate", tunggakanDate);
      }

      const { status, body: uploadResult } = await uploadDocumentWithProgress({
        url: `/api/extract/${extractKind}`,
        formData,
        signal: abortController.signal,
        onUploadProgress(progress) {
          setProcessingProgress(progress);
          setProcessingStage(
            progress < 100
              ? "Menghantar fail ke pelayan..."
              : "Fail selesai dimuat naik.",
          );
        },
        onUploadComplete() {
          setProcessingProgress(null);
          setProcessingStep("Mengekstrak data daripada dokumen...");
          setProcessingStage(`Mengekstrak dan menyimpan data ${extractKind}...`);
        },
      });

      if (status < 200 || status >= 300) {
        throw new Error(
          uploadResult?.message ?? `Gagal memproses data ${extractKind}.`,
        );
      }

      if (!uploadResult?.data?.document) {
        throw new Error(
          uploadResult?.message ?? "Gagal menyimpan dokumen ke pangkalan data.",
        );
      }

      const draft = uploadResult.data.document as ProcessingDraftSummary;
      setProcessingProgress(100);
      setProcessingStep("Dokumen selesai diproses.");
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
      <div className="flex w-full flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex flex-wrap items-center justify-center gap-3">
              <h1 className="text-2xl font-extrabold leading-9 tracking-tight text-content">
                Muat Naik Document
              </h1>
              <AiServiceStatus />
            </div>
            <p className="text-sm font-extralight text-grey/70">
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
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-surface px-5 py-4 shadow-sm">
            <div className="min-w-0">
              <p className="text-md font-bold text-content">
                Tarikh Tunggakan
              </p>
              <p className="text-xs text-grey">
                Pilih tarikh rujukan tunggakan sebelum memproses fail.
              </p>
            </div>
            <DateField
              showLabel={false}
              label="Tarikh Tunggakan"
              value={tunggakanDate}
              maxDate={formatDateInput(today)}
              state={isProcessing ? "inactive" : "active"}
              className="w-full sm:w-72"
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

function uploadDocumentWithProgress({
  url,
  formData,
  signal,
  onUploadProgress,
  onUploadComplete,
}: {
  url: string;
  formData: FormData;
  signal: AbortSignal;
  onUploadProgress: (progress: number) => void;
  onUploadComplete: () => void;
}) {
  return new Promise<{
    status: number;
    body: {
      message?: string;
      data?: { document?: ProcessingDraftSummary };
    } | null;
  }>((resolve, reject) => {
    const request = new XMLHttpRequest();

    function handleAbort() {
      request.abort();
    }

    function cleanup() {
      signal.removeEventListener("abort", handleAbort);
    }

    request.open("POST", url);
    request.responseType = "json";
    request.upload.addEventListener("progress", (event) => {
      if (!event.lengthComputable || event.total <= 0) {
        return;
      }

      onUploadProgress(
        Math.min(100, Math.round((event.loaded / event.total) * 100)),
      );
    });
    request.upload.addEventListener("load", () => {
      onUploadProgress(100);
      onUploadComplete();
    });
    request.addEventListener("load", () => {
      cleanup();
      resolve({
        status: request.status,
        body: request.response,
      });
    });
    request.addEventListener("error", () => {
      cleanup();
      reject(new Error("Sambungan gagal semasa memuat naik dokumen."));
    });
    request.addEventListener("abort", () => {
      cleanup();
      reject(new DOMException("Upload aborted.", "AbortError"));
    });
    signal.addEventListener("abort", handleAbort, { once: true });

    if (signal.aborted) {
      handleAbort();
      return;
    }

    request.send(formData);
  });
}
