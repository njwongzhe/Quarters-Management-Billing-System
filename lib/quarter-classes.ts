import type { QuarterClass } from "@prisma/client";

export type QuarterClassListItem = {
  id: string;
  className: string;
  rentalPrice: number;
  maintenancePrice: number;
  penaltyPrice: number;
  unitCount: number;
  canDelete: boolean;
  updatedAt: string;
};

export type QuarterClassSummary = {
  totalUnits: number;
  occupiedUnits: number;
  vacantUnits: number;
  occupancyRate: number;
};

type QuarterClassWithUnitCount = QuarterClass & {
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

export type QuarterClassNumericField =
  | "rentalPrice"
  | "maintenancePrice"
  | "penaltyPrice";

export type QuarterClassUpdateInput = Partial<
  Record<QuarterClassNumericField, number>
>;

export type QuarterClassCreateInput = {
  className: string;
  rentalPrice: number;
  maintenancePrice: number;
  penaltyPrice: number;
};

const fieldLabels: Record<QuarterClassNumericField, string> = {
  rentalPrice: "sewa",
  maintenancePrice: "senggara",
  penaltyPrice: "penalti",
};

export function mapQuarterClassForApi(
  quarterClass: QuarterClassWithUnitCount,
): QuarterClassListItem {
  return {
    id: quarterClass.id,
    className: quarterClass.className,
    rentalPrice: Number(quarterClass.rentalPrice),
    maintenancePrice: Number(quarterClass.maintenancePrice),
    penaltyPrice: Number(quarterClass.penaltyPrice),
    unitCount: quarterClass._count.units,
    canDelete: quarterClass._count.units === 0,
    updatedAt: quarterClass.updatedAt.toISOString(),
  };
}

export function buildQuarterClassSummary(summary: {
  totalUnits: number;
  occupiedUnits: number;
  vacantUnits: number;
}): QuarterClassSummary {
  const occupancyRate =
    summary.totalUnits === 0
      ? 0
      : Number(((summary.occupiedUnits / summary.totalUnits) * 100).toFixed(1));

  return {
    ...summary,
    occupancyRate,
  };
}

export function parseQuarterClassUpdateBody(
  body: unknown,
): ParseSuccess<QuarterClassUpdateInput> | ParseFailure {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return {
      ok: false,
      message: "Data permintaan tidak sah.",
    };
  }

  const payload = body as Record<string, unknown>;
  return parseQuarterClassPrices(payload, {
    requireAllFields: false,
  });
}

export function parseQuarterClassCreateBody(
  body: unknown,
): ParseSuccess<QuarterClassCreateInput> | ParseFailure {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return {
      ok: false,
      message: "Data permintaan tidak sah.",
    };
  }

  const payload = body as Record<string, unknown>;
  const parsedClassName = parseQuarterClassName(payload.className ?? payload.kelas);

  if (!parsedClassName.ok) {
    return parsedClassName;
  }

  const parsedPrices = parseQuarterClassPrices(payload, {
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
      message: "Semua nilai kadar kelas kuarters perlu diisi.",
    };
  }

  return {
    ok: true,
    data: {
      className: parsedClassName.data,
      rentalPrice,
      maintenancePrice,
      penaltyPrice,
    },
  };
}

export function getChangedQuarterClassFields(
  current: QuarterClass,
  updates: QuarterClassUpdateInput,
): QuarterClassNumericField[] {
  return (Object.keys(updates) as QuarterClassNumericField[]).filter((field) => {
    const currentValue = getQuarterClassNumericValue(current, field);
    const updatedValue = updates[field];

    return updatedValue !== undefined && currentValue !== updatedValue;
  });
}

export function buildQuarterClassUpdatedMessage(
  className: string,
  changedFields: QuarterClassNumericField[],
): string {
  if (changedFields.length === 0) {
    return `Tiada perubahan dibuat pada ${className}.`;
  }

  const labels = changedFields.map((field) => fieldLabels[field]);
  const joinedLabels = joinMalayList(labels);

  return `Kadar ${joinedLabels} bagi ${className} berjaya dikemas kini.`;
}

export function buildQuarterClassDeleteBlockedMessage(
  className: string,
  unitCount: number,
): string {
  // unitCount === 1 ? "unit" : "unit"; is used to handle singular vs plural in Malay, but since "unit" is the same in both cases, we can just return "unit" regardless of the count.
  const unitLabel = unitCount === 1 ? "unit" : "unit";

  return `${className} tidak boleh dipadam kerana masih dirujuk oleh ${unitCount} ${unitLabel}.`;
}

export function buildQuarterClassCreatedMessage(className: string): string {
  return `${className} berjaya ditambah.`;
}

export function buildQuarterClassDuplicateMessage(className: string): string {
  return `Nama kelas ${className} sudah wujud. Sila gunakan nama kelas yang lain.`;
}

function getQuarterClassNumericValue(
  quarterClass: QuarterClass,
  field: QuarterClassNumericField,
) {
  switch (field) {
    case "rentalPrice":
      return Number(quarterClass.rentalPrice);
    case "maintenancePrice":
      return Number(quarterClass.maintenancePrice);
    case "penaltyPrice":
      return Number(quarterClass.penaltyPrice);
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

function parseQuarterClassName(
  value: unknown,
): ParseSuccess<string> | ParseFailure {
  if (typeof value !== "string") {
    return {
      ok: false,
      message: "Nama kelas mesti dalam bentuk teks yang sah.",
    };
  }

  const normalizedValue = value.trim().replace(/\s+/g, " ");

  if (normalizedValue.length === 0) {
    return {
      ok: false,
      message: "Nama kelas tidak boleh kosong.",
    };
  }

  if (normalizedValue.length > 100) {
    return {
      ok: false,
      message: "Nama kelas terlalu panjang. Sila gunakan maksimum 100 aksara.",
    };
  }

  return {
    ok: true,
    data: normalizedValue,
  };
}

function parseQuarterClassPrices(
  payload: Record<string, unknown>,
  options: {
    requireAllFields: boolean;
  },
): ParseSuccess<QuarterClassUpdateInput> | ParseFailure {
  const updates: QuarterClassUpdateInput = {};

  const rawValues: Record<QuarterClassNumericField, unknown> = {
    rentalPrice: payload.rentalPrice ?? payload.sewa,
    maintenancePrice: payload.maintenancePrice ?? payload.senggara,
    penaltyPrice: payload.penaltyPrice ?? payload.penalti,
  };

  let providedFields = 0;

  for (const field of Object.keys(rawValues) as QuarterClassNumericField[]) {
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
