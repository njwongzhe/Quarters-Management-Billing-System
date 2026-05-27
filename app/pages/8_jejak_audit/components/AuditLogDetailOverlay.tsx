import Icon from "@/app/components/Icon/Icon";
import { InputBox, InputField, Topic } from "@/app/components/InputField";
import SearchingDetailDataOverlay from "@/app/components/Loading/SearchingDetailDataOverlay";

import {
  formatEnumLabel,
  type AuditLogDetailItem,
} from "./auditLogClient";
import { getAuditActionBadgeColor } from "./auditLogActionColor";

function getAuditActionTextClass(actionType: string) {
  const badgeClass = getAuditActionBadgeColor(actionType);
  return badgeClass
    .split(" ")
    .find((className) => className.startsWith("text-")) ?? "text-slate-800";
}

export default function AuditLogDetailOverlay({
  auditLog,
  isLoading,
  errorMessage,
  onRetry,
  onClose,
}: {
  auditLog: AuditLogDetailItem | null;
  isLoading: boolean;
  errorMessage: string | null;
  onRetry: () => void;
  onClose: () => void;
import type { AuditLogDetailItem } from "@/lib/audit/audit-logs";

export default function AuditLogDetailOverlay({
  auditLog,
  closeHref,
  errorMessage,
  isLoading = false,
}: {
  auditLog: AuditLogDetailItem | null;
  closeHref: string;
  errorMessage?: string;
  isLoading?: boolean;
}) {
  return (
    <div className="fixed top-0 left-55 right-0 bottom-0 z-50 bg-black/40 backdrop-blur-sm p-12 flex items-start justify-center">
      <section
        className="relative w-full rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-full bg-light-blue"
        role="dialog"
        aria-modal="true"
        aria-labelledby="audit-details-title"
      >
        <header className="bg-dark-blue p-6 flex items-center justify-between">
          <div className="min-w-0">
            <h3
              id="audit-details-title"
              className="font-bold text-lg text-white"
            >
              MAKLUMAT JEJAK AUDIT
            </h3>
            <p className="font-extralight text-xs text-light-grey">
              REKOD AKTIVITI SISTEM
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="hover:scale-96 active:scale-92 text-white"
            aria-label="Tutup butiran audit"
          >
            <Icon icon="close" size={20} />
          </button>
        </header>

        {isLoading ? (
          <SearchingDetailDataOverlay
            mode="loading"
            loadingMessage="Mendapatkan Butiran Jejak Audit..."
          />
        ) : errorMessage ? (
          <SearchingDetailDataOverlay
            mode="warning"
            title="Maklumat Tidak Dapat Dipaparkan"
            message={errorMessage}
            onRetry={onRetry}
            retryLabel="Cuba Lagi"
          />
        ) : auditLog ? (
          <div className="p-6 bg-light-blue overflow-y-auto">
            <div className="flex flex-col gap-8">
              <section className="flex flex-col gap-4">
                <Topic content="MAKLUMAT AKTIVITI" />
                <div className="grid grid-cols-3 gap-4">
                  <InputField
                    label="TARIKH & MASA"
                    value={auditLog.timestampLabel}
                    state="inactive"
                    className="col-span-1"
                  />
                  <InputField
                    label="MODUL"
                    value={auditLog.module}
                    state="inactive"
                    className="col-span-1"
                  />
                  <InputField
                    label="JENIS TINDAKAN"
                    value={formatEnumLabel(auditLog.actionType)}
                    state="inactive"
                    inactiveBackgroundClass={`bg-transparent ${getAuditActionTextClass(auditLog.actionType)}`}
                    className="col-span-1"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <InputField
                    label="PENGENDALI"
                    value={auditLog.actor}
                    state="inactive"
                    className="col-span-1"
                  />
                  <InputField
                    label="SASARAN DATA"
                    value={auditLog.targetData ?? auditLog.target}
                    state="inactive"
                    className="col-span-1"
                  />
                </div>
              </section>
          <div className="flex min-h-108 items-center justify-center px-5 py-7 sm:px-8 sm:py-8">
            <div className="w-full max-w-md rounded-xl border border-light-grey/20 bg-white p-6 text-center">
              <h4 className="text-lg font-extrabold text-dark-grey">
                Memuatkan butiran...
              </h4>
              <p className="mt-2 text-sm leading-6 text-grey">
                Sila tunggu sebentar sementara rekod audit dibuka.
              </p>
            </div>
          </div>
        ) : auditLog ? (
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

              <section className="flex flex-col gap-4">
                <Topic content="PENERANGAN PERUBAHAN" />
                <InputBox
                  label="CATATAN"
                  value={auditLog.description || "N/A"}
                  state="inactive"
                  className="col-span-2"
                  inputMinHeight={140}
                />
              </section>
            </div>
          </div>
        ) : (
          <div className="p-6 bg-light-blue overflow-y-auto">
            <div className="flex min-h-108 items-center justify-center">
              <div className="w-full max-w-md rounded-xl border border-red/20 bg-white p-6 text-center">
                <h4 className="text-lg font-extrabold text-dark-grey">
                  Rekod tidak ditemui
                </h4>
                <p className="mt-2 text-sm leading-6 text-grey">
                  Rekod audit ini mungkin telah dipadam atau tidak termasuk dalam
                  rekod operasi.
                </p>
              </div>
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
                {errorMessage ??
                  "Rekod audit ini mungkin telah dipadam atau tidak termasuk dalam rekod operasi."}
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function formatEnumLabel(value: string) {
  return value.replace(/_/g, " ");
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
