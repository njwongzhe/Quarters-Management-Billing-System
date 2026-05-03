"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import KuartersCategoryRatesPanel from "./KuartersCategoryRatesPanel";
import KuartersFeedbackBanner from "./KuartersFeedbackBanner";
import KuartersOverviewCards from "./KuartersOverviewCards";
import KuartersPageHeader from "./KuartersPageHeader";
import {
  buildKuartersSummaryCards,
  buildQuarterCategoryPagination,
  createEmptyQuarterCategoryFilters,
  createDraftFromQuarterCategory,
  createEmptyQuarterCategoryDraft,
  EMPTY_QUARTER_CATEGORY_ID,
  filterQuarterCategories,
  hasActiveQuarterCategoryFilters,
  sortQuarterCategories,
  type KuartersEditorState,
  type KuartersNotice,
  type KuartersPageInitialData,
  type QuarterCategoryMutationResponse,
  type QuarterCategoryRecord,
  type QuarterCategoryDraft,
  validateQuarterCategoryDraft,
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
  const router = useRouter();
  const [summary] = useState(initialData.summary);
  const [quarterCategories, setQuarterCategories] = useState<QuarterCategoryRecord[]>(
    initialData.quarterCategories,
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [editor, setEditor] = useState<KuartersEditorState | null>(null);
  const [filters, setFilters] = useState(createEmptyQuarterCategoryFilters);
  const [notice, setNotice] = useState<KuartersNotice | null>(initialNotice);
  const [pendingRowId, setPendingRowId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const hasActiveFilters = hasActiveQuarterCategoryFilters(filters);
  const filteredQuarterCategories = filterQuarterCategories(quarterCategories, filters);
  const pagination = buildQuarterCategoryPagination(
    filteredQuarterCategories,
    currentPage,
    {
      hasActiveFilter: hasActiveFilters,
      totalRecords: quarterCategories.length,
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
      rowId: EMPTY_QUARTER_CATEGORY_ID,
      draft: createEmptyQuarterCategoryDraft(),
    });
    setNotice(null);
  }

  function handleEditRow(quarterCategory: QuarterCategoryRecord) {
    if (!ensureActionIsAvailable()) {
      return;
    }

    setEditor({
      mode: "edit",
      rowId: quarterCategory.id,
      draft: createDraftFromQuarterCategory(quarterCategory),
    });
    setNotice(null);
  }

  function handleDraftChange(field: keyof QuarterCategoryDraft, value: string) {
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
      categoryNameQuery: value,
    }));
  }

  function handleClearFilter() {
    setCurrentPage(1);
    setFilters(createEmptyQuarterCategoryFilters());
  }

  async function handleSaveRow() {
    if (!editor) {
      return;
    }

    const validationMessage = validateQuarterCategoryDraft(editor.draft, {
      requireCategoryName: true,
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
            kategori: editor.draft.categoryName.trim(),
            alamat: editor.draft.address.trim(),
            sewa: editor.draft.rentalPrice.trim(),
            senggara: editor.draft.maintenancePrice.trim(),
            penalti: editor.draft.penaltyPrice.trim(),
          }
        : {
            kategori: editor.draft.categoryName.trim(),
            alamat: editor.draft.address.trim(),
            sewa: editor.draft.rentalPrice.trim(),
            senggara: editor.draft.maintenancePrice.trim(),
            penalti: editor.draft.penaltyPrice.trim(),
          };

    try {
      setPendingRowId(editor.rowId);
      setPendingAction("save");

      const response =
        editor.mode === "create"
          ? await fetch("/api/quarter-categories", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(payload),
            })
          : await fetch(`/api/quarter-categories/${editor.rowId}`, {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(payload),
            });

      const result = await parseApiResponse<QuarterCategoryMutationResponse>(
        response,
        editor.mode === "create"
          ? "Gagal menambah kategori kuarters."
          : "Gagal mengemas kini kategori kuarters.",
      );

      const updatedQuarterCategory = result.data?.quarterCategory;

      if (!updatedQuarterCategory) {
        throw new Error("Maklumat kategori kuarters yang dikemas kini tidak diterima.");
      }

      const nextQuarterCategories =
        editor.mode === "create"
          ? sortQuarterCategories([updatedQuarterCategory, ...quarterCategories])
          : quarterCategories.map((quarterCategory) =>
              quarterCategory.id === updatedQuarterCategory.id
                ? updatedQuarterCategory
                : quarterCategory,
            );

      setQuarterCategories(nextQuarterCategories);
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
            ? "Gagal menambah kategori kuarters."
            : "Gagal mengemas kini kategori kuarters.",
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

    if (rowId === EMPTY_QUARTER_CATEGORY_ID) {
      const shouldDiscard = window.confirm(
        "Adakah anda pasti mahu membuang baris kategori baharu ini?",
      );

      if (!shouldDiscard) {
        return;
      }

      setEditor(null);
      showNotice({
        tone: "info",
        message: "Baris kategori baharu telah dibuang.",
      });
      return;
    }

    const quarterCategory = quarterCategories.find((item) => item.id === rowId);

    if (!quarterCategory) {
      showNotice({
        tone: "error",
        message: "Kategori kuarters tidak ditemui.",
      });
      return;
    }

    const shouldDelete = window.confirm(
      `Adakah anda pasti mahu memadam ${quarterCategory.categoryName}? Tindakan ini tidak boleh dibatalkan.`,
    );

    if (!shouldDelete) {
      return;
    }

    try {
      setPendingRowId(rowId);
      setPendingAction("delete");

      const response = await fetch(`/api/quarter-categories/${rowId}`, {
        method: "DELETE",
      });
      const result = await parseApiResponse<QuarterCategoryMutationResponse>(
        response,
        "Gagal memadam kategori kuarters.",
      );

      const nextQuarterCategories = quarterCategories.filter((item) => item.id !== rowId);

      setQuarterCategories(nextQuarterCategories);
      setEditor(null);
      setCurrentPage((previousPage) => {
        const nextFilteredQuarterCategories = filterQuarterCategories(
          nextQuarterCategories,
          filters,
        );
        const nextPagination = buildQuarterCategoryPagination(
          nextFilteredQuarterCategories,
          previousPage,
          {
            hasActiveFilter: hasActiveFilters,
            totalRecords: nextQuarterCategories.length,
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
        message: getErrorMessage(error, "Gagal memadam kategori kuarters."),
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

  function handleViewRow(quarterCategory: QuarterCategoryRecord) {
    if (!ensureActionIsAvailable()) {
      return;
    }

    router.push(`/pages/7_kuarters/${quarterCategory.id}`);
  }

  return (
    <div className="flex flex-col gap-6 pb-8">
      <KuartersPageHeader />
      <KuartersFeedbackBanner
        notice={notice}
        onDismiss={() => setNotice(null)}
      />
      <KuartersOverviewCards cards={buildKuartersSummaryCards(summary)} />
      <KuartersCategoryRatesPanel
        currentPage={pagination.currentPage}
        editor={editor}
        filterQuery={filters.categoryNameQuery}
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
        onViewRow={handleViewRow}
        totalPages={pagination.totalPages}
      />
    </div>
  );
}
