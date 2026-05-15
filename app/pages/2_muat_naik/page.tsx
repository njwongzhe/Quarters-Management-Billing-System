"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeCategory, setActiveCategory] = useState<Category>(() =>
    getCategoryFromParam(searchParams.get("kategori")),
  );
  const [parsingMode, setParsingMode] = useState<ParsingMode>("strict");
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

      const extractKind = reviewRoutes[activeCategory];
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
      const saveResponse = await fetch(uploadRouteByKind[extractKind], {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileName: selectedFile.name,
          fileType: selectedFile.type || selectedFile.name.split(".").pop() || "file",
          fileSize: selectedFile.size,
          extractResult: extractedData as ExtractResult,
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
