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

export type AuditLogListItem = {
  id: string;
  timestamp: string;
  timestampLabel: string;
  actor: string;
  module: string;
  actionType: string;
  actionTypeLabel: string;
  target: string;
  entityType: string | null;
  entityId: string | null;
};

export type AuditLogDetailItem = AuditLogListItem & {
  targetData: string | null;
  description: string;
  userId: string | null;
};

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

export function formatEnumLabel(value: string) {
  return value.replace(/_/g, " ");
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
