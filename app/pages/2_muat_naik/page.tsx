"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "../../components/Icon";
import { ROUTES } from "../../constants/routes";
import {
  CURRENT_EXTRACT_DRAFT_ID_STORAGE_KEY,
  type ExtractResult,
  type ProcessingDraft,
  formatDraftDateTime,
} from "./semakan/[jenis]/components/extract-review-shared";

const categories = ["Bayaran", "Tunggakan", "Penghuni", "Kuarters"] as const;

type Category = (typeof categories)[number];

const reviewRoutes: Record<Category, string> = {
  Bayaran: "bayaran",
  Tunggakan: "tunggakan",
  Penghuni: "penghuni",
  Kuarters: "kuarters",
};

const draftKindByCategory: Partial<Record<Category, ProcessingDraft["kind"]>> = {
  Bayaran: "bayaran",
  Tunggakan: "tunggakan",
  Penghuni: "penghuni",
  Kuarters: "kuarters",
};

export default function MuatNaikPage() {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState<Category>("Bayaran");
  const [selectedFileName, setSelectedFileName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState("");
  const [processingError, setProcessingError] = useState("");
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingStage, setProcessingStage] = useState("");
  const [processingDrafts, setProcessingDrafts] = useState<ProcessingDraft[]>(
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
        if (currentProgress >= 88) {
          return currentProgress;
        }

        return currentProgress + (currentProgress < 55 ? 4 : 2);
      });
    }, 700);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const apiBaseUrl = process.env.NEXT_PUBLIC_AI_SERVICE_URL ?? "http://127.0.0.1:8000";
      const extractKind = reviewRoutes[activeCategory];
      setProcessingProgress(18);
      setProcessingStage(`Mengekstrak data ${extractKind}...`);
      const response = await fetch(`${apiBaseUrl}/extract/${extractKind}`, {
        method: "POST",
        body: formData,
        signal: abortController.signal,
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        throw new Error(
          errorBody?.detail ?? `Gagal mengekstrak data ${extractKind}.`,
        );
      }

      const extractedData = await response.json();
      const saveResponse = await fetch("/api/uploaded-documents", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          kind: extractKind,
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
      sessionStorage.setItem(CURRENT_EXTRACT_DRAFT_ID_STORAGE_KEY, draft.id);
      sessionStorage.setItem(
        `${extractKind}ExtractResult`,
        JSON.stringify(draft.extractResult),
      );
      sessionStorage.setItem(`${extractKind}ExtractFileName`, selectedFile.name);
      router.push(`${ROUTES.muatNaik}/semakan/${extractKind}`);
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

  function handleContinueDraft(draft: ProcessingDraft) {
    sessionStorage.setItem(CURRENT_EXTRACT_DRAFT_ID_STORAGE_KEY, draft.id);
    sessionStorage.setItem(
      `${draft.kind}ExtractResult`,
      JSON.stringify(draft.extractResult),
    );
    sessionStorage.setItem(`${draft.kind}ExtractFileName`, draft.fileName);
    router.push(`${ROUTES.muatNaik}/semakan/${draft.kind}`);
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

  function getDraftIcon(draft: ProcessingDraft) {
    return draft.fileName.toLowerCase().endsWith(".pdf") ? "picture_as_pdf" : "table";
  }

  function getDraftTone(draft: ProcessingDraft) {
    return draft.fileName.toLowerCase().endsWith(".pdf") ? "red" : "green";
  }

  return (
    <section className="min-h-full bg-background">
      <div className="flex w-full flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-[30px] font-extrabold leading-tight text-[#07162F]">
            Muat Naik Document
          </h1>
          <p className="text-[15px] font-medium text-[#667085]">
            Sila muat naik fail untuk pemprosesan maklumat sistem.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 pt-3">
          <div className="grid h-12 w-full max-w-132.5 grid-cols-4 rounded-xl bg-light-blue p-1.5 shadow-[inset_0_0_0_1px_rgba(219,226,242,0.45)]">
            {categories.map((category) => {
              const isActive = activeCategory === category;

              return (
                <button
                  key={category}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => setActiveCategory(category)}
                  disabled={isProcessing}
                  className={[
                    "rounded-lg text-xs font-extrabold transition-colors",
                    isActive
                      ? "bg-white text-dark-blue shadow-[0_2px_8px_rgba(15,23,42,0.08)]"
                      : "text-[#43506B] hover:bg-white/60 hover:text-dark-blue",
                    isProcessing ? "cursor-not-allowed opacity-60" : "",
                  ].join(" ")}
                >
                  {category}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#DCE2F1] bg-white px-5 text-xs font-extrabold text-dark-blue shadow-sm transition hover:border-[#C8D2EA] hover:bg-[#FBFCFF]"
          >
            <Icon icon="download" size={17} weight={600} />
            Demo Document
          </button>
        </div>

        <div className="relative flex min-h-82.5 flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-[#C6CDDD] bg-white px-6 text-center">
          {isProcessing ? (
            <div
              className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/88 px-6 backdrop-blur-[2px]"
              role="status"
              aria-live="polite"
            >
              <div className="relative flex h-20 w-20 items-center justify-center">
                <div className="absolute inset-0 rounded-full border-4 border-light-blue" />
                <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-dark-blue" />
                <Icon
                  icon="document_scanner"
                  size={30}
                  weight={700}
                  className="text-dark-blue"
                />
              </div>
              <h2 className="mt-5 text-xl font-extrabold text-[#07162F]">
                Sedang Memproses Dokumen
              </h2>
              <p className="mt-2 max-w-md text-sm font-semibold leading-6 text-[#667085]">
                {processingStep || "Mengekstrak data daripada dokumen..."}
              </p>
              <div className="mt-5 h-2 w-full max-w-72 overflow-hidden rounded-full bg-light-blue">
                <div className="h-full w-1/2 animate-[loading-slide_1.2s_ease-in-out_infinite] rounded-full bg-dark-blue" />
              </div>
            </div>
          ) : null}

          <div className="mb-6 flex h-18 w-18 items-center justify-center rounded-xl bg-light-blue text-dark-blue">
            <Icon icon="cloud_upload" size={38} weight={700} />
          </div>
          <h2 className="text-[22px] font-extrabold leading-tight text-[#07162F]">
            Seret & Lepas Fail Di Sini
          </h2>
          <p className="mt-3 text-sm font-medium leading-6 text-[#667085]">
            Pastikan fail dalam format PDF atau Excel (.xlsx) sahaja.
            <br />
            Saiz fail maksimum adalah 25MB.
          </p>
          <button
            type="button"
            onClick={handleUploadAction}
            disabled={isProcessing}
            className="mt-6 inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-dark-blue px-8 text-sm font-extrabold text-white shadow-[0_14px_24px_rgba(21,30,102,0.22)] transition hover:bg-[#202A78] disabled:cursor-not-allowed disabled:bg-[#6B7280]"
          >
            <Icon
              icon={isProcessing ? "progress_activity" : selectedFileName ? "fact_check" : "add"}
              size={18}
              weight={700}
            />
            {isProcessing
              ? "Sedang Memproses..."
              : selectedFileName
              ? "Kenal Pasti Untuk Proses"
              : "Pilih Fail Dari Komputer"}
          </button>
          {isProcessing ? (
            <div className="mt-5 w-full max-w-md">
              <div className="mb-2 flex items-center justify-between gap-4 text-xs font-extrabold text-[#344054]">
                <span className="min-w-0 truncate">{processingStage}</span>
                <span>{Math.min(processingProgress, 99)}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[#E8EEF9]">
                <div
                  className="h-full rounded-full bg-green transition-all duration-500"
                  style={{ width: `${Math.min(processingProgress, 99)}%` }}
                />
              </div>
              <button
                type="button"
                onClick={handleCancelProcessing}
                className="mt-4 inline-flex h-9 items-center justify-center gap-2 rounded border border-[#F0C7C7] bg-white px-5 text-xs font-extrabold text-red shadow-sm transition hover:bg-[#FFF7F7]"
              >
                <Icon icon="cancel" size={16} weight={700} />
                Batal
              </button>
            </div>
          ) : null}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.xlsx,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="hidden"
            onChange={handleFileChange}
          />
          {selectedFileName && !isProcessing ? (
            <div className="mt-4 flex max-w-full flex-wrap items-center justify-center gap-3">
              <p className="min-w-0 max-w-md truncate text-xs font-bold text-[#43506B]">
                Fail dipilih: {selectedFileName}
              </p>
              <button
                type="button"
                onClick={handleClearSelectedFile}
                className="inline-flex h-8 items-center justify-center gap-1.5 rounded border border-[#F0C7C7] bg-white px-3 text-[11px] font-extrabold text-red shadow-sm transition hover:bg-[#FFF7F7]"
              >
                <Icon icon="close" size={14} weight={700} />
                Batal
              </button>
            </div>
          ) : null}
          {processingError ? (
            <p className="mt-3 max-w-xl text-xs font-bold text-red">
              {processingError}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-[#07162F]">
              Barisan Pemprosesan
            </h2>
            <span className="rounded-full bg-[#DDE8FF] px-3 py-1 text-[11px] font-extrabold text-[#2D4A9A]">
              {activeRows.length} Fail {activeCategory} Sedang Menunggu
            </span>
          </div>

          <div className="overflow-hidden rounded-xl border border-[#DCE2F1] bg-white shadow-sm">
            <table className="w-full table-fixed border-collapse text-left">
              <thead className="bg-light-blue text-[10px] font-extrabold uppercase tracking-wide text-[#4B5567]">
                <tr>
                  <th className="w-[38%] px-6 py-4">Nama Dokumen</th>
                  <th className="w-[20%] px-5 py-4">Pemuat Naik</th>
                  <th className="w-[28%] px-5 py-4">Tarikh & Masa</th>
                  <th className="w-[14%] px-5 py-4 text-center">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EEF1F7] text-xs">
                {isLoadingQueue ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-6 py-10 text-center text-sm font-semibold text-[#667085]"
                    >
                      Memuatkan barisan pemprosesan...
                    </td>
                  </tr>
                ) : activeRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-6 py-10 text-center text-sm font-semibold text-[#667085]"
                    >
                      Tiada fail {activeCategory.toLowerCase()} sedang menunggu.
                    </td>
                  </tr>
                ) : (
                  activeRows.map((row) => (
                  <tr key={row.id} className="h-14.5">
                    <td className="px-6 py-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span
                          className={[
                            "flex h-7 w-7 shrink-0 items-center justify-center rounded",
                            getDraftTone(row) === "green"
                              ? "bg-[#EAF8EF] text-green"
                              : "bg-[#FFF0F0] text-red",
                          ].join(" ")}
                        >
                          <Icon icon={getDraftIcon(row)} size={16} filled weight={600} />
                        </span>
                        <span className="truncate font-extrabold text-[#172033]">
                          {row.fileName}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4 font-medium text-[#3B465A]">
                      {row.uploadedBy}
                    </td>
                    <td className="px-5 py-4 font-medium text-[#3B465A]">
                      {formatDraftDateTime(row.uploadedAt)}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-center gap-5">
                        <button
                          type="button"
                          className="text-dark-blue transition hover:text-[#2D367D]"
                          title="Lihat"
                          onClick={() => handleContinueDraft(row)}
                        >
                          <Icon icon="visibility" size={18} weight={600} />
                        </button>
                        <button
                          type="button"
                          className="text-red transition hover:text-[#8F1111]"
                          title="Padam"
                          onClick={() => handleDeleteDraft(row.id)}
                        >
                          <Icon icon="delete" size={18} weight={600} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
