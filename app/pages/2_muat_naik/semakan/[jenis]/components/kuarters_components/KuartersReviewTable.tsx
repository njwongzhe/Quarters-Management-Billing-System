"use client";

import { useEffect, useState } from "react";
import {
  type ExtractedQuarterRecord,
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
  selectedKeys?: string[];
  onSelectedKeysChange?: (keys: string[]) => void;
};

export default function KuartersReviewTable({
  records,
  onRecordsChange,
  selectedKeys = [],
  onSelectedKeysChange,
}: KuartersReviewTableProps) {
  const [categories, setCategories] = useState<ExtractedQuarterRecord[]>(records);
  const [categoryDrafts, setCategoryDrafts] = useState<
    Record<string, KuartersCategoryDraft>
  >({});
  const [unitDrafts, setUnitDrafts] = useState<Record<string, string>>({});
  const [selectedCategoryId, setSelectedCategoryId] = useState(
    records[0]?.id ?? "",
  );
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingUnitKey, setEditingUnitKey] = useState<string | null>(null);
  const [categoryPage, setCategoryPage] = useState(1);
  const [unitPage, setUnitPage] = useState(1);

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
  const allCategoryKeys = categories.map(getKuartersRecordKey);
  const isAllCategoriesSelected =
    allCategoryKeys.length > 0 &&
    allCategoryKeys.every((key) => selectedKeySet.has(key));

  useEffect(() => {
    if (!editingCategoryId && !editingUnitKey) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
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
  }, [editingCategoryId, editingUnitKey]);

  const selectCategory = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
    setUnitPage(1);
    setEditingUnitKey(null);
  };

  const toggleSelectedCategory = (categoryKey: string, checked: boolean) => {
    const nextKeys = new Set(selectedKeys);

    if (checked) {
      nextKeys.add(categoryKey);
    } else {
      nextKeys.delete(categoryKey);
    }

    onSelectedKeysChange?.([...nextKeys]);
  };

  const toggleAllCategories = (checked: boolean) => {
    const nextKeys = new Set(selectedKeys);

    allCategoryKeys.forEach((key) => {
      if (checked) {
        nextKeys.add(key);
      } else {
        nextKeys.delete(key);
      }
    });

    onSelectedKeysChange?.([...nextKeys]);
  };

  const startCategoryEdit = (category: ExtractedQuarterRecord) => {
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
    const draft = categoryDrafts[categoryId];

    if (!draft) {
      setEditingCategoryId(null);
      return;
    }

    const nextCategories = categories.map((category) =>
      category.id === categoryId ? { ...category, ...draft } : category,
    );

    try {
      await onRecordsChange?.(nextCategories);
      setCategories(nextCategories);
      setEditingCategoryId(null);
    } catch {
      // Keep edit mode open; the parent displays the backend error message.
    }
  };

  const cancelEditing = () => {
    setEditingCategoryId(null);
    setEditingUnitKey(null);
  };

  const startUnitEdit = (unitKey: string, unitCode: string) => {
    setUnitDrafts((currentDrafts) => ({
      ...currentDrafts,
      [unitKey]: unitCode,
    }));
    setEditingUnitKey(unitKey);
  };

  const saveUnit = async (unitKey: string) => {
    const draftUnitCode = unitDrafts[unitKey];

    if (!draftUnitCode || !selectedCategory) {
      setEditingUnitKey(null);
      return;
    }

    const nextCategories = categories.map((category) =>
      category.id === selectedCategory.id
        ? {
            ...category,
            units: category.units.map((unit) =>
              getUnitKey(unit) === unitKey
                ? { ...unit, unitCode: draftUnitCode }
                : unit,
            ),
          }
        : category,
    );

    try {
      await onRecordsChange?.(nextCategories);
      setCategories(nextCategories);
      setEditingUnitKey(null);
    } catch {
      // Keep edit mode open; the parent displays the backend error message.
    }
  };

  return (
    <div
      className="grid overflow-hidden rounded-2xl border border-light-grey/20 bg-white lg:grid-cols-[1fr_260px]"
    >
      <KuartersCategoryTable
        categories={categories}
        pageCategories={pageCategories}
        selectedCategoryId={resolvedSelectedCategoryId}
        selectedKeys={selectedKeySet}
        isAllSelected={isAllCategoriesSelected}
        editingCategoryId={editingCategoryId}
        categoryDrafts={categoryDrafts}
        currentPage={safeCategoryPage}
        totalPages={totalCategoryPages}
        displayStart={categoryDisplayStart}
        displayEnd={categoryDisplayEnd}
        onPageChange={setCategoryPage}
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
        currentPage={safeUnitPage}
        totalPages={totalUnitPages}
        displayStart={unitDisplayStart}
        displayEnd={unitDisplayEnd}
        onPageChange={setUnitPage}
        onDraftsChange={setUnitDrafts}
        onStartEdit={startUnitEdit}
        onSaveUnit={saveUnit}
        onCancelEdit={cancelEditing}
      />
    </div>
  );
}
