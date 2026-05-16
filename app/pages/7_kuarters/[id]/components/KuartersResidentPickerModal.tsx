"use client";

import { useEffect } from "react";

import Icon, { commonIcons } from "@/app/components/Icon";
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

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed bottom-0 left-55 right-0 top-0 z-50 flex items-center justify-center bg-dark-blue/35 p-4 backdrop-blur-[2px] md:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="resident-picker-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="flex h-[min(48.75rem,calc(100vh-2rem))] w-full max-w-5xl flex-col overflow-hidden rounded-[28px] border border-light-grey/20 bg-white shadow-2xl md:h-[min(48.75rem,calc(100vh-3rem))]">
        <div className="flex flex-col gap-4 bg-dark-blue px-6 py-5 text-white sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-white/75">
              Pilih Penghuni
            </p>
            <h2
              id="resident-picker-title"
              className="text-2xl font-extrabold tracking-[-0.03em]"
            >
              Senarai Penghuni Tersedia
            </h2>
            <p className="max-w-2xl text-sm text-white/80">
              Penghuni yang telah disahkan akan dipaparkan dalam senarai ini.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start">
            <button
              type="button"
              className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white transition-colors hover:bg-white/15"
              aria-label="Tutup pilihan penghuni"
              onClick={onClose}
            >
              <Icon icon="close" size={20} />
            </button>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col bg-light-blue/10 p-4 sm:p-5">
          <div className="rounded-2xl border border-light-grey/20 bg-white p-4">
            <label className="block">
              <span className="mb-2 block text-xs font-extrabold uppercase tracking-[0.18em] text-grey">
                Carian Mengikut IC atau Nama
              </span>
              <div className="flex items-center gap-3 rounded-xl border border-light-grey/30 bg-background px-3 py-2 transition-colors focus-within:border-dark-blue">
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

          <div className="mt-4">
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

          <div className="mt-4 min-h-0 flex-1 overflow-hidden rounded-2xl border border-light-grey/20 bg-white">
            <div className="h-full overflow-auto">
              <table className="w-full min-w-200 table-fixed border-collapse">
                <thead className="sticky top-0 bg-background">
                  <tr>
                    <th className="w-[27%] px-6 py-4 text-left text-xs font-extrabold uppercase tracking-[0.18em] text-grey">
                      No. Kad Pengenalan Penghuni
                    </th>
                    <th className="w-[41%] px-6 py-4 text-left text-xs font-extrabold uppercase tracking-[0.18em] text-grey">
                      Nama Penghuni
                    </th>
                    <th className="w-[18%] px-6 py-4 text-center text-xs font-extrabold uppercase tracking-[0.18em] text-grey">
                      Status
                    </th>
                    <th className="w-[14%] px-6 py-4 text-center text-xs font-extrabold uppercase tracking-[0.18em] text-grey">
                      Tindakan
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr className="border-t border-light-grey/20">
                      <td
                        colSpan={4}
                        className="px-6 py-10 text-center text-sm font-medium text-grey"
                      >
                        Memuatkan senarai penghuni...
                      </td>
                    </tr>
                  ) : null}

                  {!isLoading && residents.length === 0 ? (
                    <tr className="border-t border-light-grey/20">
                      <td
                        colSpan={4}
                        className="px-6 py-10 text-center text-sm font-medium text-grey"
                      >
                        Tiada penghuni tersedia yang sepadan dengan carian semasa.
                      </td>
                    </tr>
                  ) : null}

                  {!isLoading
                    ? residents.map((resident) => {
                        const isSelected =
                          resident.icNumber === selectedResidentIcNumber;

                        return (
                          <tr
                            key={resident.id}
                            className="border-t border-light-grey/20 transition-colors hover:bg-light-blue/25"
                          >
                            <td
                              className="px-6 py-4 text-sm font-semibold text-dark-grey"
                              title={resident.icNumber}
                            >
                              {formatIcNumber(resident.icNumber)}
                            </td>
                            <td className="px-6 py-4 text-sm font-semibold text-dark-grey">
                              {resident.fullName}
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span
                                className={`inline-flex min-h-8 items-center rounded-full border px-3 text-xs font-extrabold uppercase ${getResidentStatusBadgeClass(
                                  resident.status,
                                )}`}
                              >
                                {formatResidentStatus(resident.status)}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <button
                                type="button"
                                className={`inline-flex min-h-10 items-center rounded-xl px-4 py-2 text-sm font-extrabold transition-colors ${
                                  isSelected
                                    ? "cursor-not-allowed border border-light-grey/25 bg-background text-grey"
                                    : "bg-dark-blue text-white hover:opacity-90"
                                }`}
                                disabled={isSelected}
                                onClick={() => onChooseResident(resident)}
                              >
                                {isSelected ? "Dipilih" : "Pilih"}
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    : null}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatResidentStatus(value: string) {
  return value.replace(/_/g, " ");
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
