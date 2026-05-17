import type { UnitStatus } from "@prisma/client";
import type { QuarterCategorySummary } from "@/lib/quarter-categories";
import type { AvailableResidentListItem } from "@/lib/residents";

import type {
  QuarterCategoryUnitsDetail,
  QuarterUnitListItem,
} from "@/lib/quarter-units";

export const EMPTY_QUARTER_UNIT_ID = "__new__";

export type QuarterUnitRecord = QuarterUnitListItem;
export type KuartersCategoryDetailInitialData = QuarterCategoryUnitsDetail;
export type QuarterCategoryRates = QuarterCategoryUnitsDetail["rates"];
export type QuarterUnitStatusFilter = "ALL" | "OCCUPIED" | "VACANT";

export type QuarterUnitDraft = {
  unitCode: string;
  occupantIcNumber: string;
  occupantName: string;
  moveInDate: string;
  moveOutDate: string;
};

export type KuartersUnitEditorState = {
  mode: "create" | "edit";
  rowId: string;
  draft: QuarterUnitDraft;
};

export type QuarterUnitMutationResponse = {
  success: boolean;
  message: string;
  data?: {
    unit?: QuarterUnitRecord;
    changedFields?: Array<"unitCode" | "occupant">;
    id?: string;
    unitCode?: string;
    occupancies?: number;
    monthlyCharges?: number;
  };
};

export type AvailableResidentRecord = AvailableResidentListItem;

export type AvailableResidentsResponse = {
  success: boolean;
  message: string;
  data?: {
    residents: AvailableResidentRecord[];
    meta: {
      totalRecords: number;
      query: string;
    };
  };
};

export type PaginationItem = number | "ellipsis";

export type QuarterUnitPaginationState = {
  currentPage: number;
  totalPages: number;
  startIndex: number;
  endIndex: number;
  totalRecords: number;
  visibleRecords: QuarterUnitRecord[];
  pageItems: PaginationItem[];
  summaryText: string;
};

export type QuarterUnitFilters = {
  query: string;
  status: QuarterUnitStatusFilter;
};

type BuildQuarterUnitPaginationOptions = {
  totalRecords?: number;
  hasActiveFilter?: boolean;
};

export const QUARTER_UNIT_PAGE_SIZE = 10;

export function createEmptyQuarterUnitDraft(): QuarterUnitDraft {
  return {
    unitCode: "",
    occupantIcNumber: "",
    occupantName: "",
    moveInDate: "",
    moveOutDate: "",
  };
}

export function createEmptyQuarterUnitFilters(): QuarterUnitFilters {
  return {
    query: "",
    status: "ALL",
  };
}

export function createDraftFromQuarterUnit(
  unit: QuarterUnitRecord,
): QuarterUnitDraft {
  return {
    unitCode: unit.unitCode,
    occupantIcNumber: unit.occupantIcNumber ?? "",
    occupantName: unit.occupantName ?? "",
    moveInDate: formatDateInputValue(unit.moveInDate),
    moveOutDate: formatDateInputValue(unit.moveOutDate),
  };
}

export function validateQuarterUnitDraft(draft: QuarterUnitDraft) {
  const normalizedUnitCode = draft.unitCode.trim().replace(/\s+/g, " ");

  if (normalizedUnitCode.length === 0) {
    return "Kod unit tidak boleh kosong.";
  }

  if (normalizedUnitCode.length > 50) {
    return "Kod unit terlalu panjang. Sila gunakan maksimum 50 aksara.";
  }

  const normalizedOccupantIcNumber = draft.occupantIcNumber.trim();

  if (normalizedOccupantIcNumber.length > 20) {
    return "Nombor kad pengenalan penghuni terlalu panjang. Sila gunakan maksimum 20 aksara.";
  }

  return null;
}

export function sortQuarterUnits(units: QuarterUnitRecord[]) {
  return [...units].sort((left, right) =>
    left.unitCode.localeCompare(right.unitCode, "ms", {
      sensitivity: "base",
      numeric: true,
    }),
  );
}

export function buildQuarterUnitSummary(
  units: QuarterUnitRecord[],
): QuarterCategorySummary {
  const occupiedUnits = units.filter((unit) => unit.status === "OCCUPIED").length;
  const totalUnits = units.length;
  const vacantUnits = totalUnits - occupiedUnits;
  const occupancyRate =
    totalUnits === 0
      ? 0
      : Number(((occupiedUnits / totalUnits) * 100).toFixed(1));

  return {
    totalUnits,
    occupiedUnits,
    vacantUnits,
    occupancyRate,
  };
}

export function hasActiveQuarterUnitFilters(filters: QuarterUnitFilters) {
  return filters.query.trim().length > 0 || filters.status !== "ALL";
}

export function filterQuarterUnits(
  units: QuarterUnitRecord[],
  filters: QuarterUnitFilters,
) {
  const normalizedQuery = normalizeSearchValue(filters.query);

  return units.filter((unit) => {
    const matchesStatus =
      filters.status === "ALL" || unit.status === filters.status;

    if (!matchesStatus) {
      return false;
    }

    if (normalizedQuery.length === 0) {
      return true;
    }

    const searchableValues = [
      unit.unitCode,
      unit.occupantIcNumber ?? "",
      unit.occupantName ?? "",
    ];

    return searchableValues.some((value) =>
      normalizeSearchValue(value).includes(normalizedQuery),
    );
  });
}

export function buildQuarterUnitPagination(
  units: QuarterUnitRecord[],
  requestedPage: number,
  options: BuildQuarterUnitPaginationOptions = {},
): QuarterUnitPaginationState {
  const totalRecords = units.length;
  const overallTotalRecords = options.totalRecords ?? totalRecords;
  const totalPages = Math.max(1, Math.ceil(totalRecords / QUARTER_UNIT_PAGE_SIZE));
  const currentPage = Math.min(Math.max(requestedPage, 1), totalPages);
  const startIndex = (currentPage - 1) * QUARTER_UNIT_PAGE_SIZE;
  const endIndex = Math.min(
    startIndex + QUARTER_UNIT_PAGE_SIZE,
    totalRecords,
  );

  return {
    currentPage,
    totalPages,
    startIndex,
    endIndex,
    totalRecords,
    visibleRecords: units.slice(startIndex, endIndex),
    pageItems: buildPageItems(currentPage, totalPages),
    summaryText:
      totalRecords === 0
        ? options.hasActiveFilter
          ? "Tiada unit kuarters yang sepadan dengan tapisan semasa."
          : "Tiada unit kuarters untuk dipaparkan."
        : options.hasActiveFilter && overallTotalRecords !== totalRecords
          ? `Menunjukkan ${startIndex + 1}-${endIndex} daripada ${totalRecords} unit ditapis daripada ${overallTotalRecords} unit`
          : `Menunjukkan ${startIndex + 1}-${endIndex} daripada ${totalRecords} unit`,
  };
}

export function formatQuarterUnitValue(value: string | null) {
  return value ?? "N/A";
}

export function formatDateInputValue(value: string | null) {
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

export function getQuarterUnitStatusLabel(status: UnitStatus) {
  return status === "OCCUPIED" ? "Didiami" : "Kosong";
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

function normalizeSearchValue(value: string) {
  return value.trim().toLocaleLowerCase("ms");
}
