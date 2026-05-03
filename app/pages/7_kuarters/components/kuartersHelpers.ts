export const EMPTY_QUARTER_CATEGORY_ID = "__new__";

export type NoticeTone = "success" | "error" | "info";

export type KuartersNotice = {
  tone: NoticeTone;
  message: string;
};

export type KuartersSummaryCard = {
  label: string;
  value: string;
};

export type QuarterCategorySummary = {
  totalUnits: number;
  occupiedUnits: number;
  vacantUnits: number;
  occupancyRate: number;
};

export type QuarterCategoryRecord = {
  id: string;
  categoryName: string;
  address: string | null;
  rentalPrice: number;
  maintenancePrice: number;
  penaltyPrice: number;
  unitCount: number;
  canDelete: boolean;
  updatedAt: string;
};

export type QuarterCategoryDraft = {
  categoryName: string;
  address: string;
  rentalPrice: string;
  maintenancePrice: string;
  penaltyPrice: string;
};

export type QuarterCategoryFilters = {
  categoryNameQuery: string;
};

export type KuartersEditorState = {
  mode: "create" | "edit";
  rowId: string;
  draft: QuarterCategoryDraft;
};

export type QuarterCategoriesApiResponse = {
  success: boolean;
  message: string;
  data?: {
    summary: QuarterCategorySummary;
    quarterCategories: QuarterCategoryRecord[];
    meta: {
      totalRecords: number;
    };
  };
};

export type QuarterCategoryMutationResponse = {
  success: boolean;
  message: string;
  data?: {
    quarterCategory?: QuarterCategoryRecord;
    changedFields?: string[];
    id?: string;
    unitCount?: number;
  };
};

export type KuartersPageInitialData = {
  summary: QuarterCategorySummary | null;
  quarterCategories: QuarterCategoryRecord[];
};

export const QUARTER_CATEGORY_PAGE_SIZE = 10;

export type PaginationItem = number | "ellipsis";

export type QuarterCategoryPaginationState = {
  currentPage: number;
  totalPages: number;
  visibleRecords: QuarterCategoryRecord[];
  pageItems: PaginationItem[];
  summaryText: string;
};

type BuildQuarterCategoryPaginationOptions = {
  totalRecords?: number;
  hasActiveFilter?: boolean;
};

const emptySummaryCards: KuartersSummaryCard[] = [
  { label: "Jumlah Unit", value: "--" },
  { label: "Unit Didiami", value: "--" },
  { label: "Unit Kosong", value: "--" },
  { label: "Kadar Penghunian", value: "--" },
];

export function buildKuartersSummaryCards(
  summary: QuarterCategorySummary | null,
): KuartersSummaryCard[] {
  if (!summary) {
    return emptySummaryCards;
  }

  return [
    {
      label: "Jumlah Unit",
      value: formatWholeNumber(summary.totalUnits),
    },
    {
      label: "Unit Didiami",
      value: formatWholeNumber(summary.occupiedUnits),
    },
    {
      label: "Unit Kosong",
      value: formatWholeNumber(summary.vacantUnits),
    },
    {
      label: "Kadar Penghunian",
      value: `${summary.occupancyRate.toFixed(1)}%`,
    },
  ];
}

export function createEmptyQuarterCategoryDraft(): QuarterCategoryDraft {
  return {
    categoryName: "",
    address: "",
    rentalPrice: "",
    maintenancePrice: "",
    penaltyPrice: "",
  };
}

export function createEmptyQuarterCategoryFilters(): QuarterCategoryFilters {
  return {
    categoryNameQuery: "",
  };
}

export function createDraftFromQuarterCategory(
  quarterCategory: QuarterCategoryRecord,
): QuarterCategoryDraft {
  return {
    categoryName: quarterCategory.categoryName,
    address: quarterCategory.address ?? "",
    rentalPrice: formatEditableMoney(quarterCategory.rentalPrice),
    maintenancePrice: formatEditableMoney(quarterCategory.maintenancePrice),
    penaltyPrice: formatEditableMoney(quarterCategory.penaltyPrice),
  };
}

