import type { Prisma, UnitStatus } from "@prisma/client";

import { buildQuarterCategorySummary, type QuarterCategorySummary } from "./quarter-categories";

type ParseSuccess<T> = {
  ok: true;
  data: T;
};

type ParseFailure = {
  ok: false;
  message: string;
};

type QuarterUnitUpdatableField = "unitCode" | "occupant";

export type QuarterUnitListItem = {
  id: string;
  unitCode: string;
  status: UnitStatus;
  occupantIcNumber: string | null;
  occupantName: string | null;
};

export type QuarterCategoryUnitsDetail = {
  id: string;
  categoryName: string;
  rates: {
    rentalPrice: number | null;
    maintenancePrice: number | null;
    penaltyPrice: number | null;
  };
  summary: QuarterCategorySummary | null;
  units: QuarterUnitListItem[];
};

export type QuarterUnitCreateInput = {
  unitCode: string;
  occupantIcNumber: string | null;
};

export type QuarterUnitUpdateInput = {
  unitCode?: string;
  occupantIcNumber?: string | null;
};

export type QuarterUnitUpdateBody = {
  updates: QuarterUnitUpdateInput;
  providedFields: {
    unitCode: boolean;
    occupantIcNumber: boolean;
  };
};

export const quarterUnitCurrentOccupancyInclude = {
  occupancies: {
    where: {
      status: "CURRENT",
    },
    orderBy: {
      moveInDate: "desc",
    },
    take: 1,
    include: {
      resident: {
        select: {
          id: true,
          fullName: true,
          icNumber: true,
        },
      },
    },
  },
} satisfies Prisma.UnitInclude;

export const QuarterCategoryUnitsDetailInclude = {
  units: {
    orderBy: {
      unitCode: "asc",
    },
    include: quarterUnitCurrentOccupancyInclude,
  },
} satisfies Prisma.QuarterCategoryInclude;

export type UnitWithCurrentOccupancy = Prisma.UnitGetPayload<{
  include: typeof quarterUnitCurrentOccupancyInclude;
}>;

export type QuarterCategoryWithUnits = Prisma.QuarterCategoryGetPayload<{
  include: typeof QuarterCategoryUnitsDetailInclude;
}>;

export function mapQuarterUnitForApi(
  unit: UnitWithCurrentOccupancy,
): QuarterUnitListItem {
  const currentOccupancy = unit.occupancies[0];

  return {
    id: unit.id,
    unitCode: unit.unitCode,
    status: unit.status,
    occupantIcNumber: currentOccupancy?.resident.icNumber ?? null,
    occupantName: currentOccupancy?.resident.fullName ?? null,
  };
}

export function mapQuarterCategoryUnitsDetailForApi(
  quarterCategory: QuarterCategoryWithUnits,
): QuarterCategoryUnitsDetail {
  const occupiedUnits = quarterCategory.units.filter(
    (unit) => unit.status === "OCCUPIED",
  ).length;
  const totalUnits = quarterCategory.units.length;
  const vacantUnits = totalUnits - occupiedUnits;

  return {
    id: quarterCategory.id,
    categoryName: quarterCategory.categoryName,
    rates: {
      rentalPrice: Number(quarterCategory.rentalPrice),
      maintenancePrice: Number(quarterCategory.maintenancePrice),
      penaltyPrice: Number(quarterCategory.penaltyPrice),
    },
    summary: buildQuarterCategorySummary({
      totalUnits,
      occupiedUnits,
      vacantUnits,
    }),
    units: quarterCategory.units.map(mapQuarterUnitForApi),
  };
}

export function parseQuarterUnitCreateBody(
  body: unknown,
): ParseSuccess<QuarterUnitCreateInput> | ParseFailure {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return {
      ok: false,
      message: "Data permintaan unit kuarters tidak sah.",
    };
  }

  const payload = body as Record<string, unknown>;
  const parsedUnitCode = parseUnitCode(payload.unitCode ?? payload.idUnit, {
    required: true,
  });

  if (!parsedUnitCode.ok) {
    return parsedUnitCode;
  }

  const parsedOccupantIcNumber = parseOccupantIcNumber(
    payload.occupantIcNumber ?? payload.noKadPengenalanPenghuni ?? payload.icNumber,
  );

  if (!parsedOccupantIcNumber.ok) {
    return parsedOccupantIcNumber;
  }

  return {
    ok: true,
    data: {
      unitCode: parsedUnitCode.data,
      occupantIcNumber: parsedOccupantIcNumber.data,
    },
  };
}

