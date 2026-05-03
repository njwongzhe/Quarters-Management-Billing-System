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
  onAssignResident: (resident: AvailableResidentRecord) => void;
  onClearSelection: () => void;
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
  onAssignResident,
  onClearSelection,
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
      className="fixed inset-0 z-50 bg-dark-blue/35 p-4 backdrop-blur-[2px] md:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="resident-picker-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="mx-auto flex h-full max-h-195 w-full max-w-5xl flex-col overflow-hidden rounded-[28px] border border-light-grey/20 bg-white shadow-2xl">
        <div className="flex flex-col gap-4 bg-dark-blue px-6 py-5 text-white sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-white/75">
              Pilih Penghuni
            </p>
            <h2
              id="resident-picker-title"
              className="text-2xl font-extrabold tracking-[-0.03em]"
            >
              Senarai Penghuni Aktif
            </h2>
            <p className="max-w-2xl text-sm text-white/80">
              Hanya penghuni berstatus AKTIF yang belum mempunyai unit
              akan dipaparkan dalam senarai ini.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start">
            {selectedResidentIcNumber.trim().length > 0 ? (
              <button
                type="button"
                className="inline-flex min-h-10 items-center rounded-xl border border-white/25 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/15"
                onClick={onClearSelection}
              >
                Kosongkan Penghuni
              </button>
            ) : null}

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
              <table className="w-full min-w-180 table-fixed border-collapse">
                <thead className="sticky top-0 bg-background">
                  <tr>
                    <th className="w-[30%] px-6 py-4 text-left text-xs font-extrabold uppercase tracking-[0.18em] text-grey">
                      No. Kad Pengenalan Penghuni
                    </th>
                    <th className="w-[46%] px-6 py-4 text-left text-xs font-extrabold uppercase tracking-[0.18em] text-grey">
                      Nama Penghuni
                    </th>
                    <th className="w-[24%] px-6 py-4 text-left text-xs font-extrabold uppercase tracking-[0.18em] text-grey">
                      Tindakan
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr className="border-t border-light-grey/20">
                      <td
                        colSpan={3}
                        className="px-6 py-10 text-center text-sm font-medium text-grey"
                      >
                        Memuatkan senarai penghuni...
                      </td>
                    </tr>
                  ) : null}

                  {!isLoading && residents.length === 0 ? (
                    <tr className="border-t border-light-grey/20">
                      <td
                        colSpan={3}
                        className="px-6 py-10 text-center text-sm font-medium text-grey"
                      >
                        Tiada penghuni aktif yang sepadan dengan carian semasa.
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
                            className="border-t border-light-grey/20"
                          >
                            <td className="px-6 py-4 text-sm font-semibold text-dark-grey">
                              {resident.icNumber}
                            </td>
                            <td className="px-6 py-4 text-sm font-semibold text-dark-grey">
                              {resident.fullName}
                            </td>
                            <td className="px-6 py-4">
                              <button
                                type="button"
                                className={`inline-flex min-h-10 items-center rounded-xl px-4 py-2 text-sm font-extrabold transition-colors ${
                                  isSelected
                                    ? "cursor-not-allowed border border-light-grey/25 bg-background text-grey"
                                    : "bg-dark-blue text-white hover:opacity-90"
                                }`}
                                disabled={isSelected}
                                onClick={() => onAssignResident(resident)}
                              >
                                {isSelected ? "Dipilih" : "Tetapkan"}
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
