"use client";

import { useEffect, useState } from "react";
import KuartersFeedbackBanner from "@/app/pages/7_kuarters/components/KuartersFeedbackBanner";
import type { KuartersNotice } from "@/app/pages/7_kuarters/components/kuartersHelpers";
import {
  type ExtractedQuarterRecord,
  type ExtractedQuarterUnit,
  QUARTER_CATEGORIES_PER_PAGE,
  QUARTER_UNITS_PER_PAGE,
} from "../../../../components/extract-review-shared";
import { getKuartersRecordKey, getUnitKey } from "./helpers";
import KuartersCategoryTable from "./KuartersCategoryTable";
import KuartersUnitPanel from "./KuartersUnitPanel";
import type { KuartersCategoryDraft, KuartersPriceField } from "./types";

type KuartersReviewTableProps = {
  records: ExtractedQuarterRecord[];
  onRecordsChange?: (records: ExtractedQuarterRecord[]) => Promise<void>;
  onCategoryChange?: (params: {
    categoryId: string;
    categoryName: string;
    address: string;
    rentalPrice: string;
    maintenancePrice: string;
    penaltyPrice: string;
  }) => Promise<void>;
  onUnitChange?: (params: {
    categoryId: string;
    unitId: string;
    unitCode: string;
  }) => Promise<void>;
  selectedKeys?: string[];
  onSelectedKeysChange?: (keys: string[]) => void;
};