export function parseQuarterUnitUpdateBody(
  body: unknown,
): ParseSuccess<QuarterUnitUpdateBody> | ParseFailure {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return {
      ok: false,
      message: "Data permintaan unit kuarters tidak sah.",
    };
  }

  const payload = body as Record<string, unknown>;
  const hasUnitCodeField =
    hasOwn(payload, "unitCode") || hasOwn(payload, "idUnit");
  const hasOccupantIcNumberField =
    hasOwn(payload, "occupantIcNumber") ||
    hasOwn(payload, "noKadPengenalanPenghuni") ||
    hasOwn(payload, "icNumber");

  if (!hasUnitCodeField && !hasOccupantIcNumberField) {
    return {
      ok: false,
      message:
        "Sila berikan sekurang-kurangnya satu nilai untuk kod unit atau nombor kad pengenalan penghuni.",
    };
  }

  const updates: QuarterUnitUpdateInput = {};

  if (hasUnitCodeField) {
    const parsedUnitCode = parseUnitCode(payload.unitCode ?? payload.idUnit, {
      required: true,
    });

    if (!parsedUnitCode.ok) {
      return parsedUnitCode;
    }

    updates.unitCode = parsedUnitCode.data;
  }

  if (hasOccupantIcNumberField) {
    const parsedOccupantIcNumber = parseOccupantIcNumber(
      payload.occupantIcNumber ??
        payload.noKadPengenalanPenghuni ??
        payload.icNumber,
    );

    if (!parsedOccupantIcNumber.ok) {
      return parsedOccupantIcNumber;
    }

    updates.occupantIcNumber = parsedOccupantIcNumber.data;
  }

  return {
    ok: true,
    data: {
      updates,
      providedFields: {
        unitCode: hasUnitCodeField,
        occupantIcNumber: hasOccupantIcNumberField,
      },
    },
  };
}

export function buildQuarterUnitCreatedMessage(
  unitCode: string,
  categoryName: string,
) {
  return `Unit ${unitCode} bagi ${categoryName} berjaya ditambah.`;
}

export function buildQuarterUnitUpdatedMessage(
  unitCode: string,
  changedFields: QuarterUnitUpdatableField[],
) {
  if (changedFields.length === 0) {
    return `Tiada perubahan dibuat pada unit ${unitCode}.`;
  }

  const labels = changedFields.map((field) =>
    field === "unitCode" ? "kod unit" : "penghuni",
  );

  return `Maklumat ${joinMalayList(labels)} bagi unit ${unitCode} berjaya dikemas kini.`;
}

export function buildQuarterUnitDeletedMessage(unitCode: string) {
  return `Unit ${unitCode} berjaya dipadam.`;
}

export function buildQuarterUnitDuplicateMessage(unitCode: string) {
  return `Kod unit ${unitCode} sudah wujud dalam kategori ini. Sila gunakan kod unit yang lain.`;
}

export function buildQuarterUnitDeleteBlockedMessage(
  unitCode: string,
  references: {
    occupancies: number;
    monthlyCharges: number;
  },
) {
  const dependencyLabels: string[] = [];

  if (references.occupancies > 0) {
    dependencyLabels.push(`${references.occupancies} rekod penghunian`);
  }

  if (references.monthlyCharges > 0) {
    dependencyLabels.push(`${references.monthlyCharges} rekod caj bulanan`);
  }

  const dependencyText =
    dependencyLabels.length > 0
      ? joinMalayList(dependencyLabels)
      : "rekod yang dirujuk";

  return `Unit ${unitCode} tidak boleh dipadam kerana masih dirujuk oleh ${dependencyText}.`;
}

export function buildQuarterUnitResidentNotFoundMessage(icNumber: string) {
  return `Penghuni dengan nombor kad pengenalan ${icNumber} tidak ditemui.`;
}

export function buildQuarterUnitOccupancyConflictMessage(
  occupantName: string,
  occupantIcNumber: string,
  unitCode: string,
  categoryName?: string,
) {
  const unitReference = categoryName
    ? `unit ${unitCode} dalam kategori ${categoryName}`
    : `unit ${unitCode}`;

  return `${occupantName} (${occupantIcNumber}) sedang dikaitkan dengan ${unitReference}. Sila kosongkan unit tersebut terlebih dahulu.`;
}

function parseUnitCode(
  value: unknown,
  options: {
    required: boolean;
  },
): ParseSuccess<string> | ParseFailure {
  if (typeof value !== "string") {
    return {
      ok: false,
      message: options.required
        ? "Kod unit mesti dalam bentuk teks yang sah."
        : "Kod unit mesti dalam bentuk teks yang sah jika diberikan.",
    };
  }

  const normalizedValue = value.trim().replace(/\s+/g, " ");

  if (normalizedValue.length === 0) {
    return {
      ok: false,
      message: "Kod unit tidak boleh kosong.",
    };
  }

  if (normalizedValue.length > 50) {
    return {
      ok: false,
      message: "Kod unit terlalu panjang. Sila gunakan maksimum 50 aksara.",
    };
  }

  return {
    ok: true,
    data: normalizedValue,
  };
}

function parseOccupantIcNumber(
  value: unknown,
): ParseSuccess<string | null> | ParseFailure {
  if (value === undefined || value === null) {
    return {
      ok: true,
      data: null,
    };
  }

  if (typeof value !== "string") {
    return {
      ok: false,
      message: "Nombor kad pengenalan penghuni mesti dalam bentuk teks yang sah.",
    };
  }

  const normalizedValue = value.trim();

  if (normalizedValue.length === 0) {
    return {
      ok: true,
      data: null,
    };
  }

  if (normalizedValue.length > 20) {
    return {
      ok: false,
      message:
        "Nombor kad pengenalan penghuni terlalu panjang. Sila gunakan maksimum 20 aksara.",
    };
  }

  return {
    ok: true,
    data: normalizedValue,
  };
}

// Checks if an object has a own property with the specified key, guarding against cases where the object might have a null prototype.
function hasOwn(payload: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(payload, key);
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
