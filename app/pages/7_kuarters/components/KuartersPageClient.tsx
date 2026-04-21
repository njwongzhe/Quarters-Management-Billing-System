"use client";

import { useState } from "react";

import KuartersClassRatesPanel from "./KuartersClassRatesPanel";
import KuartersFeedbackBanner from "./KuartersFeedbackBanner";
import KuartersOverviewCards from "./KuartersOverviewCards";
import KuartersPageHeader from "./KuartersPageHeader";
import {
  buildKuartersSummaryCards,
  buildQuarterClassPagination,
  createEmptyQuarterClassFilters,
  createDraftFromQuarterClass,
  createEmptyQuarterClassDraft,
  EMPTY_QUARTER_CLASS_ID,
  filterQuarterClasses,
  hasActiveQuarterClassFilters,
  sortQuarterClasses,
  type KuartersEditorState,
  type KuartersNotice,
  type KuartersPageInitialData,
  type QuarterClassMutationResponse,
  type QuarterClassRecord,
  type QuarterClassDraft,
  validateQuarterClassDraft,
} from "./kuartersHelpers";

type PendingAction = "save" | "delete" | null;
type KuartersPageClientProps = {
  initialData: KuartersPageInitialData;
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

export default function KuartersPageClient({
  initialData,
  initialNotice = null,
}: KuartersPageClientProps) {
  const [summary] = useState(initialData.summary);
  const [quarterClasses, setQuarterClasses] = useState<QuarterClassRecord[]>(
    initialData.quarterClasses,
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [editor, setEditor] = useState<KuartersEditorState | null>(null);
  const [filters, setFilters] = useState(createEmptyQuarterClassFilters);
  const [notice, setNotice] = useState<KuartersNotice | null>(initialNotice);
  const [pendingRowId, setPendingRowId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const hasActiveFilters = hasActiveQuarterClassFilters(filters);
  const filteredQuarterClasses = filterQuarterClasses(quarterClasses, filters);
  const pagination = buildQuarterClassPagination(
    filteredQuarterClasses,
    currentPage,
    {
      hasActiveFilter: hasActiveFilters,
      totalRecords: quarterClasses.length,
    },
  );

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

  function handleAddRow() {
    if (!ensureActionIsAvailable()) {
      return;
    }

    setCurrentPage(1);
    setEditor({
      mode: "create",
      rowId: EMPTY_QUARTER_CLASS_ID,
      draft: createEmptyQuarterClassDraft(),
    });
    setNotice(null);
  }

  function handleEditRow(quarterClass: QuarterClassRecord) {
    if (!ensureActionIsAvailable()) {
      return;
    }

    setEditor({
      mode: "edit",
      rowId: quarterClass.id,
      draft: createDraftFromQuarterClass(quarterClass),
    });
    setNotice(null);
  }

  function handleDraftChange(field: keyof QuarterClassDraft, value: string) {
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

    setEditor(null);
  }

  function handleFilterQueryChange(value: string) {
    setCurrentPage(1);
    setFilters((currentFilters) => ({
      ...currentFilters,
      classNameQuery: value,
    }));
  }

  function handleClearFilter() {
    setCurrentPage(1);
    setFilters(createEmptyQuarterClassFilters());
  }

  async function handleSaveRow() {
    if (!editor) {
      return;
    }

    const validationMessage = validateQuarterClassDraft(editor.draft, {
      requireClassName: editor.mode === "create",
    });

    if (validationMessage) {
      showNotice({
        tone: "error",
        message: validationMessage,
      });
      return;
    }

    const payload =
      editor.mode === "create"
        ? {
            kelas: editor.draft.className.trim(),
            sewa: editor.draft.rentalPrice.trim(),
            senggara: editor.draft.maintenancePrice.trim(),
            penalti: editor.draft.penaltyPrice.trim(),
          }
        : {
            sewa: editor.draft.rentalPrice.trim(),
            senggara: editor.draft.maintenancePrice.trim(),
            penalti: editor.draft.penaltyPrice.trim(),
          };

    try {
      setPendingRowId(editor.rowId);
      setPendingAction("save");

      const response =
        editor.mode === "create"
          ? await fetch("/api/quarter-classes", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(payload),
            })
          : await fetch(`/api/quarter-classes/${editor.rowId}`, {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(payload),
            });

      const result = await parseApiResponse<QuarterClassMutationResponse>(
        response,
        editor.mode === "create"
          ? "Gagal menambah kelas kuarters."
          : "Gagal mengemas kini kelas kuarters.",
      );

      const updatedQuarterClass = result.data?.quarterClass;

      if (!updatedQuarterClass) {
        throw new Error("Maklumat kelas kuarters yang dikemas kini tidak diterima.");
      }

      const nextQuarterClasses =
        editor.mode === "create"
          ? sortQuarterClasses([updatedQuarterClass, ...quarterClasses])
          : quarterClasses.map((quarterClass) =>
              quarterClass.id === updatedQuarterClass.id
                ? updatedQuarterClass
                : quarterClass,
            );

      setQuarterClasses(nextQuarterClasses);
      if (editor.mode === "create") {
        setCurrentPage(1);
      }
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
            ? "Gagal menambah kelas kuarters."
            : "Gagal mengemas kini kelas kuarters.",
        ),
      });
    } finally {
      setPendingRowId(null);
      setPendingAction(null);
    }
  }

  async function handleDeleteRow(rowId: string) {
    if (pendingAction) {
      return;
    }

    if (rowId === EMPTY_QUARTER_CLASS_ID) {
      const shouldDiscard = window.confirm(
        "Adakah anda pasti mahu membuang baris kelas baharu ini?",
      );

      if (!shouldDiscard) {
        return;
      }

      setEditor(null);
      showNotice({
        tone: "info",
        message: "Baris kelas baharu telah dibuang.",
      });
      return;
    }

    const quarterClass = quarterClasses.find((item) => item.id === rowId);

    if (!quarterClass) {
      showNotice({
        tone: "error",
        message: "Kelas kuarters tidak ditemui.",
      });
      return;
    }

    const shouldDelete = window.confirm(
      `Adakah anda pasti mahu memadam ${quarterClass.className}? Tindakan ini tidak boleh dibatalkan.`,
    );

    if (!shouldDelete) {
      return;
    }

    try {
      setPendingRowId(rowId);
      setPendingAction("delete");

      const response = await fetch(`/api/quarter-classes/${rowId}`, {
        method: "DELETE",
      });
      const result = await parseApiResponse<QuarterClassMutationResponse>(
        response,
        "Gagal memadam kelas kuarters.",
      );

      const nextQuarterClasses = quarterClasses.filter((item) => item.id !== rowId);

      setQuarterClasses(nextQuarterClasses);
      setEditor(null);
      setCurrentPage((previousPage) => {
        const nextFilteredQuarterClasses = filterQuarterClasses(
          nextQuarterClasses,
          filters,
        );
        const nextPagination = buildQuarterClassPagination(
          nextFilteredQuarterClasses,
          previousPage,
          {
            hasActiveFilter: hasActiveFilters,
            totalRecords: nextQuarterClasses.length,
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
        message: getErrorMessage(error, "Gagal memadam kelas kuarters."),
      });
    } finally {
      setPendingRowId(null);
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
      <KuartersPageHeader />
      <KuartersFeedbackBanner
        notice={notice}
        onDismiss={() => setNotice(null)}
      />
      <KuartersOverviewCards cards={buildKuartersSummaryCards(summary)} />
      <KuartersClassRatesPanel
        currentPage={pagination.currentPage}
        editor={editor}
        filterQuery={filters.classNameQuery}
        hasActiveFilters={hasActiveFilters}
        onCancelEdit={handleCancelEdit}
        pendingAction={pendingAction}
        pendingRowId={pendingRowId}
        pageItems={pagination.pageItems}
        rates={pagination.visibleRecords}
        recordSummaryText={pagination.summaryText}
        onAddRow={handleAddRow}
        onClearFilter={handleClearFilter}
        onDeleteRow={handleDeleteRow}
        onDraftChange={handleDraftChange}
        onEditRow={handleEditRow}
        onFilterQueryChange={handleFilterQueryChange}
        onPageChange={setCurrentPage}
        onSaveRow={handleSaveRow}
        onUnavailableFeature={handleUnavailableFeature}
        totalPages={pagination.totalPages}
      />
    </div>
  );
}
