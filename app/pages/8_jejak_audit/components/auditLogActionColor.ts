const AUDIT_ACTION_COLOR_MAP: Record<string, { dot: string; badge: string }> = {
  CREATE: {
    dot: "bg-emerald-500",
    badge: "bg-emerald-100 text-emerald-800",
  },
  UPDATE: {
    dot: "bg-blue-500",
    badge: "bg-blue-100 text-blue-800",
  },
  DELETE: {
    dot: "bg-rose-500",
    badge: "bg-rose-100 text-rose-800",
  },
  VERIFY: {
    dot: "bg-violet-500",
    badge: "bg-violet-100 text-violet-800",
  },
  EXPORT: {
    dot: "bg-amber-500",
    badge: "bg-amber-100 text-amber-800",
  },
  REVERSAL: {
    dot: "bg-red-700",
    badge: "bg-red-100 text-red-800",
  },
  ADJUSTMENT: {
    dot: "bg-cyan-500",
    badge: "bg-cyan-100 text-cyan-800",
  },
  IMPORT_EXTRACT: {
    dot: "bg-fuchsia-500",
    badge: "bg-fuchsia-100 text-fuchsia-800",
  },
};

const FALLBACK_AUDIT_ACTION_COLOR = {
  dot: "bg-slate-400",
  badge: "bg-slate-100 text-slate-800",
};

export function getAuditActionDotColor(actionType: string) {
  return AUDIT_ACTION_COLOR_MAP[actionType]?.dot ?? FALLBACK_AUDIT_ACTION_COLOR.dot;
}

export function getAuditActionBadgeColor(actionType: string) {
  return AUDIT_ACTION_COLOR_MAP[actionType]?.badge ?? FALLBACK_AUDIT_ACTION_COLOR.badge;
}
