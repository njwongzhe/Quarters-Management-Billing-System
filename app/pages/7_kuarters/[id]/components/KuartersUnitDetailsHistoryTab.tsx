"use client";

import { useDeferredValue, useMemo, useEffect, useRef, useState } from "react";

import Icon, { commonIcons } from "@/app/components/Icon/Icon";
import {
  PaginationControls,
  usePaginationLogic,
} from "@/app/components/Pagination/Pagination";
import { Topic } from "@/app/components/InputField";
import SearchBar, {
  SearchBarToggleButton,
  searchRecords,
  useSearchBarLogic,
} from "@/app/components/SearchBar";
import HistoryDownload from "./KuartersUnitHistoryTabComponents/HistoryDownload";
import { useHistoryFilterDate } from "./KuartersUnitHistoryTabComponents/HistoryFilterDate";
import { useHistoryFilter } from "./KuartersUnitHistoryTabComponents/HistoryFilter";
import KuartersFeedbackBanner from "../../components/KuartersFeedbackBanner";
import KuartersResidentPickerModal from "./KuartersResidentPickerModal";
import KuartersUnitDatePicker from "./KuartersUnitDatePicker";
import type {
  AvailableResidentRecord,
  AvailableResidentsResponse,
} from "./kuartersUnitHelpers";

import type {
  QuarterUnitDetails,
  QuarterUnitOccupancyDetails,
} from "@/lib/quarters/quarter-units";

type KuartersUnitDetailsHistoryTabProps = {
  unitDetails: QuarterUnitDetails;
  onUnitUpdated: (unit: QuarterUnitDetails) => void;
};

const HISTORY_PAGE_SIZE = 10;

type EditingDraft = {
  occupancyId: string;
  occupantIcNumber: string;
  occupantName: string;
  moveInDate: string;
  moveOutDate: string;
};

type ResidentPickerState = {
  isOpen: boolean;
  isLoading: boolean;
  errorMessage: string | null;
  searchQuery: string;
  residents: AvailableResidentRecord[];
};

type OccupancyMutationResponse = {
  success: boolean;
  message: string;
  data?: {
    unit?: QuarterUnitDetails;
  };
};

