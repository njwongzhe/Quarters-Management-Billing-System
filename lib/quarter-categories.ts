import type { QuarterCategory } from "@prisma/client";

export type QuarterCategoryListItem = {
  id: string;
  categoryName: string;
  rentalPrice: number;
  maintenancePrice: number;
  penaltyPrice: number;
  unitCount: number;
  canDelete: boolean;
  updatedAt: string;
};

export type QuarterCategorySummary = {
  totalUnits: number;
  occupiedUnits: number;
  vacantUnits: number;
  occupancyRate: number;
};

type QuarterCategoryWithUnitCount = QuarterCategory & {
  _count: {
    units: number;
  };
};

type ParseSuccess<T> = {
  ok: true;
  data: T;
};

type ParseFailure = {
  ok: false;
  message: string;
};

export type QuarterCategoryNumericField =
  | "rentalPrice"
  | "maintenancePrice"
  | "penaltyPrice";

export type QuarterCategoryUpdateInput = Partial<
  Record<QuarterCategoryNumericField, number>
>;

export type QuarterCategoryCreateInput = {
  categoryName: string;
  rentalPrice: number;
  maintenancePrice: number;
  penaltyPrice: number;
};

const fieldLabels: Record<QuarterCategoryNumericField, string> = {
  rentalPrice: "sewa",
  maintenancePrice: "senggara",
  penaltyPrice: "penalti",
};

export function mapQuarterCategoryForApi(
  quarterCategory: QuarterCategoryWithUnitCount,
): QuarterCategoryListItem {
  return {
    id: quarterCategory.id,
    categoryName: quarterCategory.categoryName,
    rentalPrice: Number(quarterCategory.rentalPrice),
    maintenancePrice: Number(quarterCategory.maintenancePrice),
    penaltyPrice: Number(quarterCategory.penaltyPrice),
    unitCount: quarterCategory._count.units,
    canDelete: quarterCategory._count.units === 0,
    updatedAt: quarterCategory.updatedAt.toISOString(),
  };
}

export function buildQuarterCategorySummary(summary: {
  totalUnits: number;
  occupiedUnits: number;
  vacantUnits: number;
}): QuarterCategorySummary {
  const occupancyRate =
    summary.totalUnits === 0
      ? 0
      : Number(((summary.occupiedUnits / summary.totalUnits) * 100).toFixed(1));

  return {
    ...summary,
    occupancyRate,
  };
}

export function parseQuarterCategoryUpdateBody(
  body: unknown,
): ParseSuccess<QuarterCategoryUpdateInput> | ParseFailure {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return {
      ok: false,
      message: "Data permintaan tidak sah.",
    };
  }

  const payload = body as Record<string, unknown>;
  return parseQuarterCategoryPrices(payload, {
    requireAllFields: false,
  });
}

export function parseQuarterCategoryCreateBody(
  body: unknown,
): ParseSuccess<QuarterCategoryCreateInput> | ParseFailure {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return {
      ok: false,
      message: "Data permintaan tidak sah.",
    };
  }

  const payload = body as Record<string, unknown>;
  const parsedCategoryName = parseQuarterCategoryName(
    payload.categoryName ?? payload.kategori ?? payload.kelas,
  );

  if (!parsedCategoryName.ok) {
    return parsedCategoryName;
  }

  const parsedPrices = parseQuarterCategoryPrices(payload, {
    requireAllFields: true,
  });

  if (!parsedPrices.ok) {
    return parsedPrices;
  }

  const {
    rentalPrice,
    maintenancePrice,
    penaltyPrice,
  } = parsedPrices.data;

  if (
    rentalPrice === undefined ||
    maintenancePrice === undefined ||
    penaltyPrice === undefined
  ) {
    return {
      ok: false,
      message: "Semua nilai kadar kategori kuarters perlu diisi.",
    };
  }

  return {
    ok: true,
    data: {
      categoryName: parsedCategoryName.data,
      rentalPrice,
      maintenancePrice,
      penaltyPrice,
    },
  };
}

export function getChangedQuarterCategoryFields(
  current: QuarterCategory,
  updates: QuarterCategoryUpdateInput,
): QuarterCategoryNumericField[] {
  return (Object.keys(updates) as QuarterCategoryNumericField[]).filter((field) => {
    const currentValue = getQuarterCategoryNumericValue(current, field);
    const updatedValue = updates[field];

    return updatedValue !== undefined && currentValue !== updatedValue;
  });
}

export function buildQuarterCategoryUpdatedMessage(
  categoryName: string,
  changedFields: QuarterCategoryNumericField[],
): string {
  if (changedFields.length === 0) {
    return `Tiada perubahan dibuat pada ${categoryName}.`;
  }

  const labels = changedFields.map((field) => fieldLabels[field]);
  const joinedLabels = joinMalayList(labels);

  return `Kadar ${joinedLabels} bagi ${categoryName} berjaya dikemas kini.`;
}

