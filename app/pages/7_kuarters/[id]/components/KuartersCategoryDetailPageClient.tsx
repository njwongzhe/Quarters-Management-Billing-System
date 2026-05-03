"use client";

import { useDeferredValue, useEffect, useState } from "react";

import KuartersFeedbackBanner from "@/app/pages/7_kuarters/components/KuartersFeedbackBanner";
import KuartersOverviewCards from "@/app/pages/7_kuarters/components/KuartersOverviewCards";
import {
  buildKuartersSummaryCards,
  type KuartersNotice,
} from "@/app/pages/7_kuarters/components/kuartersHelpers";

import KuartersCategoryDetailHeader from "./KuartersCategoryDetailHeader";
import KuartersResidentPickerModal from "./KuartersResidentPickerModal";
import KuartersUnitsPanel from "./KuartersUnitsPanel";
import {
  type AvailableResidentRecord,
  type AvailableResidentsResponse,
  EMPTY_QUARTER_UNIT_ID,
  buildQuarterUnitPagination,
  buildQuarterUnitSummary,
  createDraftFromQuarterUnit,
  createEmptyQuarterUnitFilters,
  createEmptyQuarterUnitDraft,
  filterQuarterUnits,
  hasActiveQuarterUnitFilters,
  sortQuarterUnits,
  validateQuarterUnitDraft,
  type KuartersCategoryDetailInitialData,
  type KuartersUnitEditorState,
  type QuarterUnitDraft,
  type QuarterUnitMutationResponse,
  type QuarterUnitRecord,
} from "./kuartersUnitHelpers";

type PendingAction = "save" | "delete" | null;
type ResidentPickerState = {
  isOpen: boolean;
  isLoading: boolean;
  errorMessage: string | null;
  searchQuery: string;
  residents: AvailableResidentRecord[];
};

type KuartersCategoryDetailPageClientProps = {
  initialData: KuartersCategoryDetailInitialData;
  initialNotice?: KuartersNotice | null;
};

type ApiResponseShape = {
  success: boolean;
  message: string;
};

async function parseApiResponse<T extends ApiResponseShape>(
  response: Response,
  fallbackMessage: string,
) {
  const payload = (await response.json().catch(() => null)) as T | null;

  if (!response.ok || !payload?.success) {
    const message = payload?.message ?? fallbackMessage;

    throw new Error(message);
  }

  return payload;
}

function getErrorMessage(error: unknown, fallbackMessage: string) {
  return error instanceof Error ? error.message : fallbackMessage;
}

