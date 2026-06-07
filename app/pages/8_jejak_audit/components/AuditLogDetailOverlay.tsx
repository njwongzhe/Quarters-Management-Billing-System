"use client";

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
  return (
    badgeClass
      .split(" ")
      .find((className) => className.startsWith("text-")) ?? "text-dark-grey"
  );
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
}) {
  return (
    <div className="fixed top-0 left-55 right-0 bottom-0 z-50 flex items-start justify-center bg-black/40 p-12 backdrop-blur-md">
      <section
        className="relative flex max-h-full w-full flex-col overflow-hidden rounded-lg bg-light-blue shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="audit-details-title"
      >
        <header className="flex items-center justify-between bg-dark-blue p-6">
          <div className="min-w-0">
            <h3 id="audit-details-title" className="text-lg font-bold text-white">
              MAKLUMAT JEJAK AUDIT
            </h3>
            <p className="text-xs font-extralight text-light-grey">
              REKOD AKTIVITI SISTEM
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white hover:scale-96 active:scale-92"
            aria-label="Tutup butiran audit"
          >
            <Icon icon="close" size={20} />
          </button>
        </header>

        {isLoading ? (
          <div className="h-full">
            <SearchingDetailDataOverlay
              mode="loading"
              loadingMessage="Mendapatkan Butiran Jejak Audit..."
            />
          </div>
        ) : errorMessage ? (
          <div className="h-full">
            <SearchingDetailDataOverlay
              mode="warning"
              title="Maklumat Tidak Dapat Dipaparkan"
              message={errorMessage}
              onRetry={onRetry}
              retryLabel="Cuba Lagi"
            />
          </div>
        ) : auditLog ? (
          <div className="overflow-y-auto bg-light-blue p-6">
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
          <div className="flex min-h-108 items-center justify-center bg-light-blue p-6">
            <div className="w-full max-w-md rounded-xl border border-red/20 bg-white p-6 text-center">
              <h4 className="text-lg font-extrabold text-dark-grey">
                Rekod tidak ditemui
              </h4>
              <p className="mt-2 text-sm leading-6 text-grey">
                Rekod audit ini mungkin telah dipadam atau tidak termasuk dalam rekod operasi.
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
