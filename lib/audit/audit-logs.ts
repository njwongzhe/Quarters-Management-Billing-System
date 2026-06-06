import type { AuditLog, Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export const AUDIT_LOGS_PER_PAGE = 10;
export const AUDIT_ACTION_TYPE_OPTIONS = [
  "CREATE",
  "UPDATE",
  "DELETE",
  "VERIFY",
  "EXPORT",
  "REVERSAL",
  "ADJUSTMENT",
  "IMPORT_EXTRACT",
] as const;

export type AuditActionTypeFilter = (typeof AUDIT_ACTION_TYPE_OPTIONS)[number];

export type AuditLogFilters = {
  dateFrom?: string;
  dateTo?: string;
  actionType?: string;
  adminId?: string;
  search?: string;
};

type AuditActor = {
  profile: {
    id: string;
    fullName: string;
  };
} | null;

type CreateAuditLogInput = {
  actor: AuditActor;
  moduleName: string;
  targetData?: string | null;
  actionType: Prisma.AuditLogCreateInput["actionType"];
  description: string;
  entityType?: Prisma.AuditLogCreateInput["entityType"];
  entityId?: string | null;
};

export async function createAuditLog(
  tx: Prisma.TransactionClient,
  input: CreateAuditLogInput,
) {
  await tx.auditLog.create({
    data: {
      userId: input.actor?.profile.id ?? null,
      userName: input.actor?.profile.fullName ?? "Sistem",
      moduleName: input.moduleName,
      targetData: input.targetData ?? null,
      actionType: input.actionType,
      description: input.description,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
    },
  });
}

const operationalAuditWhere: Prisma.AuditLogWhereInput = {
  actionType: {
    notIn: ["LOGIN", "LOGOUT"],
  },
  OR: [
    {
      entityType: {
        not: "ADMIN_PROFILE",
      },
    },
    {
      entityType: null,
    },
  ],
};

export type AuditLogListItem = ReturnType<typeof mapAuditLogListItem>;
export type AuditLogDetailItem = ReturnType<typeof mapAuditLogDetailItem>;
export type AuditLogExportItem = ReturnType<typeof mapAuditLogExportItem>;

export async function getAuditLogPage(page: number, filters: AuditLogFilters = {}) {
  const currentPage = Math.max(1, page);
  const offset = (currentPage - 1) * AUDIT_LOGS_PER_PAGE;
  const where = buildAuditLogWhere(filters);

  const [totalRecords, auditLogs] = await Promise.all([
    prisma.auditLog.count({
      where,
    }),
    prisma.auditLog.findMany({
      where,
      orderBy: {
        timestamp: "desc",
      },
      skip: offset,
      take: AUDIT_LOGS_PER_PAGE,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalRecords / AUDIT_LOGS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const firstRecord = totalRecords === 0 ? 0 : offset + 1;
  const lastRecord = Math.min(offset + auditLogs.length, totalRecords);

  return {
    records: auditLogs.map(mapAuditLogListItem),
    pagination: {
      currentPage: safeCurrentPage,
      totalPages,
      totalRecords,
      firstRecord,
      lastRecord,
      perPage: AUDIT_LOGS_PER_PAGE,
    },
  };
}

export async function getAuditLogFilterOptions() {
  const adminLogs = await prisma.auditLog.findMany({
    where: {
      AND: [
        operationalAuditWhere,
        {
          userId: {
            not: null,
          },
        },
      ],
    },
    distinct: ["userId"],
    orderBy: {
      userName: "asc",
    },
    select: {
      userId: true,
      userName: true,
    },
  });

  return {
    actionTypes: AUDIT_ACTION_TYPE_OPTIONS.map((value) => ({
      value,
      label: formatEnumLabel(value),
    })),
    admins: adminLogs
      .filter((adminLog) => adminLog.userId)
      .map((adminLog) => ({
        id: adminLog.userId as string,
        name: adminLog.userName,
      })),
  };
}

export async function getAuditLogExportRows(filters: AuditLogFilters = {}) {
  const auditLogs = await prisma.auditLog.findMany({
    where: buildAuditLogWhere(filters),
    orderBy: {
      timestamp: "desc",
    },
  });

  return auditLogs.map(mapAuditLogExportItem);
}

export async function getAuditLogDetail(id: string) {
  const auditLog = await prisma.auditLog.findFirst({
    where: {
      id,
      AND: [operationalAuditWhere],
    },
  });

  return auditLog ? mapAuditLogDetailItem(auditLog) : null;
}

export function parseAuditLogFilters(input: {
  dateFrom?: string;
  dateTo?: string;
  actionType?: string;
  adminId?: string;
  search?: string;
}): AuditLogFilters {
  const filters: AuditLogFilters = {};

  if (isValidDateInput(input.dateFrom)) {
    filters.dateFrom = input.dateFrom;
  }

  if (isValidDateInput(input.dateTo)) {
    filters.dateTo = input.dateTo;
  }

  const normalizedActionType = normalizeActionTypeInput(input.actionType);
  if (normalizedActionType) {
    filters.actionType = normalizedActionType;
  }

  const normalizedAdminId = normalizeCsvInput(input.adminId);
  if (normalizedAdminId) {
    filters.adminId = normalizedAdminId;
  }

  if (input.search?.trim()) {
    filters.search = input.search.trim();
  }

  return filters;
}

export function hasActiveAuditLogFilters(filters: AuditLogFilters) {
  return Boolean(
    filters.dateFrom ||
      filters.dateTo ||
      filters.actionType ||
      filters.adminId ||
      filters.search,
  );
}

export function buildAuditLogQueryString(
  filters: AuditLogFilters,
  extraParams: Record<string, string | number | null | undefined> = {},
) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(filters)) {
    if (value) {
      params.set(key, value);
    }
  }

  for (const [key, value] of Object.entries(extraParams)) {
    if (value === null || value === undefined || value === "") {
      params.delete(key);
      continue;
    }

    params.set(key, String(value));
  }

  const queryString = params.toString();

  return queryString ? `?${queryString}` : "";
}

export function mapAuditLogListItem(log: AuditLog) {
  return {
    id: log.id,
    timestamp: log.timestamp.toISOString(),
    timestampLabel: formatAuditDate(log.timestamp),
    actor: log.userName,
    module: log.moduleName,
    actionType: log.actionType,
    actionTypeLabel: formatEnumLabel(log.actionType),
    target: log.targetData ?? buildAuditTarget(log.entityType, log.entityId),
    entityType: log.entityType,
    entityId: log.entityId,
  };
}

export function mapAuditLogDetailItem(log: AuditLog) {
  return {
    ...mapAuditLogListItem(log),
    targetData: log.targetData,
    description: log.description,
    userId: log.userId,
  };
}

export function mapAuditLogExportItem(log: AuditLog) {
  return {
    ...mapAuditLogDetailItem(log),
    entityTypeLabel: log.entityType ? formatEnumLabel(log.entityType) : "N/A",
  };
}

export function buildAuditTarget(
  entityType: string | null,
  entityId: string | null,
) {
  if (!entityType && !entityId) {
    return "Sistem";
  }

  const entityLabel = entityType ? formatEnumLabel(entityType) : "Data";
  const shortId = entityId ? entityId.slice(0, 8).toUpperCase() : "";

  return shortId ? `${entityLabel} / ${shortId}` : entityLabel;
}

export function formatEnumLabel(value: string) {
  return value.replace(/_/g, " ");
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

function buildAuditLogWhere(filters: AuditLogFilters): Prisma.AuditLogWhereInput {
  const filterConditions: Prisma.AuditLogWhereInput[] = [];

  if (filters.dateFrom || filters.dateTo) {
    const timestamp: Prisma.DateTimeFilter = {};

    if (filters.dateFrom) {
      timestamp.gte = new Date(`${filters.dateFrom}T00:00:00.000+08:00`);
    }

    if (filters.dateTo) {
      timestamp.lte = new Date(`${filters.dateTo}T23:59:59.999+08:00`);
    }

    filterConditions.push({ timestamp });
  }

  if (filters.actionType) {
    if (filters.actionType === "none") {
      // Force an empty result set with a valid DateTime condition.
      filterConditions.push({
        timestamp: {
          lt: new Date("1970-01-01T00:00:00.000Z"),
          gt: new Date(),
        },
      });
    } else {
      const actionTypes = filters.actionType
        .split(",")
        .map((value) => value.trim())
        .filter((value): value is AuditActionTypeFilter => isAuditActionTypeFilter(value));

      if (actionTypes.length === 1) {
        filterConditions.push({ actionType: actionTypes[0] });
      } else if (actionTypes.length > 1) {
        filterConditions.push({ actionType: { in: actionTypes } });
      }
    }
  }

  if (filters.adminId) {
    if (filters.adminId === "none") {
      // Force an empty result set with a valid DateTime condition.
      filterConditions.push({
        timestamp: {
          lt: new Date("1970-01-01T00:00:00.000Z"),
          gt: new Date(),
        },
      });
    } else {
      const adminIds = filters.adminId
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);

      if (adminIds.length === 1) {
        filterConditions.push({ userId: adminIds[0] });
      } else if (adminIds.length > 1) {
        filterConditions.push({ userId: { in: adminIds } });
      }
    }
  }

  if (filters.search) {
    const search = filters.search.trim();

    if (search) {
      const searchableConditions: Prisma.AuditLogWhereInput[] = [
        {
          userName: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          moduleName: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          description: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          targetData: {
            contains: search,
            mode: "insensitive",
          },
        },
      ];

      if (isAuditActionTypeFilter(search)) {
        searchableConditions.push({ actionType: search });
      }

      filterConditions.push({
        OR: searchableConditions,
      });
    }
  }

  return {
    AND: [operationalAuditWhere, ...filterConditions],
  };
}

function isAuditActionTypeFilter(
  value: string | undefined,
): value is AuditActionTypeFilter {
  return AUDIT_ACTION_TYPE_OPTIONS.includes(value as AuditActionTypeFilter);
}

function normalizeActionTypeInput(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  if (trimmed === "none") {
    return "none";
  }

  const validValues = Array.from(
    new Set(
      trimmed
        .split(",")
        .map((item) => item.trim())
        .filter((item): item is AuditActionTypeFilter => isAuditActionTypeFilter(item)),
    ),
  );

  return validValues.length > 0 ? validValues.join(",") : undefined;
}

function normalizeCsvInput(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  if (trimmed === "none") {
    return "none";
  }

  const values = Array.from(
    new Set(
      trimmed
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );

  return values.length > 0 ? values.join(",") : undefined;
}

function isValidDateInput(value: string | undefined) {
  if (!value) {
    return false;
  }

  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}