export default function KuartersCategoryDetailPageClient({
  initialData,
  initialNotice = null,
}: KuartersCategoryDetailPageClientProps) {
  const [units, setUnits] = useState<QuarterUnitRecord[]>(initialData.units);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState(createEmptyQuarterUnitFilters);
  const [editor, setEditor] = useState<KuartersUnitEditorState | null>(null);
  const [notice, setNotice] = useState<KuartersNotice | null>(initialNotice);
  const [pendingUnitId, setPendingUnitId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
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
  const summary = buildQuarterUnitSummary(units);
  const hasActiveFilters = hasActiveQuarterUnitFilters(filters);
  const filteredUnits = filterQuarterUnits(units, filters);
  const pagination = buildQuarterUnitPagination(filteredUnits, currentPage, {
    hasActiveFilter: hasActiveFilters,
    totalRecords: units.length,
  });

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

    async function loadAvailableResidents() {
      setResidentPicker((currentState) => ({
        ...currentState,
        isLoading: true,
        errorMessage: null,
      }));

      try {
        const queryString = searchParams.toString();
        const response = await fetch(
          queryString.length > 0
            ? `/api/residents/available?${queryString}`
            : "/api/residents/available",
          {
            signal: controller.signal,
          },
        );
        const result = await parseApiResponse<AvailableResidentsResponse>(
          response,
          "Gagal mendapatkan senarai penghuni yang boleh ditetapkan.",
        );

        setResidentPicker((currentState) => ({
          ...currentState,
          isLoading: false,
          errorMessage: null,
          residents: result.data?.residents ?? [],
        }));
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        setResidentPicker((currentState) => ({
          ...currentState,
          isLoading: false,
          errorMessage: getErrorMessage(
            error,
            "Gagal mendapatkan senarai penghuni yang boleh ditetapkan.",
          ),
          residents: [],
        }));
      }
    }

    void loadAvailableResidents();

    return () => {
      controller.abort();
    };
  }, [residentPicker.isOpen, deferredResidentPickerSearchQuery]);

  function showNotice(nextNotice: KuartersNotice) {
    setNotice(nextNotice);
  }

  function ensureActionIsAvailable() {
    if (pendingAction) {
      showNotice({
        tone: "info",
        message: "Sila tunggu sehingga proses selesai.",
      });
      return false;
    }

    return true;
  }

  function handleFilterQueryChange(value: string) {
    setCurrentPage(1);
    setFilters((currentFilters) => ({
      ...currentFilters,
      query: value,
    }));
  }

  function handleStatusFilterChange(value: "ALL" | "OCCUPIED" | "VACANT") {
    setCurrentPage(1);
    setFilters((currentFilters) => ({
      ...currentFilters,
      status: value,
    }));
  }

  function handleClearFilter() {
    setCurrentPage(1);
    setFilters(createEmptyQuarterUnitFilters());
  }

  function handleAddUnit() {
    if (!ensureActionIsAvailable()) {
      return;
    }

    closeResidentPicker();
    setCurrentPage(1);
    setEditor({
      mode: "create",
      rowId: EMPTY_QUARTER_UNIT_ID,
      draft: createEmptyQuarterUnitDraft(),
    });
    setNotice(null);
  }

  function handleEditUnit(unit: QuarterUnitRecord) {
    if (!ensureActionIsAvailable()) {
      return;
    }

    closeResidentPicker();
    setEditor({
      mode: "edit",
      rowId: unit.id,
      draft: createDraftFromQuarterUnit(unit),
    });
    setNotice(null);
  }

  function handleDraftChange(field: keyof QuarterUnitDraft, value: string) {
    setEditor((currentEditor) => {
      if (!currentEditor) {
        return currentEditor;
      }

      return {
        ...currentEditor,
        draft: {
          ...currentEditor.draft,
          [field]: value,
        },
      };
    });
  }

  function handleCancelEdit() {
    if (pendingAction) {
      return;
    }

    closeResidentPicker();
    setEditor(null);
  }

  function handleOpenResidentPicker() {
    if (!editor || !ensureActionIsAvailable()) {
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

  function handleRequestAssignResident(unit: QuarterUnitRecord) {
    if (!ensureActionIsAvailable()) {
      return;
    }

    setEditor({
      mode: "edit",
      rowId: unit.id,
      draft: createDraftFromQuarterUnit(unit),
    });
    setNotice(null);
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

  function handleResidentPickerSearchQueryChange(value: string) {
    setResidentPicker((currentState) => ({
      ...currentState,
      searchQuery: value,
    }));
  }

  function handleAssignResident(resident: AvailableResidentRecord) {
    setEditor((currentEditor) => {
      if (!currentEditor) {
        return currentEditor;
      }

      return {
        ...currentEditor,
        draft: {
          ...currentEditor.draft,
          occupantIcNumber: resident.icNumber,
          occupantName: resident.fullName,
        },
      };
    });
    closeResidentPicker();
  }

  function handleClearAssignedResident() {
    setEditor((currentEditor) => {
      if (!currentEditor) {
        return currentEditor;
      }

      return {
        ...currentEditor,
        draft: {
          ...currentEditor.draft,
          occupantIcNumber: "",
          occupantName: "",
        },
      };
    });
    closeResidentPicker();
  }

  function handleDismissResidentPickerError() {
    setResidentPicker((currentState) => ({
      ...currentState,
      errorMessage: null,
    }));
  }

  async function handleSaveUnit() {
    if (!editor) {
      return;
    }

    const validationMessage = validateQuarterUnitDraft(editor.draft);

    if (validationMessage) {
      showNotice({
        tone: "error",
        message: validationMessage,
      });
      return;
    }

    const payload = {
      unitCode: editor.draft.unitCode.trim(),
      occupantIcNumber: editor.draft.occupantIcNumber.trim(),
    };

    try {
      setPendingUnitId(editor.rowId);
      setPendingAction("save");

      const response =
        editor.mode === "create"
          ? await fetch(`/api/quarter-categories/${initialData.id}/units`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(payload),
            })
          : await fetch(
              `/api/quarter-categories/${initialData.id}/units/${editor.rowId}`,
              {
                method: "PATCH",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
              },
            );

      const result = await parseApiResponse<QuarterUnitMutationResponse>(
        response,
        editor.mode === "create"
          ? "Gagal menambah unit kuarters."
          : "Gagal mengemas kini unit kuarters.",
      );

      const updatedUnit = result.data?.unit;

      if (!updatedUnit) {
        throw new Error("Maklumat unit kuarters yang dikemas kini tidak diterima.");
      }

      const nextUnits =
        editor.mode === "create"
          ? sortQuarterUnits([updatedUnit, ...units])
          : sortQuarterUnits(
              units.map((unit) =>
                unit.id === updatedUnit.id ? updatedUnit : unit,
              ),
            );

      setUnits(nextUnits);
      if (editor.mode === "create") {
        setCurrentPage(1);
      }
      closeResidentPicker();
      setEditor(null);
      showNotice({
        tone: "success",
        message: result.message,
      });
    } catch (error) {
      showNotice({
        tone: "error",
        message: getErrorMessage(
          error,
          editor.mode === "create"
            ? "Gagal menambah unit kuarters."
            : "Gagal mengemas kini unit kuarters.",
        ),
      });
    } finally {
      setPendingUnitId(null);
      setPendingAction(null);
    }
  }

  async function handleDeleteUnit(rowId: string) {
    if (pendingAction) {
      return;
    }

    if (rowId === EMPTY_QUARTER_UNIT_ID) {
      const shouldDiscard = window.confirm(
        "Adakah anda pasti mahu membuang baris unit baharu ini?",
      );

      if (!shouldDiscard) {
        return;
      }

      setEditor(null);
      showNotice({
        tone: "info",
        message: "Baris unit baharu telah dibuang.",
      });
      return;
    }

    const unit = units.find((item) => item.id === rowId);

    if (!unit) {
      showNotice({
        tone: "error",
        message: "Unit kuarters tidak ditemui.",
      });
      return;
    }

    const shouldDelete = window.confirm(
      `Adakah anda pasti mahu memadam unit ${unit.unitCode}? Tindakan ini tidak boleh dibatalkan.`,
    );

    if (!shouldDelete) {
      return;
    }

    try {
      setPendingUnitId(rowId);
      setPendingAction("delete");

      const response = await fetch(
        `/api/quarter-categories/${initialData.id}/units/${rowId}`,
        {
          method: "DELETE",
        },
      );

      const result = await parseApiResponse<QuarterUnitMutationResponse>(
        response,
        "Gagal memadam unit kuarters.",
      );

      const nextUnits = units.filter((item) => item.id !== rowId);

      setUnits(nextUnits);
      closeResidentPicker();
      setEditor(null);
      setCurrentPage((previousPage) => {
        const nextFilteredUnits = filterQuarterUnits(nextUnits, filters);
        const nextPagination = buildQuarterUnitPagination(
          nextFilteredUnits,
          previousPage,
          {
            hasActiveFilter: hasActiveFilters,
            totalRecords: nextUnits.length,
          },
        );

        return nextPagination.currentPage;
      });
      showNotice({
        tone: "success",
        message: result.message,
      });
    } catch (error) {
      showNotice({
        tone: "error",
        message: getErrorMessage(error, "Gagal memadam unit kuarters."),
      });
    } finally {
      setPendingUnitId(null);
      setPendingAction(null);
    }
  }

  function handleUnavailableFeature(message: string) {
    showNotice({
      tone: "info",
      message,
    });
  }

  return (
    <div className="flex flex-col gap-6 pb-8">
      <KuartersCategoryDetailHeader
        categoryName={initialData.categoryName}
        address={initialData.address}
        rates={initialData.rates}
      />
      <KuartersFeedbackBanner
        notice={notice}
        onDismiss={() => setNotice(null)}
      />
      <KuartersOverviewCards cards={buildKuartersSummaryCards(summary)} />
      <KuartersUnitsPanel
        address={initialData.address}
        categoryId={initialData.id}
        categoryName={initialData.categoryName}
        currentPage={pagination.currentPage}
        editor={editor}
        exportUnits={filteredUnits}
        filterQuery={filters.query}
        statusFilter={filters.status}
        hasActiveFilters={hasActiveFilters}
        isResidentPickerOpen={residentPicker.isOpen}
        onAddUnit={handleAddUnit}
        onCancelEdit={handleCancelEdit}
        onClearFilter={handleClearFilter}
        onDeleteUnit={handleDeleteUnit}
        onDraftChange={handleDraftChange}
        onEditUnit={handleEditUnit}
        onFilterQueryChange={handleFilterQueryChange}
        onRequestAssignResident={handleRequestAssignResident}
        onStatusFilterChange={handleStatusFilterChange}
        onOpenResidentPicker={handleOpenResidentPicker}
        onPageChange={setCurrentPage}
        onSaveUnit={handleSaveUnit}
        onUnavailableFeature={handleUnavailableFeature}
        pageItems={pagination.pageItems}
        pendingAction={pendingAction}
        pendingUnitId={pendingUnitId}
        recordSummaryText={pagination.summaryText}
        totalPages={pagination.totalPages}
        units={pagination.visibleRecords}
      />
      <KuartersResidentPickerModal
        isOpen={residentPicker.isOpen}
        isLoading={residentPicker.isLoading}
        errorMessage={residentPicker.errorMessage}
        residents={residentPicker.residents}
        searchQuery={residentPicker.searchQuery}
        selectedResidentIcNumber={editor?.draft.occupantIcNumber ?? ""}
        onAssignResident={handleAssignResident}
        onClearSelection={handleClearAssignedResident}
        onClose={closeResidentPicker}
        onDismissError={handleDismissResidentPickerError}
        onSearchQueryChange={handleResidentPickerSearchQueryChange}
      />
    </div>
  );
}