export function buildQuarterCategoryDeleteBlockedMessage(
  categoryName: string,
  unitCount: number,
): string {
  // unitCount === 1 ? "unit" : "unit"; is used to handle singular vs plural in Malay, but since "unit" is the same in both cases, we can just return "unit" regardless of the count.
  const unitLabel = unitCount === 1 ? "unit" : "unit";

  return `${categoryName} tidak boleh dipadam kerana masih dirujuk oleh ${unitCount} ${unitLabel}.`;
}

export function buildQuarterCategoryCreatedMessage(categoryName: string): string {
  return `${categoryName} berjaya ditambah.`;
}

export function buildQuarterCategoryDuplicateMessage(categoryName: string): string {
  return `Nama kategori ${categoryName} sudah wujud. Sila gunakan nama kategori yang lain.`;
}

function getQuarterCategoryNumericValue(
  quarterCategory: QuarterCategory,
  field: QuarterCategoryNumericField,
) {
  switch (field) {
    case "rentalPrice":
      return Number(quarterCategory.rentalPrice);
    case "maintenancePrice":
      return Number(quarterCategory.maintenancePrice);
    case "penaltyPrice":
      return Number(quarterCategory.penaltyPrice);
  }
}

function parseMoneyInput(
  value: unknown,
  label: string,
): ParseSuccess<number> | ParseFailure {
  if (typeof value !== "string" && typeof value !== "number") {
    return {
      ok: false,
      message: `Nilai ${label} mesti dalam bentuk nombor yang sah.`,
    };
  }

  const normalizedValue = String(value).trim();

  if (normalizedValue.length === 0) {
    return {
      ok: false,
      message: `Nilai ${label} tidak boleh kosong.`,
    };
  }

  if (!/^\d+(\.\d{1,2})?$/.test(normalizedValue)) {
    return {
      ok: false,
      message: `Nilai ${label} mesti nombor yang sah dengan maksimum 2 tempat perpuluhan.`,
    };
  }

  const parsedValue = Number(normalizedValue);

  if (!Number.isFinite(parsedValue) || parsedValue < 0) {
    return {
      ok: false,
      message: `Nilai ${label} mesti nombor yang sah dan tidak negatif.`,
    };
  }

  return {
    ok: true,
    data: Number(parsedValue.toFixed(2)),
  };
}

function parseQuarterCategoryName(
  value: unknown,
): ParseSuccess<string> | ParseFailure {
  if (typeof value !== "string") {
    return {
      ok: false,
      message: "Nama kategori mesti dalam bentuk teks yang sah.",
    };
  }

  const normalizedValue = value.trim().replace(/\s+/g, " ");

  if (normalizedValue.length === 0) {
    return {
      ok: false,
      message: "Nama kategori tidak boleh kosong.",
    };
  }

  if (normalizedValue.length > 100) {
    return {
      ok: false,
      message: "Nama kategori terlalu panjang. Sila gunakan maksimum 100 aksara.",
    };
  }

  return {
    ok: true,
    data: normalizedValue,
  };
}

function parseQuarterCategoryPrices(
  payload: Record<string, unknown>,
  options: {
    requireAllFields: boolean;
  },
): ParseSuccess<QuarterCategoryUpdateInput> | ParseFailure {
  const updates: QuarterCategoryUpdateInput = {};

  const rawValues: Record<QuarterCategoryNumericField, unknown> = {
    rentalPrice: payload.rentalPrice ?? payload.sewa,
    maintenancePrice: payload.maintenancePrice ?? payload.senggara,
    penaltyPrice: payload.penaltyPrice ?? payload.penalti,
  };

  let providedFields = 0;

  for (const field of Object.keys(rawValues) as QuarterCategoryNumericField[]) {
    const rawValue = rawValues[field];

    if (rawValue === undefined) {
      if (options.requireAllFields) {
        return {
          ok: false,
          message: `Nilai ${fieldLabels[field]} perlu diisi.`,
        };
      }

      continue;
    }

    providedFields += 1;

    const parsedValue = parseMoneyInput(rawValue, fieldLabels[field]);

    if (!parsedValue.ok) {
      return parsedValue;
    }

    updates[field] = parsedValue.data;
  }

  if (!options.requireAllFields && providedFields === 0) {
    return {
      ok: false,
      message:
        "Sila berikan sekurang-kurangnya satu nilai untuk sewa, senggara atau penalti.",
    };
  }

  return {
    ok: true,
    data: updates,
  };
}

function joinMalayList(values: string[]) {
  if (values.length === 0) {
    return "";
  }

  if (values.length === 1) {
    return values[0];
  }

  if (values.length === 2) {
    return `${values[0]} dan ${values[1]}`;
  }

  return `${values.slice(0, -1).join(", ")} dan ${values.at(-1)}`;
}
