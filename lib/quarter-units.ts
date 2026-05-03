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

export type QuarterUnitOccupancyDetails = {
  id: string;
  occupantName: string;
  occupantIcNumber: string;
  occupantAge: number | null;
  moveInDate: string;
  moveOutDate: string | null;
  status: "CURRENT" | "PAST";
};

export type QuarterUnitDetails = {
  id: string;
  unitCode: string;
  status: UnitStatus;
  category: {
    id: string;
    categoryName: string;
    address: string | null;
    rates: {
      rentalPrice: number | null;
      maintenancePrice: number | null;
      penaltyPrice: number | null;
    };
  };
  currentOccupancy: QuarterUnitOccupancyDetails | null;
  occupancyHistory: QuarterUnitOccupancyDetails[];
};

export type QuarterCategoryUnitsDetail = {
  id: string;
  categoryName: string;
  address: string | null;
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

// Used to fetch the list of quarter units for a specific quarter category, including their current occupancy status, for display in the units panel of the quarter category detail page.
export const quarterUnitDetailsInclude = {
  quarterCategory: true,
  occupancies: {
    orderBy: [
      {
        status: "asc",
      },
      {
        moveInDate: "desc",
      },
    ],
    include: {
      resident: {
        select: {
          fullName: true,
          icNumber: true,
        },
      },
    },
  },
} satisfies Prisma.UnitInclude;

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

export type UnitWithDetails = Prisma.UnitGetPayload<{
  include: typeof quarterUnitDetailsInclude;
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

export function mapQuarterUnitDetailsForApi(
  unit: UnitWithDetails,
): QuarterUnitDetails {
  const occupancyHistory = unit.occupancies.map((occupancy) => ({
    id: occupancy.id,
    occupantName: occupancy.resident.fullName,
    occupantIcNumber: occupancy.resident.icNumber,
    occupantAge: calculateAgeFromIcNumber(occupancy.resident.icNumber),
    moveInDate: occupancy.moveInDate.toISOString(),
    moveOutDate: occupancy.moveOutDate?.toISOString() ?? null,
    status: occupancy.status,
  }));
  const currentOccupancy =
    occupancyHistory.find((occupancy) => occupancy.status === "CURRENT") ??
    null;

  return {
    id: unit.id,
    unitCode: unit.unitCode,
    status: unit.status,
    category: {
      id: unit.quarterCategory.id,
      categoryName: unit.quarterCategory.categoryName,
      address: unit.quarterCategory.address,
      rates: {
        rentalPrice: Number(unit.quarterCategory.rentalPrice),
        maintenancePrice: Number(unit.quarterCategory.maintenancePrice),
        penaltyPrice: Number(unit.quarterCategory.penaltyPrice),
      },
    },
    currentOccupancy,
    occupancyHistory,
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
    address: quarterCategory.address,
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

function calculateAgeFromIcNumber(icNumber: string) {
  const compactIcNumber = icNumber.replace(/\D/g, "");

  if (compactIcNumber.length < 6) {
    return null;
  }

  const year = Number(compactIcNumber.slice(0, 2));
  const month = Number(compactIcNumber.slice(2, 4));
  const day = Number(compactIcNumber.slice(4, 6));

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return null;
  }

  const currentYear = new Date().getFullYear();
  const currentCentury = Math.floor(currentYear / 100) * 100;
  const candidateYear = currentCentury + year;
  const fullYear =
    candidateYear > currentYear ? candidateYear - 100 : candidateYear;
  const birthDate = new Date(fullYear, month - 1, day);

  if (
    birthDate.getFullYear() !== fullYear ||
    birthDate.getMonth() !== month - 1 ||
    birthDate.getDate() !== day
  ) {
    return null;
  }

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const hasBirthdayPassed =
    today.getMonth() > birthDate.getMonth() ||
    (today.getMonth() === birthDate.getMonth() &&
      today.getDate() >= birthDate.getDate());

  if (!hasBirthdayPassed) {
    age -= 1;
  }

  return age >= 0 ? age : null;
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
