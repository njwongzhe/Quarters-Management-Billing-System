import Link from "next/link";

import type { AuditLogDetailItem } from "@/lib/audit-logs";
import { formatEnumLabel } from "@/lib/audit-logs";
import AuditActionBadge from "./AuditActionBadge";

export default function AuditLogDetailOverlay({
  auditLog,
  closeHref,
}: {
  auditLog: AuditLogDetailItem | null;
  closeHref: string;
}) {
  return (
    <div className="fixed bottom-0 left-55 right-0 top-0 z-50 flex items-center justify-center bg-black/70 p-6">
      <section
        className="max-h-[calc(100vh-6rem)] w-full max-w-260 overflow-hidden rounded-2xl bg-light-blue shadow-[0_18px_45px_rgba(0,0,0,0.35)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="audit-details-title"
      >
        <header className="flex min-h-19 items-center justify-between gap-4 bg-dark-blue px-5 text-white sm:px-6">
          <div className="min-w-0 space-y-1">
            <h3
              id="audit-details-title"
              className="truncate text-[19px] font-extrabold uppercase tracking-[-0.02em]"
            >
              Butiran Jejak Audit
            </h3>
            <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-white/70">
              Rekod Aktiviti Sistem
            </p>
          </div>
          <Link
            href={closeHref}
            className="inline-flex text-[34px] leading-none text-white transition hover:scale-95 hover:opacity-80"
            aria-label="Tutup butiran audit"
          >
            &times;
          </Link>
        </header>

        {auditLog ? (
          <div className="max-h-[calc(100vh-11rem)] overflow-auto px-5 py-6 sm:px-6">
            <section className="mb-7">
              <div className="mb-5 flex items-center justify-between gap-4">
                <SectionTitle>Maklumat Aktiviti</SectionTitle>
              </div>

              <div className="grid items-start gap-x-4 gap-y-5 md:grid-cols-12">
                <ModalField
                  label="Sasaran Data"
                  value={auditLog.targetData ?? auditLog.target}
                  tone="strong"
                  className="md:col-span-5"
                />
                <ModalField
                  label="Modul"
                  value={auditLog.module}
                  className="md:col-span-4"
                />
                <ModalField
                  label="Jenis Tindakan"
                  value={formatEnumLabel(auditLog.actionType)}
                  tone="strong"
                  className="md:col-span-3"
                />
              </div>

              <div className="mt-5 grid items-start gap-x-4 gap-y-5 md:grid-cols-12">
                <ModalField
                  label="Pengendali"
                  value={auditLog.actor}
                  className="md:col-span-4"
                />
                <ModalField
                  label="Tarikh & Masa"
                  value={auditLog.timestampLabel}
                  className="md:col-span-4"
                />
                <ModalField
                  label="Jenis Data"
                  value={
                    auditLog.entityType
                      ? formatEnumLabel(auditLog.entityType)
                      : "N/A"
                  }
                  tone={auditLog.entityType ? "default" : "muted"}
                  className="md:col-span-4"
                />
              </div>
            </section>

            <section>
              <div className="mb-5">
                <SectionTitle>Penerangan Perubahan</SectionTitle>
              </div>
              <div className="min-h-28 overflow-hidden rounded-lg border border-[#DCE3F2] bg-[#EEF4FF] px-4 py-3 text-sm font-semibold leading-6 text-dark-grey">
                {auditLog.description || "N/A"}
              </div>
            </section>

          </div>
        ) : (
          <div className="flex min-h-108 items-center justify-center px-5 py-7 sm:px-8 sm:py-8">
            <div className="w-full max-w-md rounded-xl border border-red/20 bg-white p-6 text-center">
              <h4 className="text-lg font-extrabold text-dark-grey">
                Rekod tidak ditemui
              </h4>
              <p className="mt-2 text-sm leading-6 text-grey">
                Rekod audit ini mungkin telah dipadam atau tidak termasuk dalam
                rekod operasi.
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function SectionTitle({ children }: { children: string }) {
  return (
    <h4 className="flex items-center gap-2 text-[13px] font-extrabold uppercase tracking-[0.2em] text-dark-blue">
      <span className="h-4 w-1 rounded-sm bg-dark-blue" aria-hidden="true" />
      {children}
    </h4>
  );
}

function ModalField({
  label,
  value,
  tone = "default",
  className = "",
}: {
  label: string;
  value: string;
  tone?: "default" | "muted" | "strong";
  className?: string;
}) {
  const valueClass = {
    default: "text-dark-grey",
    muted: "text-light-grey",
    strong: "font-extrabold text-dark-grey",
  }[tone];

  return (
    <div className={`flex min-w-0 flex-col gap-2 ${className}`}>
      <label className="block h-3 text-[10px] font-extrabold uppercase leading-3 tracking-[0.13em] text-grey">
        {label}
      </label>
      <div
        className={`flex h-12 items-center overflow-hidden rounded-lg border border-[#DCE3F2] bg-[#EEF4FF] px-4 text-sm ${valueClass}`}
        title={value}
      >
        <span className="truncate">{value}</span>
      </div>
    </div>
  );
}
