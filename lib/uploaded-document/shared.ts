import type { Prisma } from "@prisma/client";

export type QueryClient = Pick<Prisma.TransactionClient, "$queryRaw">;

export function jsonRecord<T>(value: Prisma.JsonValue | null, fallback: T): T {
  return value && typeof value === "object" && !Array.isArray(value)
    ? ({ ...fallback, ...value } as T)
    : fallback;
}

export function rawData(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? {}));
}

export async function findResidentByNormalizedIc(
  tx: QueryClient,
  icNumber: string,
) {
  const residents = await tx.$queryRaw<{ id: string }[]>`
    SELECT "id"
    FROM "Resident"
    WHERE regexp_replace("icNumber", '\\D', '', 'g') =
      regexp_replace(${icNumber}, '\\D', '', 'g')
    ORDER BY "createdAt" ASC
    LIMIT 1
  `;

  return residents[0]?.id ?? "";
}

export async function ensureResidentFromDraft(
  tx: Prisma.TransactionClient,
  draft: {
    fullName: string;
    icNumber: string;
    phone?: string | null;
    position?: string | null;
    department?: string | null;
    description?: string | null;
  },
) {
  const existingResidentId = await findResidentByNormalizedIc(tx, draft.icNumber);

  if (existingResidentId) {
    return existingResidentId;
  }

  const resident = await tx.resident.create({
    data: {
      fullName: draft.fullName,
      icNumber: draft.icNumber,
      phone: draft.phone ?? null,
      position: draft.position ?? null,
      department: draft.department ?? null,
      description: draft.description ?? null,
    },
    select: { id: true },
  });

  return resident.id;
}
