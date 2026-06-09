"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import GlobalFixedMessage from "@/app/components/Message/GlobalFixedMessage";
import type { GlobalFixedNotice } from "@/app/components/Message/GlobalFixedMessage";
import Icon, { commonIcons } from "@/app/components/Icon/Icon";
import ToolbarButton from "@/app/components/ToolbarIconButton";
import { InputField as SharedInputField } from "@/app/components/InputField";
import { downloadXlsxFile, type XlsxCell, type XlsxSheet } from "@/lib/download/xlsx-export";

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
  onCategoryDelete?: (params: { categoryId: string }) => Promise<void>;
  onUnitDelete?: (params: {
    categoryId: string;
    unitId: string;
  }) => Promise<void>;
  selectedKeys?: string[];
  onSelectedKeysChange?: (keys: string[]) => void;
  isLoading?: boolean;
  onFilteredStatsChange?: (stats: {
    recordCount?: number;
    totalAmount?: string;
    totalUnits?: number;
    categoryCount?: number;
  }) => void;
};

export default function KuartersReviewTable({
  records,
  onRecordsChange,
  onCategoryChange,
  onUnitChange,
  onCategoryDelete,
  onUnitDelete,
  selectedKeys = [],
  onSelectedKeysChange,
  isLoading = false,
  onFilteredStatsChange,
}: KuartersReviewTableProps) {
  const [savedRecords, setSavedRecords] = useState(records);
  const categories = savedRecords;

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
  const [notice, setNotice] = useState<GlobalFixedNotice | null>(null);
  const [categoryPage, setCategoryPage] = useState(1);
  const [unitPage, setUnitPage] = useState(1);
  const isSaving = savingTarget !== null;

  // Search State
  const [filterQuery, setFilterQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const searchInputRef = useRef<HTMLDivElement | null>(null);

  const isSearchFilterActive = filterQuery.trim().length > 0;

  // Filtered Categories
  const filteredCategories = useMemo(() => {
    return savedRecords.filter((category) => {
      // 1. Search Query Filter
      if (filterQuery.trim()) {
        const query = filterQuery.toLowerCase().trim();
        const nameMatch = (category.categoryName || "").toLowerCase().includes(query);
        const addressMatch = (category.address || "").toLowerCase().includes(query);
        const unitsMatch = category.units.some((u) => (u.unitCode || "").toLowerCase().includes(query));
        if (!nameMatch && !addressMatch && !unitsMatch) {
          return false;
        }
      }

      return true;
    });
  }, [savedRecords, filterQuery]);

  // Filtered Units of Selected Category
  const filteredUnits = useMemo(() => {
    const selectedCat =
      filteredCategories.find((category) => category.id === selectedCategoryId) ??
      filteredCategories[0] ??
      null;

    if (!selectedCat) {
      return [];
    }

    return selectedCat.units.filter((unit) => {
      // 1. Search Query Filter
      if (filterQuery.trim()) {
        const query = filterQuery.toLowerCase().trim();
        const categoryNameMatch = (selectedCat.categoryName || "").toLowerCase().includes(query);
        const addressMatch = (selectedCat.address || "").toLowerCase().includes(query);
        const unitCodeMatch = (unit.unitCode || "").toLowerCase().includes(query);
        if (!categoryNameMatch && !addressMatch && !unitCodeMatch) {
          return false;
        }
      }

      return true;
    });
  }, [filteredCategories, selectedCategoryId, filterQuery]);

  const selectedCategory =
    filteredCategories.find((category) => category.id === selectedCategoryId) ??
    filteredCategories[0] ??
    null;
  const resolvedSelectedCategoryId = selectedCategory?.id ?? "";

  const totalCategoryPages = Math.max(
    1,
    Math.ceil(filteredCategories.length / QUARTER_CATEGORIES_PER_PAGE),
  );
  const safeCategoryPage = Math.min(categoryPage, totalCategoryPages);
  const categoryStartIndex = (safeCategoryPage - 1) * QUARTER_CATEGORIES_PER_PAGE;
  const pageCategories = filteredCategories.slice(
    categoryStartIndex,
    categoryStartIndex + QUARTER_CATEGORIES_PER_PAGE,
  );
  const categoryDisplayStart = filteredCategories.length === 0 ? 0 : categoryStartIndex + 1;
  const categoryDisplayEnd = categoryStartIndex + pageCategories.length;

  const units = filteredUnits;
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
  const allCategoryKeys = filteredCategories
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

  const showNotice = (noticeTone: GlobalFixedNotice["tone"], message: string) => {
    setNotice({ tone: noticeTone, message });
  };

  const getSaveErrorMessage = (error: unknown, fallbackMessage: string) =>
    error instanceof Error ? error.message : fallbackMessage;

  useEffect(() => {
    setSavedRecords(records);
    setEditingCategoryId(null);
    setEditingUnitKey(null);
  }, [records]);

  // Handle pointer down outside edit forms
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

  useEffect(() => {
    if (isSearchOpen) {
      searchInputRef.current?.querySelector("input")?.focus();
    }
  }, [isSearchOpen]);

  useEffect(() => {
    const totalUnitsCount = filteredCategories.reduce((sum, cat) => {
      const matchingUnitsCount = cat.units.filter((unit) => {
        if (filterQuery.trim()) {
          const query = filterQuery.toLowerCase().trim();
          const categoryNameMatch = (cat.categoryName || "").toLowerCase().includes(query);
          const addressMatch = (cat.address || "").toLowerCase().includes(query);
          const unitCodeMatch = (unit.unitCode || "").toLowerCase().includes(query);
          return categoryNameMatch || addressMatch || unitCodeMatch;
        }
        return true;
      }).length;
      return sum + matchingUnitsCount;
    }, 0);

    onFilteredStatsChange?.({
      categoryCount: filteredCategories.length,
      totalUnits: totalUnitsCount,
    });
  }, [filteredCategories, filterQuery, onFilteredStatsChange]);

  function handleToggleSearch() {
    if (isSearchOpen) {
      setFilterQuery("");
      setIsSearchOpen(false);
      return;
    }
    setIsSearchOpen(true);
  }

  function handleClearSearch() {
    setFilterQuery("");
    setIsSearchOpen(false);
  }

  const handleDownload = () => {
    const headers: XlsxCell[] = [
      { value: "Kategori Kuarters", style: "header" },
      { value: "Alamat", style: "header" },
      { value: "Kadar Sewa (RM)", style: "header", align: "right" },
      { value: "Kadar Senggara (RM)", style: "header", align: "right" },
      { value: "Kadar Penalti (RM)", style: "header", align: "right" },
      { value: "ID Unit", style: "header" },
      { value: "Status", style: "header", align: "center" },
    ];

    const rows: XlsxSheet["rows"] = [];
    filteredCategories.forEach((category) => {
      const categoryStatus = category.categoryIsExisted ? "Kategori Sedia Ada" : "Baharu";

      if (category.units.length === 0) {
        rows.push([
          category.categoryName || "N/A",
          category.address || "N/A",
          { value: Number(category.rentalPrice) || 0, type: "number", align: "right" },
          { value: Number(category.maintenancePrice) || 0, type: "number", align: "right" },
          { value: Number(category.penaltyPrice) || 0, type: "number", align: "right" },
          "N/A",
          { value: categoryStatus, align: "center" },
        ]);
      } else {
        category.units.forEach((unit) => {
          const unitStatus = unit.isExisted ? "Unit Sedia Ada" : category.categoryIsExisted ? "Kategori Sedia Ada" : "Baharu";
          rows.push([
            category.categoryName || "N/A",
            category.address || "N/A",
            { value: Number(category.rentalPrice) || 0, type: "number", align: "right" },
            { value: Number(category.maintenancePrice) || 0, type: "number", align: "right" },
            { value: Number(category.penaltyPrice) || 0, type: "number", align: "right" },
            unit.unitCode || "N/A",
            { value: unitStatus, align: "center" },
          ]);
        });
      }
    });

    const filename = isSearchFilterActive
      ? `Kuarters_Semakan_Ditapis_${new Date().toISOString().slice(0, 10)}`
      : `Kuarters_Semakan_Semua_${new Date().toISOString().slice(0, 10)}`;

    downloadXlsxFile({
      filename,
      sheets: [
        {
          name: "Senarai Kuarters",
          columns: [
            { width: 30 },
            { width: 35 },
            { width: 18 },
            { width: 22 },
            { width: 20 },
            { width: 16 },
            { width: 24 },
          ],
          rows: [headers, ...rows],
        },
      ],
    });
  };

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

    filteredCategories.forEach((category) => {
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

  const deleteCategory = async (categoryId: string) => {
    if (isSaving) {
      return;
    }

    const targetCategory = categories.find((category) => category.id === categoryId);

    if (!targetCategory) {
      setEditingCategoryId(null);
      return;
    }

    const unitKeys = new Set(targetCategory.units.map(getUnitKey));
    const categoryKey = getKuartersRecordKey(targetCategory);
    const nextCategories = categories.filter((category) => category.id !== categoryId);

    setSavingTarget(`category:${categoryId}`);
    try {
      if (onCategoryDelete && targetCategory.categoryId) {
        await onCategoryDelete({ categoryId: targetCategory.categoryId });
      } else {
        await onRecordsChange?.(nextCategories);
      }
      setCategoryDrafts((currentDrafts) => {
        const nextDrafts = { ...currentDrafts };
        delete nextDrafts[categoryId];
        return nextDrafts;
      });
      setUnitDrafts((currentDrafts) => {
        const nextDrafts = { ...currentDrafts };
        unitKeys.forEach((unitKey) => {
          delete nextDrafts[unitKey];
        });
        return nextDrafts;
      });
      setEditingCategoryId(null);
      setEditingUnitKey(null);
      if (selectedCategoryId === categoryId) {
        setSelectedCategoryId(nextCategories[0]?.id ?? "");
      }
      onSelectedKeysChange?.(
        selectedKeys.filter((key) => key !== categoryKey && !unitKeys.has(key)),
      );
      showNotice("success", "Kategori kuarters berjaya dipadam.");
    } catch (error) {
      showNotice(
        "error",
        getSaveErrorMessage(error, "Gagal memadam kategori kuarters."),
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

  const deleteUnit = async (unitKey: string) => {
    if (isSaving || !selectedCategory) {
      return;
    }

    const targetUnit = selectedCategory.units.find(
      (unit) => getUnitKey(unit) === unitKey,
    );

    if (!targetUnit) {
      setEditingUnitKey(null);
      return;
    }

    const nextCategories = categories.map((category) => {
      if (category.id !== selectedCategory.id) {
        return category;
      }

      const nextUnits = category.units.filter((unit) => getUnitKey(unit) !== unitKey);

      return {
        ...category,
        units: nextUnits,
        unitCount: nextUnits.length,
      };
    });

    setSavingTarget(`unit:${unitKey}`);
    try {
      if (onUnitDelete && selectedCategory.categoryId && targetUnit.unitId) {
        await onUnitDelete({
          categoryId: selectedCategory.categoryId,
          unitId: targetUnit.unitId,
        });
      } else {
        await onRecordsChange?.(nextCategories);
      }
      setUnitDrafts((currentDrafts) => {
        const nextDrafts = { ...currentDrafts };
        delete nextDrafts[unitKey];
        return nextDrafts;
      });
      setEditingUnitKey(null);
      onSelectedKeysChange?.(selectedKeys.filter((key) => key !== unitKey));
      showNotice("success", "Unit kuarters berjaya dipadam.");
    } catch (error) {
      showNotice("error", getSaveErrorMessage(error, "Gagal memadam unit kuarters."));
    } finally {
      setSavingTarget(null);
    }
  };

  return (
    <section className="flex flex-col gap-3 rounded-lg bg-light-blue p-1">
      <div className="flex flex-row justify-between px-3 pt-3">
        {/* Header */}
        <div>
          <div className="text-lg font-bold text-dark-grey">Pratinjau Kategori & Unit Kuarters</div>
          <div className="text-xs text-grey">Sila semak maklumat sebelum pengesahan.</div>
        </div>

        <div className="flex items-center gap-4">
          {/* Search Button */}
          <ToolbarButton
            icon={commonIcons.search}
            label="Cari rekod kuarters"
            isActive={isSearchOpen}
            onClick={handleToggleSearch}
          />

          {/* Download Button */}
          <ToolbarButton
            icon={commonIcons.download}
            label="Muat turun data kuarters"
            disabled={isLoading}
            onClick={handleDownload}
          />
        </div>
      </div>

      {isSearchOpen ? (
        <div className="px-3">
          <div className="rounded-lg bg-white p-4 shadow">
            <div className="flex flex-col gap-2">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div ref={searchInputRef} className="flex-1">
                  <SharedInputField
                    label="CARIAN MENGIKUT KATEGORI, ALAMAT ATAU ID UNIT"
                    value={filterQuery}
                    state="active"
                    onChange={setFilterQuery}
                    placeholder="Contoh: Kuarters Kelas D atau Unit 102"
                    showLabel
                    leadingIcon={(
                      <Icon
                        icon={commonIcons.search}
                        size={18}
                        className="text-light-grey"
                      />
                    )}
                    className="w-full"
                    activeBackgroundClass="bg-light-blue"
                    inputFontSize={12}
                    inputMinHeight={40}
                  />
                </div>

                <div className="flex items-center gap-3 self-start lg:self-end">
                  <button
                    type="button"
                    className="inline-flex min-h-10 items-center rounded-xl border border-light-grey/25 bg-white px-4 py-2 text-sm font-semibold text-grey transition-colors hover:border-dark-blue hover:text-dark-blue disabled:cursor-not-allowed disabled:opacity-40"
                    disabled={!isSearchFilterActive}
                    onClick={handleClearSearch}
                  >
                    Kosongkan
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid overflow-hidden rounded-lg border border-light-grey/20 bg-white lg:grid-cols-[1fr_260px]">
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
          isLoading={isLoading}
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
          onDeleteCategory={deleteCategory}
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
          isLoading={isLoading}
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
          onDeleteUnit={deleteUnit}
        />
      </div>
      <GlobalFixedMessage notice={notice} onDismiss={() => setNotice(null)} />
    </section>
  );
}

function isSelectableUnit(unit: ExtractedQuarterUnit) {
  return !unit.isExisted && !unit.originalUnitId;
}

function isSelectableCategory(category: ExtractedQuarterRecord) {
  return !category.categoryIsExisted;
}
