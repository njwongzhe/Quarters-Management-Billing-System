"use client";

import { useEffect } from "react";

import Icon, { commonIcons } from "@/app/components/Icon/Icon";
import {
  PaginationControls,
  usePaginationLogic,
} from "@/app/components/Pagination/Pagination";
import KuartersFeedbackBanner from "@/app/pages/7_kuarters/components/KuartersFeedbackBanner";

import type { AvailableResidentRecord } from "./kuartersUnitHelpers";

type KuartersResidentPickerModalProps = {
  isOpen: boolean;
  isLoading: boolean;
  errorMessage: string | null;
  residents: AvailableResidentRecord[];
  searchQuery: string;
  selectedResidentIcNumber: string;
  onChooseResident: (resident: AvailableResidentRecord) => void;
  onClose: () => void;
  onDismissError: () => void;
  onSearchQueryChange: (value: string) => void;
};

export default function KuartersResidentPickerModal({
  isOpen,
  isLoading,
  errorMessage,
  residents,
  searchQuery,
  selectedResidentIcNumber,
  onChooseResident,
  onClose,
  onDismissError,
  onSearchQueryChange,
}: KuartersResidentPickerModalProps) {
  const itemsPerPage = 10;
  const {
    currentPage,
    totalPages,
    startIndex,
    endIndex,
    handlePageChange,
    paginationItems,
  } = usePaginationLogic(residents.length, itemsPerPage);
  const paginatedResidents = residents.slice(startIndex, endIndex);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    handlePageChange("goto", 1);
  }, [searchQuery]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed top-0 left-55 right-0 bottom-0 z-50 bg-black/40 backdrop-blur-sm p-12 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="resident-picker-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="relative w-full rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[calc(100vh-6rem)]">
        {/* Header */}
        <div className="flex items-center justify-between bg-dark-blue p-6 text-white shrink-0">
          {/* Title and Description */}
          <div>
            <h2
              id="resident-picker-title"
              className="text-lg font-bold"
            >
              SENARAI PENGHUNI TERSEDIA
            </h2>
            <p className="text-xs font-extralight text-light-grey">
              PENGHUNI YANG TELAH DISAHKAN AKAN DIPAPARKAN DALAM SENARAI INI
            </p>
          </div>

          {/* Close Button */}
          <button
            type="button"
            className="text-white transition-transform hover:scale-95 active:scale-90"
            aria-label="Tutup pilihan penghuni"
            onClick={onClose}
          >
            <Icon icon="close" size={20} />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-light-blue p-6">
          {/* Search Input */}
          <div className="shrink-0 rounded-lg border border-light-grey/20 bg-white p-4 shadow-[0_6px_18px_rgba(15,23,42,0.06)]">
            <label className="block">
              <span className="mb-2 block text-xs font-bold uppercase text-grey">
                Carian Mengikut IC atau Nama
              </span>
              <div className="flex items-center gap-3 rounded-xl border border-light-grey/30 bg-background px-3 py-2 transition-colors focus-within:border-dark-blue focus-within:bg-white">
                <Icon
                  icon={commonIcons.search}
                  size={18}
                  className="text-light-grey"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(event) => onSearchQueryChange(event.target.value)}
                  placeholder="Contoh: 850101-01-5123 atau Ahmad"
                  className="w-full border-none bg-transparent text-sm font-medium text-dark-grey outline-none placeholder:text-light-grey"
                />
              </div>
            </label>
          </div>

          {/* Error Message Banner */}
          <div className="mt-4 shrink-0">
            <KuartersFeedbackBanner
              notice={
                errorMessage
                  ? {
                      tone: "error",
                      message: errorMessage,
                    }
                  : null
              }
              onDismiss={onDismissError}
            />
          </div>

          {/* Residents Table */}
          <div>
            <div className="overflow-hidden rounded-lg border border-light-grey/20">
              <table className="w-full overflow-x-auto">
                <thead className="bg-background">
                  <tr className="text-xs font-bold text-grey">
                    <th className="px-4 py-3 text-left w-min whitespace-nowrap">No. K/P</th>
                    <th className="px-4 py-3 text-left w-min whitespace-nowrap">Nama</th>
                    <th className="px-4 py-3 text-center w-min whitespace-nowrap">Status</th>
                    <th className="w-[0%] px-4 py-3 text-center whitespace-nowrap">Tindakan</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {isLoading ? (
                    <tr className="text-sm">
                      <td
                        colSpan={4}
                        className="px-4 py-4 text-center text-grey"
                      >
                        Memuatkan senarai penghuni...
                      </td>
                    </tr>
                  ) : null}

                  {!isLoading && residents.length === 0 ? (
                    <tr className="text-sm">
                      <td
                        colSpan={4}
                        className="px-4 py-4 text-center text-grey"
                      >
                        Tiada penghuni tersedia yang sepadan dengan carian semasa.
                      </td>
                    </tr>
                  ) : null}

                  {!isLoading
                    ? paginatedResidents.map((resident) => {
                        const isSelected =
                          resident.icNumber === selectedResidentIcNumber;
                        const isActionDisabled = isSelected;

                        return (
                          <tr
                            key={resident.id}
                            className="border-b border-b-light-grey/20 text-sm transition-colors"
                          >
                            <td
                              className="px-4 py-3 text-left font-bold text-dark-grey w-min whitespace-nowrap"
                              title={resident.icNumber}
                            >
                              {formatIcNumber(resident.icNumber)}
                            </td>
                            <td className="px-4 py-3 text-left font-bold text-dark-grey w-min whitespace-nowrap">
                              {resident.fullName}
                            </td>
                            <td className="px-4 py-3 text-center w-min whitespace-nowrap">
                              <span
                                className={`inline-flex min-h-8 items-center rounded-full border px-3 text-[11px] font-semibold ${getResidentStatusBadgeClass(
                                  resident.status,
                                )}`}
                              >
                                {formatResidentStatus(resident.status)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center w-min whitespace-nowrap">
                              <button
                                type="button"
                                className={`inline-flex items-center rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
                                  isActionDisabled
                                    ? "cursor-not-allowed border border-light-grey/25 bg-background text-grey"
                                    : "bg-dark-blue text-white hover:opacity-90"
                                }`}
                                disabled={isActionDisabled}
                                onClick={() => onChooseResident(resident)}
                              >
                                {isSelected
                                  ? "Dipilih"
                                  : "Pilih"}
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    : null}
                </tbody>

                <tfoot className="bg-white border-t border-light-grey/20">
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-4"
                    >
                      <PaginationControls
                        currentPage={currentPage}
                        totalPages={totalPages}
                        startIndex={startIndex}
                        endIndex={endIndex}
                        totalRecords={residents.length}
                        paginationItems={paginationItems}
                        onPageChange={handlePageChange}
                      />
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatResidentStatus(value: string) {
  return value
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function formatIcNumber(value: string) {
  const digits = value.replace(/\D/g, "");

  if (digits.length !== 12) {
    return value;
  }

  return `${digits.slice(0, 6)}-${digits.slice(6, 8)}-${digits.slice(8)}`;
}

function getResidentStatusBadgeClass(status: AvailableResidentRecord["status"]) {
  const statusClasses: Record<AvailableResidentRecord["status"], string> = {
    AKTIF: "border-aktif/20 bg-aktif/10 text-aktif",
    TIDAK_LAYAK: "border-x-layak/20 bg-x-layak/10 text-x-layak",
    PENCEN_MENDATANG:
      "border-pencen-datang/25 bg-pencen-datang/10 text-pencen-datang",
    DATA_TIDAK_LENGKAP: "border-x-lengkap/20 bg-x-lengkap/10 text-x-lengkap",
  };

  return statusClasses[status];
}
