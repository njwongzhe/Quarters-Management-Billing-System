import type { AuditLog, Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export const AUDIT_LOGS_PER_PAGE = 10;

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

export async function getAuditLogPage(page: number) {
  const currentPage = Math.max(1, page);
  const offset = (currentPage - 1) * AUDIT_LOGS_PER_PAGE;

  const [totalRecords, auditLogs] = await prisma.$transaction([
    prisma.auditLog.count({
      where: operationalAuditWhere,
    }),
    prisma.auditLog.findMany({
      where: operationalAuditWhere,
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

export async function getAuditLogDetail(id: string) {
  const auditLog = await prisma.auditLog.findFirst({
    where: {
      id,
      AND: [operationalAuditWhere],
    },
  });

  return auditLog ? mapAuditLogDetailItem(auditLog) : null;
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
