"use client";

import Icon from "../../../../../components/Icon";

export type ExtractedPenghuniRecord = {
  residentId?: string;
  residentRecordStatus?: "PENDING" | "VERIFIED" | "REJECTED";
  nama: string;
  noKadPengenalan: string;
  kuarters: string;
  unit: string;
  alamatKuarters: string;
  perhubungan: string;
  pekerjaan: string;
  jabatan: string;
  tarikhMasuk?: string;
  tarikhKeluar?: string;
  sewaBulanan?: string;
  catatan?: string;
  sourceSheet: string;
  sourceRow: number;
};

export type PenghuniExtractResult = {
  documentType: "penghuni";
  recordCount: number;
  records: ExtractedPenghuniRecord[];
};

export type ExtractedQuarterUnit = {
  unitId?: string;
  unitCode: string;
  address: string;
  sourceSheet: string;
  sourceRow: number;
};

export type ExtractedQuarterRecord = {
  id: string;
  categoryId?: string;
  categoryName: string;
  kawasan: string;
  typeLabel: string;
  rentalPrice: string;
  maintenancePrice: string;
  penaltyPrice: string;
  unitCount: number;
  sourceSheet: string;
  sourceRow: number;
  units: ExtractedQuarterUnit[];
};

export type KuartersExtractResult = {
  documentType: "kuarters";
  recordCount: number;
  totalUnits: number;
  records: ExtractedQuarterRecord[];
};

export type ExtractedBayaranRecord = {
  paymentId?: string;
  residentId?: string;
  residentRecordStatus?: "PENDING" | "VERIFIED" | "REJECTED";
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
  residentRecordStatus?: "PENDING" | "VERIFIED" | "REJECTED";
  importStatus?: "PENDING" | "IGNORED";
  importMessage?: string;
  nama: string;
  noKadPengenalan: string;
  jumlahTunggakan: string;
  sourceSheet: string;
  sourceRow: number;
};

export type TunggakanExtractResult = {
  documentType: "tunggakan";
  recordCount: number;
  totalAmount: string;
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

export const CURRENT_EXTRACT_DRAFT_ID_STORAGE_KEY = "currentExtractDraftId";

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

export const sampleResidents = [
  {
    name: "Ahmad Azam bin Sulaiman",
    ic: "850412-81-5543",
    date: "12 Julai 2024",
    receipt: "RES-2024-001",
    amount: "450.00",
    quarters: "Kategori C\nUnit 12-A, Blok B",
    contact: "012-3456789\nazam.sul@gmail.com",
    job: "Penolong Jurutera\nJA29\nJKR Daerah Johor Bahru",
  },
  {
    name: "Siti Yasmin binti Abdullah",
    ic: "920115-81-6622",
    date: "12 Julai 2024",
    receipt: "RES-2024-002",
    amount: "320.00",
    quarters: "Kategori D\nUnit 05-C, Blok E",
    contact: "019-8765432\nyasmin.abd@moe.gov.my",
    job: "Guru Siswazah DG41\nSK Taman Universiti",
  },
  {
    name: "Mohd Khairul bin Idris",
    ic: "780922-81-4431",
    date: "12 Julai 2024",
    receipt: "RES-2024-003",
    amount: "150.00",
    quarters: "Kategori B\nNo. 22, Jalan Perdana 4",
    contact: "017-1122334\nkhairul.idris@health.gov.my",
    job: "Pegawai Perubatan\nUD48\nHospital Sultanah Aminah",
  },
];

export const RESIDENTS_PER_PAGE = 10;
export const QUARTER_CATEGORIES_PER_PAGE = 10;
export const QUARTER_UNITS_PER_PAGE = 10;

export function Pagination({
  label,
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  showLabel = true,
}: {
  label: string;
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  showLabel?: boolean;
}) {
  const canGoPrevious = currentPage > 1;
  const canGoNext = currentPage < totalPages;
  const visiblePages = getVisiblePages(currentPage, totalPages);

  const changePage = (page: number) => {
    if (!onPageChange || page < 1 || page > totalPages || page === currentPage) {
      return;
    }

    onPageChange(page);
  };

  return (
    <div className="flex items-center justify-between gap-3 border-t border-[#EEF1F7] px-5 py-3 text-[11px] text-[#4B5567]">
      <div className="flex items-center gap-1">
        <button
          type="button"
          className="flex h-7 w-7 items-center justify-center rounded text-[#344054] disabled:cursor-not-allowed disabled:opacity-40"
          onClick={() => changePage(currentPage - 1)}
          disabled={!canGoPrevious}
          aria-label="Halaman sebelumnya"
        >
          <Icon icon="chevron_left" size={14} />
        </button>
        {visiblePages.map((page, index) =>
          page === "ellipsis" ? (
            <span
              key={`ellipsis-${index}`}
              className="flex h-7 w-7 items-center justify-center text-[#98A2B3]"
            >
              ...
            </span>
          ) : (
            <button
              key={page}
              type="button"
              className={[
                "h-7 w-7 rounded",
                page === currentPage ? "bg-dark-blue text-white" : "text-[#344054]",
              ].join(" ")}
              onClick={() => changePage(page)}
            >
              {page}
            </button>
          ),
        )}
        <button
          type="button"
          className="flex h-7 w-7 items-center justify-center rounded text-[#344054] disabled:cursor-not-allowed disabled:opacity-40"
          onClick={() => changePage(currentPage + 1)}
          disabled={!canGoNext}
          aria-label="Halaman seterusnya"
        >
          <Icon icon="chevron_right" size={14} />
        </button>
      </div>
      {showLabel ? <span className="min-w-0 truncate">{label}</span> : null}
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
