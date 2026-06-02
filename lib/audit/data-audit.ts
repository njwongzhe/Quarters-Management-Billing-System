import type { Prisma } from "@prisma/client";

import { createAuditLog } from "@/lib/audit/audit-logs";

type AuditActor = {
  profile: {
    id: string;
    fullName: string;
  };
} | null;

export type AuditChange = {
  label: string;
  before: unknown;
  after: unknown;
};

type DataAuditInput = {
  actor: AuditActor;
  moduleName: string;
  actionType: Prisma.AuditLogCreateInput["actionType"];
  target: string;
  entityType?: Prisma.AuditLogCreateInput["entityType"];
  entityId?: string | null;
  summary: string;
  changes?: AuditChange[];
  details?: Array<string | null | undefined | false>;
};

export async function recordDataAuditLog(
  tx: Prisma.TransactionClient,
  input: DataAuditInput,
) {
  await createAuditLog(tx, {
    actor: input.actor,
    moduleName: input.moduleName,
    targetData: input.target,
    actionType: input.actionType,
    entityType: input.entityType,
    entityId: input.entityId,
    description: buildDataAuditDescription(input),
  });
}

export function buildAuditChanges<T extends Record<string, unknown>>(
  before: T,
  after: Partial<T>,
  labels: Partial<Record<keyof T, string>>,
): AuditChange[] {
  return Object.entries(after).flatMap(([key, nextValue]) => {
    const typedKey = key as keyof T;
    const previousValue = before[typedKey];

    if (normalizeComparableValue(previousValue) === normalizeComparableValue(nextValue)) {
      return [];
    }

    return [
      {
        label: String(labels[typedKey] ?? key),
        before: previousValue,
        after: nextValue,
      },
    ];
  });
}

export function formatAuditTarget(parts: Array<string | null | undefined | false>) {
  const target = parts
    .map((part) => (typeof part === "string" ? part.trim() : ""))
    .filter(Boolean)
    .join(" / ");

  return target || "Data Sistem";
}

export function formatAuditValue(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "Tiada";
  }

  if (value instanceof Date) {
    return formatAuditDate(value);
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value.toLocaleString("ms-MY") : String(value);
  }

  if (typeof value === "boolean") {
    return value ? "Ya" : "Tidak";
  }

  if (Array.isArray(value)) {
    return value.length > 0 ? value.map(formatAuditValue).join(", ") : "Tiada";
  }

  if (typeof value === "object" && "toString" in value) {
    return String(value);
  }

  return String(value);
}

function buildDataAuditDescription(input: DataAuditInput) {
  const lines = [
    `Ringkasan: ${input.summary}`,
    `Sasaran Data: ${input.target}`,
  ];

  const changes = input.changes?.filter(
    (change) =>
      normalizeComparableValue(change.before) !== normalizeComparableValue(change.after),
  );

  if (changes && changes.length > 0) {
    lines.push(
      `Perubahan: ${changes
        .map(
          (change) =>
            `${change.label}: ${formatAuditValue(change.before)} -> ${formatAuditValue(change.after)}`,
        )
        .join("; ")}.`,
    );
  }

  const details = (input.details ?? [])
    .map((detail) => (typeof detail === "string" ? detail.trim() : ""))
    .filter(Boolean);

  if (details.length > 0) {
    lines.push(`Butiran: ${details.join(" ")}`);
  }

  return lines.join("\n");
}

function normalizeComparableValue(value: unknown) {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (value === null || value === undefined || value === "") {
    return "";
  }

  return String(value);
}

function formatAuditDate(value: Date) {
  return new Intl.DateTimeFormat("ms-MY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(value);
}
