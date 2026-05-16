import type { ChangeEvent, RefObject } from "react";

import Icon from "../../../components/Icon/Icon";

type UploadDropzoneProps = {
  fileInputRef: RefObject<HTMLInputElement | null>;
  selectedFileName: string;
  isProcessing: boolean;
  processingStep: string;
  processingStage: string;
  processingProgress: number;
  processingError: string;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onUploadAction: () => void;
  onClearSelectedFile: () => void;
  onCancelProcessing: () => void;
};

export default function UploadDropzone({
  fileInputRef,
  selectedFileName,
  isProcessing,
  processingStep,
  processingStage,
  processingProgress,
  processingError,
  onFileChange,
  onUploadAction,
  onClearSelectedFile,
  onCancelProcessing,
}: UploadDropzoneProps) {
  return (
    <div className="relative flex min-h-82.5 flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-[#C6CDDD] bg-white px-6 text-center">
      {isProcessing ? (
        <div
          className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white px-6"
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
              onClick={onCancelProcessing}
              className="mt-4 inline-flex h-9 items-center justify-center gap-2 rounded border border-[#F0C7C7] bg-white px-5 text-xs font-extrabold text-red shadow-sm transition hover:bg-[#FFF7F7]"
            >
              <Icon icon="cancel" size={16} weight={700} />
              Batal
            </button>
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
        onClick={onUploadAction}
        disabled={isProcessing}
        className="mt-6 inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-dark-blue px-8 text-sm font-extrabold text-white shadow-[0_14px_24px_rgba(21,30,102,0.22)] transition-all duration-150 hover:-translate-y-0.5 hover:bg-[#202A78] hover:shadow-[0_18px_30px_rgba(21,30,102,0.26)] active:translate-y-0 active:scale-[0.97] active:bg-[#172062] active:shadow-[0_8px_16px_rgba(21,30,102,0.2)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-dark-blue/20 disabled:cursor-not-allowed disabled:bg-[#6B7280] disabled:shadow-none disabled:hover:translate-y-0"
      >
        <Icon
          icon={
            isProcessing
              ? "progress_activity"
              : selectedFileName
                ? "fact_check"
                : "add"
          }
          size={18}
          weight={700}
        />
        {isProcessing
          ? "Sedang Memproses..."
          : selectedFileName
            ? "Kenal Pasti Untuk Proses"
            : "Pilih Fail Dari Komputer"}
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.xlsx,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="hidden"
        onChange={onFileChange}
      />

      {selectedFileName && !isProcessing ? (
        <div className="mt-4 flex max-w-full flex-wrap items-center justify-center gap-3">
          <p className="min-w-0 max-w-md truncate text-xs font-bold text-[#43506B]">
            Fail dipilih: {selectedFileName}
          </p>
          <button
            type="button"
            onClick={onClearSelectedFile}
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
  );
}