function HistoryActionButton({
  icon,
  label,
  textClass,
  disabled = false,
  onClick,
}: {
  icon: string;
  label: string;
  textClass: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center rounded-lg p-2 transition-colors hover:bg-background disabled:cursor-not-allowed disabled:opacity-40 ${textClass}`}
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
    >
      <Icon icon={icon} size={18} />
    </button>
  );
}

export default function KuartersUnitDetailsHistoryTab({
  unitDetails,
  onUnitUpdated,
}: KuartersUnitDetailsHistoryTabProps) {
  const [editingDraft, setEditingDraft] = useState<EditingDraft | null>(null);
  const [pendingAction, setPendingAction] = useState<"save" | "delete" | null>(
    null,
  );
  const [notice, setNotice] = useState<{
    tone: "success" | "error" | "info";
    message: string;
  } | null>(null);
  const [residentPicker, setResidentPicker] = useState<ResidentPickerState>({
    isOpen: false,
    isLoading: false,
    errorMessage: null,
    searchQuery: "",
    residents: [],
  });
  const deferredResidentPickerSearchQuery = useDeferredValue(
    residentPicker.searchQuery,
  );
  const editingRowRef = useRef<HTMLTableRowElement | null>(null);
  const {
    filteredRecords: statusFilteredRecords,
    statusFilterKey,
    FilterControl,
  } = useHistoryFilter(
    unitDetails.occupancyHistory,
  );
  const {
    filteredRecords: dateFilteredRecords,
    dateFilterKey,
    DateFilterControl,
  } = useHistoryFilterDate(statusFilteredRecords);
  const [searchQuery, setSearchQuery] = useState("");
  const {
    isOpen: isSearchOpen,
    isSearchActive: isSearchFilterActive,
    searchInputRef,
    handleToggleSearch,
    handleClearSearch,
  } = useSearchBarLogic({
    value: searchQuery,
    onChange: setSearchQuery,
  });

  const historyRecords = useMemo(() => {
    return searchRecords(
      dateFilteredRecords,
      searchQuery,
      (record) => [record.occupantName, record.occupantIcNumber],
      { icSearch: true },
    );
  }, [dateFilteredRecords, searchQuery]);

  const {
    currentPage,
    totalPages,
    startIndex,
    endIndex,
    handlePageChange,
  } = usePaginationLogic(historyRecords.length, HISTORY_PAGE_SIZE);

  const currentHistory = historyRecords.slice(startIndex, endIndex);

  useEffect(() => {
    handlePageChange(1);
  }, [dateFilterKey, searchQuery, statusFilterKey, unitDetails.id]);

  useEffect(() => {
    if (!residentPicker.isOpen) {
      return;
    }

    const controller = new AbortController();
    const normalizedQuery = deferredResidentPickerSearchQuery.trim();
    const searchParams = new URLSearchParams();

    if (normalizedQuery.length > 0) {
      searchParams.set("query", normalizedQuery);
    }

    async function loadResidents() {
      setResidentPicker((currentState) => ({
        ...currentState,
        isLoading: true,
        errorMessage: null,
      }));

      try {
        const queryString = searchParams.toString();
        const response = await fetch(
          queryString.length > 0
            ? `/api/quarter-categories/residents/available?${queryString}`
            : "/api/quarter-categories/residents/available",
          {
            signal: controller.signal,
          },
        );
        const payload = (await response.json().catch(() => null)) as
          | AvailableResidentsResponse
          | null;

        if (!response.ok || !payload?.success) {
          throw new Error(
            payload?.message ??
              "Gagal mendapatkan senarai penghuni yang boleh ditetapkan.",
          );
        }

        setResidentPicker((currentState) => ({
          ...currentState,
          isLoading: false,
          residents: payload.data?.residents ?? [],
        }));
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        setResidentPicker((currentState) => ({
          ...currentState,
          isLoading: false,
          errorMessage:
            error instanceof Error
              ? error.message
              : "Gagal mendapatkan senarai penghuni yang boleh ditetapkan.",
          residents: [],
        }));
      }
    }

    void loadResidents();

    return () => controller.abort();
  }, [residentPicker.isOpen, deferredResidentPickerSearchQuery]);

  useEffect(() => {
    if (!editingDraft || pendingAction || residentPicker.isOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      if (editingRowRef.current?.contains(target)) {
        return;
      }

      const datePickerPortal = document.querySelector(
        "[data-kuarters-date-picker='true']",
      );

      if (datePickerPortal?.contains(target)) {
        return;
      }

      setEditingDraft(null);
    }

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [editingDraft, pendingAction, residentPicker.isOpen]);

  function startEditing(occupancy: QuarterUnitOccupancyDetails) {
    setEditingDraft({
      occupancyId: occupancy.id,
      occupantIcNumber: occupancy.occupantIcNumber,
      occupantName: occupancy.occupantName,
      moveInDate: formatDateInputValue(occupancy.moveInDate),
      moveOutDate: formatDateInputValue(occupancy.moveOutDate),
    });
    setNotice(null);
  }

  function updateDraft(field: keyof EditingDraft, value: string) {
    setEditingDraft((currentDraft) =>
      currentDraft
        ? {
            ...currentDraft,
            [field]: value,
            ...(field === "moveInDate" ? { moveOutDate: "" } : {}),
          }
        : currentDraft,
    );
  }

  function openResidentPicker() {
    if (!editingDraft || pendingAction) {
      return;
    }

    setResidentPicker({
      isOpen: true,
      isLoading: false,
      errorMessage: null,
      searchQuery: "",
      residents: [],
    });
  }

  function closeResidentPicker() {
    setResidentPicker((currentState) => ({
      ...currentState,
      isOpen: false,
      isLoading: false,
      errorMessage: null,
      searchQuery: "",
      residents: [],
    }));
  }

  function chooseResident(resident: AvailableResidentRecord) {
    setEditingDraft((currentDraft) =>
      currentDraft
        ? {
            ...currentDraft,
            occupantIcNumber: resident.icNumber,
            occupantName: resident.fullName,
            moveInDate: "",
            moveOutDate: "",
          }
        : currentDraft,
    );
    closeResidentPicker();
  }

  async function saveOccupancy() {
    if (!editingDraft || pendingAction) {
      return;
    }

    if (!editingDraft.occupantIcNumber.trim()) {
      setNotice({
        tone: "error",
        message: "Sila pilih penghuni untuk rekod penghunian.",
      });
      return;
    }

    if (!editingDraft.moveInDate) {
      setNotice({
        tone: "error",
        message: "Tarikh masuk wajib dipilih sebelum rekod disimpan.",
      });
      return;
    }

    try {
      setPendingAction("save");
      const response = await fetch(
        `/api/quarter-categories/${unitDetails.category.id}/units/${unitDetails.id}/occupancies/${editingDraft.occupancyId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            occupantIcNumber: editingDraft.occupantIcNumber,
            moveInDate: editingDraft.moveInDate,
            moveOutDate: editingDraft.moveOutDate,
          }),
        },
      );
      const payload = (await response.json().catch(() => null)) as
        | OccupancyMutationResponse
        | null;

      if (!response.ok || !payload?.success || !payload.data?.unit) {
        throw new Error(
          payload?.message ?? "Gagal mengemas kini rekod penghunian.",
        );
      }

      onUnitUpdated(payload.data.unit);
      setEditingDraft(null);
      setNotice({
        tone: "success",
        message: payload.message,
      });
    } catch (error) {
      setNotice({
        tone: "error",
        message:
          error instanceof Error
            ? error.message
            : "Gagal mengemas kini rekod penghunian.",
      });
    } finally {
      setPendingAction(null);
    }
  }

  async function deleteOccupancy() {
    if (!editingDraft || pendingAction) {
      return;
    }

    const shouldDelete = window.confirm(
      "Adakah anda pasti mahu memadam rekod penghunian ini?",
    );

    if (!shouldDelete) {
      return;
    }

    try {
      setPendingAction("delete");
      const response = await fetch(
        `/api/quarter-categories/${unitDetails.category.id}/units/${unitDetails.id}/occupancies/${editingDraft.occupancyId}`,
        {
          method: "DELETE",
        },
      );
      const payload = (await response.json().catch(() => null)) as
        | OccupancyMutationResponse
        | null;

      if (!response.ok || !payload?.success || !payload.data?.unit) {
        throw new Error(payload?.message ?? "Gagal memadam rekod penghunian.");
      }

      onUnitUpdated(payload.data.unit);
      setEditingDraft(null);
      setNotice({
        tone: "success",
        message: payload.message,
      });
    } catch (error) {
      setNotice({
        tone: "error",
        message:
          error instanceof Error
            ? error.message
            : "Gagal memadam rekod penghunian.",
      });
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <KuartersResidentPickerModal
        isOpen={residentPicker.isOpen}
        isLoading={residentPicker.isLoading}
        errorMessage={residentPicker.errorMessage}
        residents={residentPicker.residents}
        searchQuery={residentPicker.searchQuery}
        selectedResidentIcNumber={editingDraft?.occupantIcNumber ?? ""}
        onChooseResident={chooseResident}
        onClose={closeResidentPicker}
        onDismissError={() =>
          setResidentPicker((currentState) => ({
            ...currentState,
            errorMessage: null,
          }))
        }
        onSearchQueryChange={(value) =>
          setResidentPicker((currentState) => ({
            ...currentState,
            searchQuery: value,
          }))
        }
      />

      <div className="flex flex-row items-center justify-between">
        <Topic content="SEJARAH PENGHUNIAN" />

        <div className="flex flex-row gap-4 items-center">
          <SearchBarToggleButton
            label="Cari sejarah penghunian"
            isOpen={isSearchOpen}
            onToggle={handleToggleSearch}
          />
          {DateFilterControl}
          {FilterControl}
          <HistoryDownload unitCode={unitDetails.unitCode} records={historyRecords} />
        </div>
      </div>

      {isSearchOpen ? (
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          onClear={handleClearSearch}
          label="CARIAN MENGIKUT NAMA ATAU NO. KP"
          placeholder="Contoh: Ahmad atau 880101-14-5678"
          inputRef={searchInputRef}
        />
      ) : null}

      <KuartersFeedbackBanner
        notice={notice}
        onDismiss={() => setNotice(null)}
      />

      <div className="rounded-lg overflow-hidden border border-light-grey/20">
        <table className="w-full overflow-x-auto">
          <thead>
            <tr className="font-bold text-xs text-grey bg-background">
              <th className="text-left p-3 w-min whitespace-nowrap">No. Kad Pengenalan</th>
              <th className="text-left p-3 w-min whitespace-nowrap">Nama Penghuni</th>
              <th className="text-center p-3 w-min whitespace-nowrap">Tarikh Masuk</th>
              <th className="text-center p-3 w-min whitespace-nowrap">Tarikh Keluar</th>
              <th className="text-center p-3 w-min whitespace-nowrap">Status</th>
              <th className="w-[0%] text-center p-3 whitespace-nowrap">Tindakan</th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {currentHistory.length === 0 ? (
              <tr className="text-sm">
                <td className="px-3 py-4 text-center text-grey" colSpan={6}>
                  Tiada rekod penghunian yang sepadan untuk unit ini.
                </td>
              </tr>
            ) : (
              currentHistory.map((occupancy) => {
                const isEditing = editingDraft?.occupancyId === occupancy.id;

                return (
                  <tr
                    key={occupancy.id}
                    ref={isEditing ? editingRowRef : null}
                    className="text-sm border-b border-b-light-grey/20 transition-colors hover:bg-background/60"
                  >
                    <td className="px-3 py-2 text-left">
                      {isEditing ? (
                        <button
                          type="button"
                          className="font-normal text-dark-grey underline-offset-2 hover:underline"
                          disabled={Boolean(pendingAction)}
                          onClick={openResidentPicker}
                        >
                          {formatIcNumber(editingDraft.occupantIcNumber) ||
                            "Pilih Penghuni"}
                        </button>
                      ) : (
                        formatIcNumber(occupancy.occupantIcNumber)
                      )}
                    </td>
                    <td className="px-3 py-2 text-left">
                      {isEditing ? editingDraft.occupantName || "N/A" : occupancy.occupantName}
                    </td>
                    <td className="px-3 py-2 text-center font-medium">
                      {isEditing ? (
                        <KuartersUnitDatePicker
                          fieldType="moveInDate"
                          value={editingDraft.moveInDate}
                          required
                          disabled={Boolean(pendingAction)}
                          occupancyHistory={unitDetails.occupancyHistory}
                          excludedOccupancyId={occupancy.id}
                          onChange={(value) => updateDraft("moveInDate", value)}
                        />
                      ) : (
                        formatHistoryDate(occupancy.moveInDate)
                      )}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {isEditing ? (
                        <KuartersUnitDatePicker
                          fieldType="moveOutDate"
                          value={editingDraft.moveOutDate}
                          moveInDate={editingDraft.moveInDate}
                          disabled={Boolean(pendingAction) || !editingDraft.moveInDate}
                          occupancyHistory={unitDetails.occupancyHistory}
                          excludedOccupancyId={occupancy.id}
                          onChange={(value) => updateDraft("moveOutDate", value)}
                        />
                      ) : (
                        formatHistoryDate(occupancy.moveOutDate)
                      )}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {isEditing ? (
                        <span className="text-xs font-semibold text-grey">N/A</span>
                      ) : (
                        <span
                          className={`inline-flex items-center text-[11px] font-semibold ${
                            occupancy.status === "CURRENT"
                              ? "text-aktif"
                              : "text-x-layak"
                          }`}
                        >
                          {occupancy.status === "CURRENT" ? "Aktif" : "Keluar"}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {isEditing ? (
                        <div className="flex justify-center gap-1">
                          <HistoryActionButton
                            icon={commonIcons.save}
                            label="Simpan rekod penghunian"
                            textClass="text-green"
                            disabled={Boolean(pendingAction)}
                            onClick={saveOccupancy}
                          />
                          <HistoryActionButton
                            icon={commonIcons.delete}
                            label="Padam rekod penghunian"
                            textClass="text-red"
                            disabled={Boolean(pendingAction)}
                            onClick={deleteOccupancy}
                          />
                        </div>
                      ) : (
                        <HistoryActionButton
                          icon={commonIcons.edit}
                          label="Kemaskini rekod penghunian"
                          textClass="text-grey"
                          disabled={Boolean(pendingAction)}
                          onClick={() => startEditing(occupancy)}
                        />
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>

          <tfoot>
            <tr>
              <td colSpan={6} className="bg-white border-t border-light-grey/20 px-4 py-4">
                <PaginationControls
                  currentPage={currentPage}
                  totalPages={totalPages}
                  startIndex={startIndex}
                  endIndex={endIndex}
                  totalRecords={historyRecords.length}
                  onPageChange={handlePageChange}
                />
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

function formatHistoryDate(value: string | null) {
  if (!value) {
    return "N/A";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "N/A";
  }

  return new Intl.DateTimeFormat("ms-MY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatDateInputValue(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatIcNumber(value: string) {
  const digits = value.replace(/\D/g, "");

  if (digits.length !== 12) {
    return value;
  }

  return `${digits.slice(0, 6)}-${digits.slice(6, 8)}-${digits.slice(8)}`;
}