export function validateQuarterCategoryDraft(
  draft: QuarterCategoryDraft,
  options: {
    requireCategoryName: boolean;
  },
) {
  const normalizedCategoryName = draft.categoryName.trim().replace(/\s+/g, " ");

  if (options.requireCategoryName && normalizedCategoryName.length === 0) {
    return "Nama kategori tidak boleh kosong.";
  }

  if (normalizedCategoryName.length > 100) {
    return "Nama kategori terlalu panjang. Sila gunakan maksimum 100 aksara.";
  }

  const normalizedAddress = draft.address.trim().replace(/\s+/g, " ");

  if (normalizedAddress.length === 0) {
    return "Alamat tidak boleh kosong.";
  }

  if (normalizedAddress.length > 500) {
    return "Alamat terlalu panjang. Sila gunakan maksimum 500 aksara.";
  }

  const moneyFieldError =
    validateMoneyField(draft.rentalPrice, "sewa") ??
    validateMoneyField(draft.maintenancePrice, "senggara") ??
    validateMoneyField(draft.penaltyPrice, "penalti");

  return moneyFieldError;
}

export function sortQuarterCategories(quarterCategories: QuarterCategoryRecord[]) {
  return [...quarterCategories].sort((left, right) =>
    left.categoryName.localeCompare(right.categoryName, "ms", {
      sensitivity: "base",
    }),
  );
}

export function hasActiveQuarterCategoryFilters(filters: QuarterCategoryFilters) {
  return filters.categoryNameQuery.trim().length > 0;
}

export function filterQuarterCategories(
  quarterCategories: QuarterCategoryRecord[],
  filters: QuarterCategoryFilters,
) {
  const normalizedQuery = normalizeSearchValue(filters.categoryNameQuery);

  if (normalizedQuery.length === 0) {
    return quarterCategories;
  }

  return quarterCategories.filter((quarterCategory) => {
    const searchableValues = [
      quarterCategory.categoryName,
      quarterCategory.address ?? "",
    ];

    return searchableValues.some((value) =>
      normalizeSearchValue(value).includes(normalizedQuery),
    );
  });
}

export function buildQuarterCategoryPagination(
  quarterCategories: QuarterCategoryRecord[],
  requestedPage: number,
  options: BuildQuarterCategoryPaginationOptions = {},
): QuarterCategoryPaginationState {
  const totalRecords = quarterCategories.length;
  const overallTotalRecords = options.totalRecords ?? totalRecords;
  const totalPages = Math.max(
    1,
    Math.ceil(totalRecords / QUARTER_CATEGORY_PAGE_SIZE),
  );
  const currentPage = Math.min(Math.max(requestedPage, 1), totalPages);
  const startIndex = (currentPage - 1) * QUARTER_CATEGORY_PAGE_SIZE;
  const endIndex = Math.min(
    startIndex + QUARTER_CATEGORY_PAGE_SIZE,
    totalRecords,
  );

  return {
    currentPage,
    totalPages,
    visibleRecords: quarterCategories.slice(startIndex, endIndex),
    pageItems: buildPageItems(currentPage, totalPages),
    summaryText:
      totalRecords === 0
        ? options.hasActiveFilter
          ? "Tiada rekod kategori kuarters yang sepadan dengan tapisan semasa."
          : "Tiada rekod kategori kuarters untuk dipaparkan."
        : options.hasActiveFilter && overallTotalRecords !== totalRecords
          ? `Menunjukkan ${startIndex + 1}-${endIndex} daripada ${totalRecords} rekod ditapis daripada ${overallTotalRecords} rekod`
          : `Menunjukkan ${startIndex + 1}-${endIndex} daripada ${totalRecords} rekod`,
  };
}

export function formatMoney(amount: number) {
  return new Intl.NumberFormat("en-MY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function buildPageItems(
  currentPage: number,
  totalPages: number,
): PaginationItem[] {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 3) {
    return [1, 2, 3, 4, "ellipsis", totalPages];
  }

  if (currentPage >= totalPages - 2) {
    return [
      1,
      "ellipsis",
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ];
  }

  return [
    1,
    "ellipsis",
    currentPage - 1,
    currentPage,
    currentPage + 1,
    "ellipsis",
    totalPages,
  ];
}

function formatEditableMoney(amount: number) {
  return amount.toFixed(2);
}

function formatWholeNumber(amount: number) {
  return new Intl.NumberFormat("en-MY").format(amount);
}

function validateMoneyField(value: string, label: string) {
  const normalizedValue = value.trim();

  if (normalizedValue.length === 0) {
    return `Nilai ${label} perlu diisi.`;
  }

  if (!/^\d+(\.\d{1,2})?$/.test(normalizedValue)) {
    return `Nilai ${label} mesti nombor yang sah dengan maksimum 2 tempat perpuluhan.`;
  }

  if (Number(normalizedValue) < 0) {
    return `Nilai ${label} mesti nombor yang sah dan tidak negatif.`;
  }

  return null;
}

function normalizeSearchValue(value: string) {
  return value.trim().toLocaleLowerCase("ms");
}
