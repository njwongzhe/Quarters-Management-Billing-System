export const EMPTY_QUARTER_CLASS_ID = "__new__";

export type NoticeTone = "success" | "error" | "info";

export type PenghuniNotice = {
  tone: NoticeTone;
  message: string;
};

export type PenghuniSummaryCard = {
  label: string;
  value: string;
};

export type QuarterClassSummary = {
  totalUnits: number;
  occupiedUnits: number;
  vacantUnits: number;
  occupancyRate: number;
};

export type QuarterClassRecord = {
  id: string;
  className: string;
  rentalPrice: number;
  maintenancePrice: number;
  penaltyPrice: number;
  unitCount: number;
  canDelete: boolean;
  updatedAt: string;
};

export type QuarterClassDraft = {
  className: string;
  rentalPrice: string;
  maintenancePrice: string;
  penaltyPrice: string;
};

export type QuarterClassFilters = {
  classNameQuery: string;
};

export type PenghuniEditorState = {
  mode: "create" | "edit";
  rowId: string;
  draft: QuarterClassDraft;
};

export type QuarterClassesApiResponse = {
  success: boolean;
  message: string;
  data?: {
    summary: QuarterClassSummary;
    quarterClasses: QuarterClassRecord[];
    meta: {
      totalRecords: number;
    };
  };
};

export type QuarterClassMutationResponse = {
  success: boolean;
  message: string;
  data?: {
    quarterClass?: QuarterClassRecord;
    changedFields?: string[];
    id?: string;
    unitCount?: number;
  };
};

export type PenghuniPageInitialData = {
  summary: QuarterClassSummary | null;
  quarterClasses: QuarterClassRecord[];
};

export const QUARTER_CLASS_PAGE_SIZE = 10;

export type PaginationItem = number | "ellipsis";

export type QuarterClassPaginationState = {
  currentPage: number;
  totalPages: number;
  visibleRecords: QuarterClassRecord[];
  pageItems: PaginationItem[];
  summaryText: string;
};

type BuildQuarterClassPaginationOptions = {
  totalRecords?: number;
  hasActiveFilter?: boolean;
};

const emptySummaryCards: PenghuniSummaryCard[] = [
  { label: "Jumlah Unit", value: "--" },
  { label: "Unit Didiami", value: "--" },
  { label: "Unit Kosong", value: "--" },
  { label: "Kadar Penghunian", value: "--" },
];

export function buildPenghuniSummaryCards(
  summary: QuarterClassSummary | null,
): PenghuniSummaryCard[] {
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

export function createEmptyQuarterClassDraft(): QuarterClassDraft {
  return {
    className: "",
    rentalPrice: "",
    maintenancePrice: "",
    penaltyPrice: "",
  };
}

export function createEmptyQuarterClassFilters(): QuarterClassFilters {
  return {
    classNameQuery: "",
  };
}

export function createDraftFromQuarterClass(
  quarterClass: QuarterClassRecord,
): QuarterClassDraft {
  return {
    className: quarterClass.className,
    rentalPrice: formatEditableMoney(quarterClass.rentalPrice),
    maintenancePrice: formatEditableMoney(quarterClass.maintenancePrice),
    penaltyPrice: formatEditableMoney(quarterClass.penaltyPrice),
  };
}

export function validateQuarterClassDraft(
  draft: QuarterClassDraft,
  options: {
    requireClassName: boolean;
  },
) {
  if (options.requireClassName) {
    const normalizedClassName = draft.className.trim().replace(/\s+/g, " "); // Replace multiple whitespace with single space for validation

    if (normalizedClassName.length === 0) {
      return "Nama kelas tidak boleh kosong.";
    }

    if (normalizedClassName.length > 100) {
      return "Nama kelas terlalu panjang. Sila gunakan maksimum 100 aksara.";
    }
  }

  const moneyFieldError =
    validateMoneyField(draft.rentalPrice, "sewa") ??
    validateMoneyField(draft.maintenancePrice, "senggara") ??
    validateMoneyField(draft.penaltyPrice, "penalti");

  return moneyFieldError;
}

export function sortQuarterClasses(quarterClasses: QuarterClassRecord[]) {
  return [...quarterClasses].sort((left, right) =>
    left.className.localeCompare(right.className, "ms", {
      sensitivity: "base",
    }),
  );
}

export function hasActiveQuarterClassFilters(filters: QuarterClassFilters) {
  return filters.classNameQuery.trim().length > 0;
}

export function filterQuarterClasses(
  quarterClasses: QuarterClassRecord[],
  filters: QuarterClassFilters,
) {
  const normalizedClassNameQuery = normalizeSearchValue(filters.classNameQuery);

  if (normalizedClassNameQuery.length === 0) {
    return quarterClasses;
  }

  return quarterClasses.filter((quarterClass) =>
    normalizeSearchValue(quarterClass.className).includes(
      normalizedClassNameQuery,
    ),
  );
}

export function buildQuarterClassPagination(
  quarterClasses: QuarterClassRecord[],
  requestedPage: number,
  options: BuildQuarterClassPaginationOptions = {},
): QuarterClassPaginationState {
  const totalRecords = quarterClasses.length;
  const overallTotalRecords = options.totalRecords ?? totalRecords;
  const totalPages = Math.max(
    1,
    Math.ceil(totalRecords / QUARTER_CLASS_PAGE_SIZE),
  );
  const currentPage = Math.min(Math.max(requestedPage, 1), totalPages);
  const startIndex = (currentPage - 1) * QUARTER_CLASS_PAGE_SIZE;
  const endIndex = Math.min(
    startIndex + QUARTER_CLASS_PAGE_SIZE,
    totalRecords,
  );

  return {
    currentPage,
    totalPages,
    visibleRecords: quarterClasses.slice(startIndex, endIndex),
    pageItems: buildPageItems(currentPage, totalPages),
    summaryText:
      totalRecords === 0
        ? options.hasActiveFilter
          ? "Tiada rekod kelas kuarters yang sepadan dengan tapisan semasa."
          : "Tiada rekod kelas kuarters untuk dipaparkan."
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