export default function KuartersReviewTable({
  records,
  onRecordsChange,
  onCategoryChange,
  onUnitChange,
  selectedKeys = [],
  onSelectedKeysChange,
}: KuartersReviewTableProps) {
  const categories = records;
  const [categoryDrafts, setCategoryDrafts] = useState<
    Record<string, KuartersCategoryDraft>
  >({});
  const [unitDrafts, setUnitDrafts] = useState<Record<string, string>>({});
  const [selectedCategoryId, setSelectedCategoryId] = useState(
    records[0]?.id ?? "",
  );
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingUnitKey, setEditingUnitKey] = useState<string | null>(null);
  const [savingTarget, setSavingTarget] = useState<string | null>(null);
  const [notice, setNotice] = useState<KuartersNotice | null>(null);
  const [categoryPage, setCategoryPage] = useState(1);
  const [unitPage, setUnitPage] = useState(1);
  const isSaving = savingTarget !== null;

  const selectedCategory =
    categories.find((category) => category.id === selectedCategoryId) ??
    categories[0] ??
    null;
  const resolvedSelectedCategoryId = selectedCategory?.id ?? "";
  const totalCategoryPages = Math.max(
    1,
    Math.ceil(categories.length / QUARTER_CATEGORIES_PER_PAGE),
  );
  const safeCategoryPage = Math.min(categoryPage, totalCategoryPages);
  const categoryStartIndex = (safeCategoryPage - 1) * QUARTER_CATEGORIES_PER_PAGE;
  const pageCategories = categories.slice(
    categoryStartIndex,
    categoryStartIndex + QUARTER_CATEGORIES_PER_PAGE,
  );
  const categoryDisplayStart = categories.length === 0 ? 0 : categoryStartIndex + 1;
  const categoryDisplayEnd = categoryStartIndex + pageCategories.length;
  const units = selectedCategory?.units ?? [];
  const totalUnitPages = Math.max(1, Math.ceil(units.length / QUARTER_UNITS_PER_PAGE));
  const safeUnitPage = Math.min(unitPage, totalUnitPages);
  const unitStartIndex = (safeUnitPage - 1) * QUARTER_UNITS_PER_PAGE;
  const pageUnits = units.slice(
    unitStartIndex,
    unitStartIndex + QUARTER_UNITS_PER_PAGE,
  );
  const unitDisplayStart = units.length === 0 ? 0 : unitStartIndex + 1;
  const unitDisplayEnd = unitStartIndex + pageUnits.length;
  const selectedKeySet = new Set(selectedKeys);
  const allCategoryKeys = categories
    .filter(isSelectableCategory)
    .map(getKuartersRecordKey);
  const isAllCategoriesSelected =
    allCategoryKeys.length > 0 &&
    allCategoryKeys.every((key) => selectedKeySet.has(key));
  const allSelectedCategoryUnitKeys = units
    .filter(isSelectableUnit)
    .map(getUnitKey);
  const isAllSelectedCategoryUnitsSelected =
    allSelectedCategoryUnitKeys.length > 0 &&
    allSelectedCategoryUnitKeys.every((key) => selectedKeySet.has(key));

  const showNotice = (noticeTone: KuartersNotice["tone"], message: string) => {
    setNotice({ tone: noticeTone, message });
  };

  const getSaveErrorMessage = (error: unknown, fallbackMessage: string) =>
    error instanceof Error ? error.message : fallbackMessage;

  useEffect(() => {
    if (!editingCategoryId && !editingUnitKey) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (isSaving) {
        return;
      }

      const target = event.target;

      if (!(target instanceof Element)) {
        setEditingCategoryId(null);
        setEditingUnitKey(null);
        return;
      }

      if (target.closest("[data-kuarters-editor='true']")) {
        return;
      }

      setEditingCategoryId(null);
      setEditingUnitKey(null);
    };

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [editingCategoryId, editingUnitKey, isSaving]);

  const selectCategory = (categoryId: string) => {
    if (isSaving) {
      return;
    }

    setSelectedCategoryId(categoryId);
    setUnitPage(1);
    setEditingUnitKey(null);
  };

  const toggleSelectedCategory = (
    category: ExtractedQuarterRecord,
    checked: boolean,
  ) => {
    if (isSaving) {
      return;
    }

    const categoryKey = getKuartersRecordKey(category);
    const nextKeys = new Set(selectedKeys);
    const unitKeys = category.units.map(getUnitKey);
    const selectableUnitKeys = category.units.filter(isSelectableUnit).map(getUnitKey);

    if (checked) {
      if (isSelectableCategory(category)) {
        nextKeys.add(categoryKey);
      }
      unitKeys.forEach((key) => nextKeys.delete(key));
      selectableUnitKeys.forEach((key) => nextKeys.add(key));
    } else {
      nextKeys.delete(categoryKey);
      unitKeys.forEach((key) => nextKeys.delete(key));
    }

    onSelectedKeysChange?.([...nextKeys]);
  };

  const toggleAllCategories = (checked: boolean) => {
    if (isSaving) {
      return;
    }

    const nextKeys = new Set(selectedKeys);

    categories.forEach((category) => {
      const categoryKey = getKuartersRecordKey(category);
      const unitKeys = category.units.map(getUnitKey);
      const selectableUnitKeys = category.units
        .filter(isSelectableUnit)
        .map(getUnitKey);

      if (checked) {
        if (isSelectableCategory(category)) {
          nextKeys.add(categoryKey);
        }
        unitKeys.forEach((key) => nextKeys.delete(key));
        selectableUnitKeys.forEach((key) => nextKeys.add(key));
      } else {
        nextKeys.delete(categoryKey);
        unitKeys.forEach((key) => nextKeys.delete(key));
      }
    });

    onSelectedKeysChange?.([...nextKeys]);
  };

  const toggleSelectedUnit = (unitKey: string, checked: boolean) => {
    if (isSaving) {
      return;
    }

    const nextKeys = new Set(selectedKeys);

    if (checked) {
      nextKeys.add(unitKey);
    } else {
      nextKeys.delete(unitKey);
    }

    onSelectedKeysChange?.([...nextKeys]);
  };

  const toggleAllSelectedCategoryUnits = (checked: boolean) => {
    if (isSaving) {
      return;
    }

    const nextKeys = new Set(selectedKeys);

    allSelectedCategoryUnitKeys.forEach((key) => {
      if (checked) {
        nextKeys.add(key);
      } else {
        nextKeys.delete(key);
      }
    });

    onSelectedKeysChange?.([...nextKeys]);
  };

  const startCategoryEdit = (category: ExtractedQuarterRecord) => {
    if (isSaving) {
      return;
    }

    setCategoryDrafts((currentDrafts) => ({
      ...currentDrafts,
      [category.id]: {
        categoryName: category.categoryName,
        address: category.address,
        rentalPrice: category.rentalPrice,
        maintenancePrice: category.maintenancePrice,
        penaltyPrice: category.penaltyPrice,
      },
    }));
    setEditingCategoryId(category.id);
  };

  const updateCategoryDraft = (
    categoryId: string,
    field: KuartersPriceField,
    value: string,
  ) => {
    if (isSaving) {
      return;
    }

    setCategoryDrafts((currentDrafts) => ({
      ...currentDrafts,
      [categoryId]: {
        categoryName: currentDrafts[categoryId]?.categoryName ?? "",
        address: currentDrafts[categoryId]?.address ?? "",
        rentalPrice: currentDrafts[categoryId]?.rentalPrice ?? "",
        maintenancePrice: currentDrafts[categoryId]?.maintenancePrice ?? "",
        penaltyPrice: currentDrafts[categoryId]?.penaltyPrice ?? "",
        [field]: value,
      },
    }));
  };

  const saveCategory = async (categoryId: string) => {
    if (isSaving) {
      return;
    }

    const draft = categoryDrafts[categoryId];
    const targetCategory = categories.find((category) => category.id === categoryId);

    if (!draft || !targetCategory) {
      setEditingCategoryId(null);
      return;
    }

    const nextCategories = categories.map((category) =>
      category.id === categoryId ? { ...category, ...draft } : category,
    );

    setSavingTarget(`category:${categoryId}`);
    try {
      if (onCategoryChange && targetCategory.categoryId) {
        await onCategoryChange({
          categoryId: targetCategory.categoryId,
          categoryName: draft.categoryName,
          address: draft.address,
          rentalPrice: draft.rentalPrice,
          maintenancePrice: draft.maintenancePrice,
          penaltyPrice: draft.penaltyPrice,
        });
      } else {
        await onRecordsChange?.(nextCategories);
      }
      setEditingCategoryId(null);
      showNotice("success", "Perubahan kategori kuarters berjaya disimpan.");
    } catch (error) {
      showNotice(
        "error",
        getSaveErrorMessage(error, "Gagal menyimpan perubahan kategori kuarters."),
      );
    } finally {
      setSavingTarget(null);
    }
  };

  const cancelEditing = () => {
    if (isSaving) {
      return;
    }

    setEditingCategoryId(null);
    setEditingUnitKey(null);
  };

  const startUnitEdit = (unitKey: string, unitCode: string) => {
    if (isSaving) {
      return;
    }

    setUnitDrafts((currentDrafts) => ({
      ...currentDrafts,
      [unitKey]: unitCode,
    }));
    setEditingUnitKey(unitKey);
  };

  const saveUnit = async (unitKey: string) => {
    if (isSaving) {
      return;
    }

    const draftUnitCode = unitDrafts[unitKey];

    if (!draftUnitCode || !selectedCategory) {
      setEditingUnitKey(null);
      return;
    }

    const targetUnit = selectedCategory.units.find(
      (unit) => getUnitKey(unit) === unitKey,
    );

    if (!targetUnit?.unitId || !selectedCategory.categoryId) {
      showNotice("error", "Maklumat unit kuarters tidak lengkap untuk dikemas kini.");
      return;
    }

    setSavingTarget(`unit:${unitKey}`);
    try {
      await onUnitChange?.({
        categoryId: selectedCategory.categoryId,
        unitId: targetUnit.unitId,
        unitCode: draftUnitCode,
      });
      setEditingUnitKey(null);
      showNotice("success", "Perubahan unit kuarters berjaya disimpan.");
    } catch (error) {
      showNotice(
        "error",
        getSaveErrorMessage(error, "Gagal menyimpan perubahan unit kuarters."),
      );
    } finally {
      setSavingTarget(null);
    }
  };

  return (
    <>
      <div
        className="mb-6 grid overflow-hidden rounded-2xl border border-light-grey/20 bg-white lg:grid-cols-[1fr_260px]"
      >
        <KuartersCategoryTable
          categories={categories}
          pageCategories={pageCategories}
          selectedCategoryId={resolvedSelectedCategoryId}
          selectedKeys={selectedKeySet}
          isAllSelected={isAllCategoriesSelected}
          editingCategoryId={editingCategoryId}
          savingCategoryId={
            savingTarget?.startsWith("category:") ? savingTarget.slice(9) : null
          }
          isSaving={isSaving}
          categoryDrafts={categoryDrafts}
          currentPage={safeCategoryPage}
          totalPages={totalCategoryPages}
          displayStart={categoryDisplayStart}
          displayEnd={categoryDisplayEnd}
          onPageChange={(page) => {
            if (!isSaving) {
              setCategoryPage(page);
            }
          }}
          onSelectCategory={selectCategory}
          onToggleCategory={toggleSelectedCategory}
          onToggleAllCategories={toggleAllCategories}
          onStartEdit={startCategoryEdit}
          onUpdateDraft={updateCategoryDraft}
          onSaveCategory={saveCategory}
          onCancelEdit={cancelEditing}
        />

        <KuartersUnitPanel
          units={units}
          pageUnits={pageUnits}
          unitDrafts={unitDrafts}
          editingUnitKey={editingUnitKey}
          savingUnitKey={
            savingTarget?.startsWith("unit:") ? savingTarget.slice(5) : null
          }
          isSaving={isSaving}
          selectedKeys={selectedKeySet}
          isAllSelected={isAllSelectedCategoryUnitsSelected}
          currentPage={safeUnitPage}
          totalPages={totalUnitPages}
          displayStart={unitDisplayStart}
          displayEnd={unitDisplayEnd}
          onPageChange={(page) => {
            if (!isSaving) {
              setUnitPage(page);
            }
          }}
          onDraftsChange={setUnitDrafts}
          onToggleUnit={toggleSelectedUnit}
          onToggleAllUnits={toggleAllSelectedCategoryUnits}
          onStartEdit={startUnitEdit}
          onSaveUnit={saveUnit}
          onCancelEdit={cancelEditing}
        />
      </div>
      <KuartersFeedbackBanner notice={notice} onDismiss={() => setNotice(null)} />
    </>
  );
}

function isSelectableUnit(unit: ExtractedQuarterUnit) {
  return !unit.isExisted && !unit.originalUnitId;
}

function isSelectableCategory(category: ExtractedQuarterRecord) {
  return !category.categoryIsExisted && !category.originalCategoryId;
}
