import type { QuarterCategory } from "@prisma/client";

export type QuarterCategoryListItem = {
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

export type QuarterCategoryTextField = "categoryName" | "address";

export type QuarterCategoryField =
  | QuarterCategoryTextField
  | QuarterCategoryNumericField;

export type QuarterCategoryUpdateInput = {
  categoryName?: string;
  address?: string | null;
  rentalPrice?: number;
  maintenancePrice?: number;
  penaltyPrice?: number;
};

export type QuarterCategoryCreateInput = {
  categoryName: string;
  address: string | null;
  rentalPrice: number;
  maintenancePrice: number;
  penaltyPrice: number;
};

const fieldLabels: Record<QuarterCategoryField, string> = {
  categoryName: "nama kategori",
  address: "alamat",
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
    address: quarterCategory.address,
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
  const parsedFields = parseQuarterCategoryFields(payload, {
    requireCategoryName: false,
    requireAllFields: false,
  });

  if (!parsedFields.ok) {
    return parsedFields;
  }

  if (Object.keys(parsedFields.data).length === 0) {
    return {
      ok: false,
      message:
        "Sila berikan sekurang-kurangnya satu nilai untuk nama kategori, alamat, sewa, senggara atau penalti.",
    };
  }

  return parsedFields;
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

  const parsedAddress = parseQuarterCategoryAddress(
    payload.address ?? payload.alamat,
    {
      requireAddress: true,
    },
  );

  if (!parsedAddress.ok) {
    return parsedAddress;
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
      address: parsedAddress.data,
      rentalPrice,
      maintenancePrice,
      penaltyPrice,
    },
  };
}

export function getChangedQuarterCategoryFields(
  current: QuarterCategory,
  updates: QuarterCategoryUpdateInput,
): QuarterCategoryField[] {
  return (Object.keys(updates) as QuarterCategoryField[]).filter((field) => {
    const currentValue = getQuarterCategoryValue(current, field);
    const updatedValue = updates[field];

    return updatedValue !== undefined && currentValue !== updatedValue;
  });
}

export function buildQuarterCategoryUpdatedMessage(
  categoryName: string,
  changedFields: QuarterCategoryField[],
): string {
  if (changedFields.length === 0) {
    return `Tiada perubahan dibuat pada ${categoryName}.`;
  }

  const labels = changedFields.map((field) => fieldLabels[field]);
  const joinedLabels = joinMalayList(labels);

  return `Maklumat ${joinedLabels} bagi ${categoryName} berjaya dikemas kini.`;
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

export function buildQuarterCategoryDuplicateMessage(
  categoryName: string,
  address?: string | null,
): string {
  const resolvedAddress = address?.trim();

  if (!resolvedAddress) {
    return `Gabungan nama kategori ${categoryName} dan alamat tersebut sudah wujud. Sila gunakan gabungan yang lain.`;
  }

  return `Gabungan nama kategori ${categoryName} dan alamat ${resolvedAddress} sudah wujud. Sila gunakan gabungan yang lain.`;
}

function getQuarterCategoryValue(
  quarterCategory: QuarterCategory,
  field: QuarterCategoryField,
) {
  switch (field) {
    case "categoryName":
      return quarterCategory.categoryName;
    case "address":
      return quarterCategory.address;
    case "rentalPrice":
      return Number(quarterCategory.rentalPrice);
    case "maintenancePrice":
      return Number(quarterCategory.maintenancePrice);
    case "penaltyPrice":
      return Number(quarterCategory.penaltyPrice);
  }
}

function parseQuarterCategoryFields(
  payload: Record<string, unknown>,
  options: {
    requireCategoryName: boolean;
    requireAllFields: boolean;
  },
): ParseSuccess<QuarterCategoryUpdateInput> | ParseFailure {
  const updates: QuarterCategoryUpdateInput = {};
  const rawCategoryName = payload.categoryName ?? payload.kategori ?? payload.kelas;
  const rawAddress = payload.address ?? payload.alamat;

  if (rawCategoryName !== undefined || options.requireCategoryName) {
    const parsedCategoryName = parseQuarterCategoryName(rawCategoryName);

    if (!parsedCategoryName.ok) {
      return parsedCategoryName;
    }

    updates.categoryName = parsedCategoryName.data;
  }

  if (rawAddress !== undefined) {
    const parsedAddress = parseQuarterCategoryAddress(rawAddress, {
      requireAddress: true,
    });

    if (!parsedAddress.ok) {
      return parsedAddress;
    }

    updates.address = parsedAddress.data;
  }

  const hasAnyPrice =
    payload.rentalPrice !== undefined ||
    payload.sewa !== undefined ||
    payload.maintenancePrice !== undefined ||
    payload.senggara !== undefined ||
    payload.penaltyPrice !== undefined ||
    payload.penalti !== undefined;

  const parsedPrices =
    options.requireAllFields || hasAnyPrice
      ? parseQuarterCategoryPrices(payload, {
          requireAllFields: options.requireAllFields,
        })
      : ({
          ok: true,
          data: {},
        } as const);

  if (!parsedPrices.ok) {
    return parsedPrices;
  }

  return {
    ok: true,
    data: {
      ...updates,
      ...parsedPrices.data,
    },
  };
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

function parseQuarterCategoryAddress(
  value: unknown,
  options: {
    requireAddress: boolean;
  } = {
    requireAddress: false,
  },
): ParseSuccess<string | null> | ParseFailure {
  if (value === undefined || value === null) {
    if (options.requireAddress) {
      return {
        ok: false,
        message: "Alamat tidak boleh kosong.",
      };
    }

    return {
      ok: true,
      data: null,
    };
  }

  if (typeof value !== "string") {
    return {
      ok: false,
      message: "Alamat mesti dalam bentuk teks yang sah.",
    };
  }

  const normalizedValue = value.trim().replace(/\s+/g, " ");

  if (normalizedValue.length === 0) {
    if (options.requireAddress) {
      return {
        ok: false,
        message: "Alamat tidak boleh kosong.",
      };
    }

    return {
      ok: true,
      data: null,
    };
  }

  if (normalizedValue.length > 500) {
    return {
      ok: false,
      message: "Alamat terlalu panjang. Sila gunakan maksimum 500 aksara.",
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
