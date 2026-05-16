"use client";

import Icon from "../../../components/Icon";

export type ExtractedPenghuniRecord = {
  residentId?: string;
  originalResidentId?: string;
  isExisted?: boolean;
  nama: string;
  noKadPengenalan: string;
  kuarters: string;
  unit: string;
  alamatKuarters: string;
  perhubungan: string;
  gmail?: string;
  pekerjaan: string;
  jabatan: string;
  tarafPerkhidmatan?: string;
  tarikhMasuk?: string;
  tarikhKeluar?: string;
  catatan?: string;
};

export type PenghuniExtractResult = {
  documentType: "penghuni";
  recordCount: number;
  parsingMode?: "strict" | "assisted";
  records: ExtractedPenghuniRecord[];
};

export type ExtractedQuarterUnit = {
  unitId?: string;
  originalUnitId?: string;
  isExisted?: boolean;
  unitCode: string;
  address: string;
};

export type ExtractedQuarterRecord = {
  id: string;
  categoryId?: string;
  originalCategoryId?: string;
  categoryIsExisted?: boolean;
  categoryName: string;
  address: string;
  rentalPrice: string;
  maintenancePrice: string;
  penaltyPrice: string;
  unitCount: number;
  units: ExtractedQuarterUnit[];
};

export type KuartersExtractResult = {
  documentType: "kuarters";
  recordCount: number;
  totalUnits: number;
  parsingMode?: "strict" | "assisted";
  records: ExtractedQuarterRecord[];
};

export type ExtractedBayaranRecord = {
  paymentId?: string;
  residentId?: string;
  isExisted?: boolean;
  page: number;
  jabatanCode: string;
  jabatanName: string;
  ptjpkCode: string;
  ptjpkName: string;
  bil: string;
  noRujukan: string;
  noGajiNoKp: string;
  nama: string;
  amaunRm: string;
  tarikh: string;
  noResit: string;
  catatan: string;
};

export type BayaranExtractResult = {
  documentType: "bayaran";
  recordCount: number;
  totalAmount: string;
  paymentMonth: string;
  records: ExtractedBayaranRecord[];
};

export type ExtractedTunggakanRecord = {
  arrearsSummaryId?: string;
  residentId?: string;
  isExisted?: boolean;
  importStatus?: "PENDING" | "IGNORED";
  importMessage?: string;
  nama: string;
  noKadPengenalan: string;
  jumlahTunggakan: string;
};

export type TunggakanExtractResult = {
  documentType: "tunggakan";
  recordCount: number;
  totalAmount: string;
  lastUpdatedMonth?: string;
  parsingMode?: "strict" | "assisted";
  records: ExtractedTunggakanRecord[];
};

export type ExtractResult =
  | BayaranExtractResult
  | TunggakanExtractResult
  | PenghuniExtractResult
  | KuartersExtractResult;

export type ProcessingDraft = {
  id: string;
  kind: "bayaran" | "tunggakan" | "penghuni" | "kuarters";
  fileName: string;
  fileType: string;
  fileSize?: number;
  uploadedBy: string;
  uploadedAt: string;
  extractResult: ExtractResult;
};

export type ProcessingDraftSummary = Omit<ProcessingDraft, "extractResult">;

export function formatDraftDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString("ms-MY", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const RESIDENTS_PER_PAGE = 10;
export const QUARTER_CATEGORIES_PER_PAGE = 10;
export const QUARTER_UNITS_PER_PAGE = 10;

export function Pagination({
  label,
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  showLabel = true,
  size = "default",
}: {
  label: string;
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  showLabel?: boolean;
  size?: "default" | "compact";
}) {
  const canGoPrevious = currentPage > 1;
  const canGoNext = currentPage < totalPages;
  const visiblePages = getVisiblePages(currentPage, totalPages);
  const isCompact = size === "compact";

  const changePage = (page: number) => {
    if (!onPageChange || page < 1 || page > totalPages || page === currentPage) {
      return;
    }

    onPageChange(page);
  };

  return (
    <div
      className={[
        "flex flex-col border-t border-light-grey/20 sm:flex-row sm:items-center sm:justify-between",
        isCompact ? "gap-2 px-3 py-3" : "gap-3 px-4 py-4 sm:px-5",
      ].join(" ")}
    >
      <div className={["flex flex-wrap items-center", isCompact ? "gap-1" : "gap-2"].join(" ")}>
        <button
          type="button"
          className={[
            "inline-flex items-center justify-center rounded-md border border-light-grey/30 bg-white text-grey transition-colors hover:border-dark-blue hover:text-dark-blue disabled:cursor-not-allowed disabled:opacity-40",
            isCompact ? "min-h-7 min-w-7" : "min-h-8 min-w-8",
          ].join(" ")}
          onClick={() => changePage(currentPage - 1)}
          disabled={!canGoPrevious}
          aria-label="Halaman sebelumnya"
        >
          <Icon icon="chevron_left" size={isCompact ? 14 : 18} />
        </button>
        {visiblePages.map((page, index) =>
          page === "ellipsis" ? (
            <span
              key={`ellipsis-${index}`}
              className={[
                "px-1 font-semibold text-grey",
                isCompact ? "text-xs" : "text-sm",
              ].join(" ")}
              aria-hidden="true"
            >
              ...
            </span>
          ) : (
            <button
              key={page}
              type="button"
              className={[
                "rounded-md border transition-colors",
                isCompact ? "min-h-7 min-w-7 px-1.5 text-xs" : "min-h-8 min-w-8 px-2 text-sm",
                page === currentPage
                  ? "border-dark-blue bg-dark-blue font-bold text-white"
                  : "border-light-grey/30 bg-white text-grey hover:border-dark-blue hover:text-dark-blue",
              ].join(" ")}
              aria-current={page === currentPage ? "page" : undefined}
              onClick={() => changePage(page)}
            >
              {page}
            </button>
          ),
        )}
        <button
          type="button"
          className={[
            "inline-flex items-center justify-center rounded-md border border-light-grey/30 bg-white text-grey transition-colors hover:border-dark-blue hover:text-dark-blue disabled:cursor-not-allowed disabled:opacity-40",
            isCompact ? "min-h-7 min-w-7" : "min-h-8 min-w-8",
          ].join(" ")}
          onClick={() => changePage(currentPage + 1)}
          disabled={!canGoNext}
          aria-label="Halaman seterusnya"
        >
          <Icon icon="chevron_right" size={isCompact ? 14 : 18} />
        </button>
      </div>
      {showLabel ? <p className="text-sm text-grey">{label}</p> : null}
    </div>
  );
}

function getVisiblePages(currentPage: number, totalPages: number) {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 3) {
    return [1, 2, 3, "ellipsis", totalPages] as const;
  }

  if (currentPage >= totalPages - 2) {
    return [1, "ellipsis", totalPages - 2, totalPages - 1, totalPages] as const;
  }

  return [1, "ellipsis", currentPage, "ellipsis", totalPages] as const;
}

export function RowActions({ showDelete = true }: { showDelete?: boolean }) {
  return (
    <div className="flex items-center justify-center gap-4">
      <Icon icon="save" size={16} weight={700} className="text-green" />
      {showDelete ? (
        <Icon icon="delete" size={16} weight={700} className="text-red" />
      ) : (
        <Icon icon="edit" size={16} weight={700} className="text-dark-blue" />
      )}
    </div>
  );
}
