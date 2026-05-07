"use client";

import { useState } from "react";
import Icon from "../../../../../components/Icon";
import {
  type ExtractedQuarterRecord,
  Pagination,
  QUARTER_CATEGORIES_PER_PAGE,
  QUARTER_UNITS_PER_PAGE,
} from "./extract-review-shared";

export default function KuartersReviewTable({
  records,
  selectedKeys = [],
  onSelectedKeysChange,
}: {
  records: ExtractedQuarterRecord[];
  selectedKeys?: string[];
  onSelectedKeysChange?: (keys: string[]) => void;
}) {
  const [categories, setCategories] = useState<ExtractedQuarterRecord[]>(records);
  const [categoryDrafts, setCategoryDrafts] = useState<
    Record<
      string,
      Pick<
        ExtractedQuarterRecord,
        "rentalPrice" | "maintenancePrice" | "penaltyPrice"
      >
    >
  >({});
  const [unitDrafts, setUnitDrafts] = useState<Record<string, string>>({});
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingUnitKey, setEditingUnitKey] = useState<string | null>(null);
  const [categoryPage, setCategoryPage] = useState(1);
  const [unitPage, setUnitPage] = useState(1);
  const selectedCategory =
    categories.find((category) => category.id === selectedCategoryId) ?? null;
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

  const startCategoryEdit = (category: ExtractedQuarterRecord) => {
    setCategoryDrafts((currentDrafts) => ({
      ...currentDrafts,
      [category.id]: {
        rentalPrice: category.rentalPrice,
        maintenancePrice: category.maintenancePrice,
        penaltyPrice: category.penaltyPrice,
      },
    }));
    setEditingCategoryId(category.id);
  };

  const updateCategoryDraft = (
    categoryId: string,
    field: "rentalPrice" | "maintenancePrice" | "penaltyPrice",
    value: string,
  ) => {
    setCategoryDrafts((currentDrafts) => ({
      ...currentDrafts,
      [categoryId]: {
        rentalPrice: currentDrafts[categoryId]?.rentalPrice ?? "",
        maintenancePrice: currentDrafts[categoryId]?.maintenancePrice ?? "",
        penaltyPrice: currentDrafts[categoryId]?.penaltyPrice ?? "",
        [field]: value,
      },
    }));
  };

  const saveCategory = (categoryId: string) => {
    const draft = categoryDrafts[categoryId];

    if (!draft) {
      setEditingCategoryId(null);
      return;
    }

    setCategories((currentCategories) =>
      currentCategories.map((category) =>
        category.id === categoryId ? { ...category, ...draft } : category,
      ),
    );
    setEditingCategoryId(null);
  };

  const startUnitEdit = (unitKey: string, unitCode: string) => {
    setUnitDrafts((currentDrafts) => ({
      ...currentDrafts,
      [unitKey]: unitCode,
    }));
    setEditingUnitKey(unitKey);
  };

  const saveUnit = (unitKey: string) => {
    const draftUnitCode = unitDrafts[unitKey];

    if (!draftUnitCode || !selectedCategory) {
      setEditingUnitKey(null);
      return;
    }

    setCategories((currentCategories) =>
      currentCategories.map((category) =>
        category.id === selectedCategory.id
          ? {
              ...category,
              units: category.units.map((unit) =>
                `${unit.sourceSheet}-${unit.sourceRow}-${unit.unitCode}` === unitKey
                  ? { ...unit, unitCode: draftUnitCode }
                  : unit,
              ),
            }
          : category,
      ),
    );
    setEditingUnitKey(null);
  };

  return (
    <div className="grid overflow-hidden rounded-lg border border-[#DCE2F1] bg-white lg:grid-cols-[1fr_240px]">
      <div className="overflow-x-auto">
        <table className="w-full table-fixed text-left text-xs">
          <thead className="bg-[#F7F9FF] text-[10px] font-extrabold uppercase text-[#667085]">
            <tr>
              <th className="w-10 px-5 py-4">
                <input type="checkbox" className="h-4 w-4" />
              </th>
              <th className="px-4 py-4">Kategori</th>
              <th className="px-4 py-4 text-right">Sewa (RM)</th>
              <th className="px-4 py-4 text-right">Senggara (RM)</th>
              <th className="px-4 py-4 text-right">Penalti (RM)</th>
              <th className="px-4 py-4 text-center">Tindakan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EEF1F7]">
            {pageCategories.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-6 py-10 text-center text-sm font-semibold text-[#667085]"
                >
                  Tiada kategori atau unit kuarters baharu ditemui.
                </td>
              </tr>
            ) : (
              pageCategories.map((category) => {
              const isSelected = category.id === selectedCategory?.id;
              const selectionKey = getKuartersRecordKey(category);

              return (
                <tr
                  key={category.id}
                  className={isSelected ? "bg-[#FBFCFF]" : undefined}
                  onClick={() => selectCategory(category.id)}
                >
                  <td className="px-5 py-4">
                    <input
                      type="checkbox"
                      checked={selectedKeySet.has(selectionKey)}
                      className="h-4 w-4 accent-dark-blue"
                      onClick={(event) => event.stopPropagation()}
                      onChange={(event) =>
                        toggleSelectedCategory(selectionKey, event.target.checked)
                      }
                    />
                  </td>
                  <td className="px-4 py-4 font-extrabold text-[#172033]">
                    <p>{category.categoryName}</p>
                    <p className="text-[10px] font-semibold text-[#667085]">
                      {category.unitCount} unit
                    </p>
                  </td>
                  {[
                    ["rentalPrice", category.rentalPrice],
                    ["maintenancePrice", category.maintenancePrice],
                    ["penaltyPrice", category.penaltyPrice],
                  ].map(([field, value]) => {
                    const isEditing = editingCategoryId === category.id;
                    const draftValue =
                      categoryDrafts[category.id]?.[
                        field as "rentalPrice" | "maintenancePrice" | "penaltyPrice"
                      ] ?? value;

                    return (
                      <td
                        key={`${category.id}-${field}`}
                        className="px-4 py-4 text-right"
                      >
                        {isEditing ? (
                          <input
                            className="h-9 w-22 rounded border border-[#E6EAF2] px-3 text-right font-extrabold"
                            value={draftValue}
                            onChange={(event) =>
                              updateCategoryDraft(
                                category.id,
                                field as
                                  | "rentalPrice"
                                  | "maintenancePrice"
                                  | "penaltyPrice",
                                event.target.value,
                              )
                            }
                          />
                        ) : (
                          <span className="font-extrabold text-[#172033]">
                            {value}
                          </span>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-4 py-4">
                    <div className="flex items-center justify-center gap-4">
                      {editingCategoryId === category.id ? (
                        <>
                          <button
                            type="button"
                            aria-label="Simpan perubahan kategori"
                            onClick={(event) => {
                              event.stopPropagation();
                              saveCategory(category.id);
                            }}
                          >
                            <Icon
                              icon="save"
                              size={16}
                              weight={700}
                              className="text-green"
                            />
                          </button>
                          <button
                            type="button"
                            aria-label="Padam kategori"
                            onClick={(event) => event.stopPropagation()}
                          >
                            <Icon
                              icon="delete"
                              size={16}
                              weight={700}
                              className="text-red"
                            />
                          </button>
                          <button
                            type="button"
                            aria-label="Sembunyikan senarai unit"
                            onClick={(event) => {
                              event.stopPropagation();
                              selectCategory(category.id);
                            }}
                          >
                            <Icon
                              icon="chevron_left"
                              size={16}
                              weight={700}
                              className="text-[#98A2B3]"
                            />
                          </button>
                        </>
                      ) : (
                        <>
                          <Icon
                            icon="check_circle"
                            size={16}
                            weight={700}
                            className="text-green"
                          />
                          <button
                            type="button"
                            aria-label="Edit kategori"
                            onClick={(event) => {
                              event.stopPropagation();
                              startCategoryEdit(category);
                            }}
                          >
                            <Icon
                              icon="edit"
                              size={16}
                              weight={700}
                              className="text-dark-blue"
                            />
                          </button>
                          <button
                            type="button"
                            aria-label="Lihat senarai unit"
                            onClick={(event) => {
                              event.stopPropagation();
                              selectCategory(category.id);
                            }}
                          >
                            <Icon
                              icon="chevron_right"
                              size={16}
                              weight={700}
                              className="text-[#98A2B3]"
                            />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            }))}
          </tbody>
        </table>
        <Pagination
          currentPage={safeCategoryPage}
          totalPages={totalCategoryPages}
          onPageChange={setCategoryPage}
          label={`Memaparkan ${categoryDisplayStart}-${categoryDisplayEnd} daripada ${categories.length} Kategori`}
        />
      </div>

      <div className="border-t border-[#DCE2F1] lg:border-l lg:border-t-0">
        <div className="flex items-center justify-between bg-[#F7F9FF] px-5 py-4 text-[10px] font-extrabold uppercase text-dark-blue">
          Senarai Unit
          <Icon icon="add_circle" size={15} weight={700} />
        </div>
        <div className="grid grid-cols-[1fr_64px] border-b border-[#EEF1F7] px-5 py-3 text-[10px] font-extrabold uppercase text-[#667085]">
          <span>ID Unit</span>
          <span className="text-center">Tindakan</span>
        </div>
        {pageUnits.length === 0 ? (
          <div className="px-5 py-10 text-center text-xs font-semibold text-[#667085]">
            Tiada unit baharu.
          </div>
        ) : (
          pageUnits.map((unit) => {
          const unitKey = `${unit.sourceSheet}-${unit.sourceRow}-${unit.unitCode}`;
          const isEditing = editingUnitKey === unitKey;

          return (
            <div
              key={unitKey}
              className="grid grid-cols-[1fr_64px] items-center px-5 py-4 text-xs"
            >
              <span>
                {isEditing ? (
                  <input
                    className="h-9 w-full rounded border border-[#E6EAF2] px-3 font-extrabold"
                    value={unitDrafts[unitKey] ?? unit.unitCode}
                    onChange={(event) =>
                      setUnitDrafts((currentDrafts) => ({
                        ...currentDrafts,
                        [unitKey]: event.target.value,
                      }))
                    }
                  />
                ) : (
                  <span className="font-extrabold text-[#172033]">
                    {unit.unitCode}
                  </span>
                )}
                {unit.address ? (
                  <span className="block text-[10px] font-semibold text-[#667085]">
                    {unit.address}
                  </span>
                ) : null}
              </span>
              <span className="flex justify-center gap-3">
                {isEditing ? (
                  <>
                    <button
                      type="button"
                      aria-label="Simpan perubahan unit"
                      onClick={() => saveUnit(unitKey)}
                    >
                      <Icon icon="save" size={15} weight={700} className="text-green" />
                    </button>
                    <button type="button" aria-label="Padam unit">
                      <Icon icon="delete" size={15} weight={700} className="text-red" />
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    aria-label="Edit unit"
                    onClick={() => startUnitEdit(unitKey, unit.unitCode)}
                  >
                    <Icon
                      icon="edit"
                      size={15}
                      weight={700}
                      className="text-dark-blue"
                    />
                  </button>
                )}
              </span>
            </div>
          );
        }))}
        <Pagination
          currentPage={safeUnitPage}
          totalPages={totalUnitPages}
          onPageChange={setUnitPage}
          label={`Memaparkan ${unitDisplayStart}-${unitDisplayEnd} daripada ${units.length} Unit`}
          showLabel={false}
        />
      </div>
    </div>
  );
}

function getKuartersRecordKey(record: ExtractedQuarterRecord) {
  return record.categoryId ?? record.id;
}
