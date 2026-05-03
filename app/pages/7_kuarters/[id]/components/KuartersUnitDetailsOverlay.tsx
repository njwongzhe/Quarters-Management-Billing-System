"use client";

import { useEffect, useState } from "react";

import { formatMoney } from "@/app/pages/7_kuarters/components/kuartersHelpers";

import type { QuarterUnitDetails } from "@/lib/quarter-units";

type KuartersUnitDetailsOverlayProps = {
  categoryId: string;
  unitId: string;
  onClose: () => void;
};
type UnitDetailsResponse = {
  success: boolean;
  message: string;
  data?: {
    unit?: QuarterUnitDetails;
  };
};

type ActiveTab = "unit" | "history";

function ModalField({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "muted" | "success" | "strong";
}) {
  const valueClass = {
    default: "text-dark-grey",
    muted: "text-light-grey",
    success: "font-extrabold text-green",
    strong: "font-extrabold text-dark-grey",
  }[tone];

  return (
    <div className="min-w-0">
      <label className="mb-2 ml-1 block text-[10px] font-extrabold uppercase tracking-[0.13em] text-grey">
        {label}
      </label>
      <div
        className={`flex min-h-11 items-center overflow-hidden rounded-lg border border-[#DCE3F2] bg-[#EEF4FF] px-4 text-sm ${valueClass}`}
        title={value}
      >
        <span className="truncate">{value}</span>
      </div>
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

function TabButton({
  isActive,
  children,
  onClick,
}: {
  isActive: boolean;
  children: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`min-h-13 min-w-40 border-b-2 px-7 text-xs font-extrabold uppercase tracking-[0.14em] transition-colors ${
        isActive
          ? "border-dark-blue text-dark-blue"
          : "border-transparent text-grey hover:text-dark-blue"
      }`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export default function KuartersUnitDetailsOverlay({
  categoryId,
  unitId,
  onClose,
}: KuartersUnitDetailsOverlayProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>("unit");
  const [unitDetails, setUnitDetails] = useState<QuarterUnitDetails | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [reloadToken, setReloadToken] = useState(0);
  const currentOccupancy = unitDetails?.currentOccupancy ?? null;
  const occupantIcNumber = currentOccupancy?.occupantIcNumber ?? "N/A";
  const occupantName = currentOccupancy?.occupantName ?? "N/A";
  const isOccupied = unitDetails?.status === "OCCUPIED";
  const statusLabel = isOccupied ? "AKTIF" : "KOSONG";
  const occupancyLabel = isOccupied ? "Berpenghuni" : "Kosong";
  const occupancyClass = isOccupied
    ? "bg-[#D4F0DB] text-[#157437] before:bg-[#157437]"
    : "bg-pencen-datang/10 text-pencen-datang before:bg-pencen-datang";
  const resolvedCategoryName =
    unitDetails?.category.categoryName.trim() || "Maklumat kategori kuarters";
  const resolvedAddress = unitDetails?.category.address?.trim() || "N/A";
  const rates = unitDetails?.category.rates ?? {
    rentalPrice: null,
    maintenancePrice: null,
    penaltyPrice: null,
  };

  function formatRate(value: number | null) {
    return value === null ? "N/A" : formatMoney(value);
  }

  useEffect(() => {
    function handleEscapeKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleEscapeKey);

    return () => {
      document.removeEventListener("keydown", handleEscapeKey);
    };
  }, [onClose]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadUnitDetails() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const response = await fetch(
          `/api/quarter-categories/${categoryId}/units/${unitId}`,
          {
            signal: controller.signal,
          },
        );
        const payload = (await response.json().catch(() => null)) as
          | UnitDetailsResponse
          | null;

        if (!response.ok || !payload?.success || !payload.data?.unit) {
          throw new Error(
            payload?.message ?? "Gagal mendapatkan maklumat unit kuarters.",
          );
        }

        setUnitDetails(payload.data.unit);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        setUnitDetails(null);
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Gagal mendapatkan maklumat unit kuarters.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void loadUnitDetails();

    return () => {
      controller.abort();
    };
  }, [categoryId, unitId, reloadToken]);

  return (
    <div
      className="fixed bottom-0 left-55 right-0 top-0 z-50 flex items-center justify-center bg-black/70 p-6"
      onClick={onClose}
    >
      <section
        className="max-h-[calc(100vh-4rem)] w-full max-w-4xl overflow-hidden rounded-2xl bg-light-blue shadow-[0_18px_45px_rgba(0,0,0,0.35)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="unit-details-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex min-h-23 items-center justify-between gap-4 bg-dark-blue px-6 text-white sm:px-8">
          <div className="min-w-0 space-y-1">
            <h3
              id="unit-details-title"
              className="truncate text-[21px] font-extrabold uppercase tracking-[-0.02em]"
            >
              Maklumat Penghunian Unit
            </h3>
            <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-white/70">
              Rekod Penghunian Unit
            </p>
          </div>
          <button
            type="button"
            className="inline-flex text-[34px] leading-none text-white transition hover:scale-95 hover:opacity-80"
            aria-label="Tutup maklumat unit"
            onClick={onClose}
          >
            &times;
          </button>
        </header>

        <nav
          className="flex min-h-13 items-stretch justify-center overflow-x-auto border-b border-[#C6C5D2]/25 bg-white"
          aria-label="Unit occupancy tabs"
        >
          <TabButton
            isActive={activeTab === "unit"}
            onClick={() => setActiveTab("unit")}
          >
            Maklumat Unit
          </TabButton>
          <TabButton
            isActive={activeTab === "history"}
            onClick={() => setActiveTab("history")}
          >
            Sejarah Penghunian
          </TabButton>
        </nav>

        {isLoading ? (
          <div className="flex min-h-108 items-center justify-center px-5 py-7 sm:px-8 sm:py-8">
            <div className="text-center">
              <div
                className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-dark-blue/20 border-t-dark-blue"
                aria-hidden="true"
              />
              <p className="mt-4 text-sm font-semibold text-grey">
                Mendapatkan maklumat unit kuarters...
              </p>
            </div>
          </div>
        ) : errorMessage ? (
          <div className="flex min-h-108 items-center justify-center px-5 py-7 sm:px-8 sm:py-8">
            <div className="w-full max-w-md rounded-xl border border-red/20 bg-white p-6 text-center">
              <h4 className="text-lg font-extrabold text-dark-grey">
                Maklumat Tidak Dapat Dipaparkan
              </h4>
              <p className="mt-2 text-sm leading-6 text-grey">{errorMessage}</p>
              <button
                type="button"
                className="mt-5 inline-flex min-h-10 items-center rounded-xl bg-dark-blue px-4 py-2 text-sm font-extrabold text-white transition-opacity hover:opacity-90"
                onClick={() => setReloadToken((currentValue) => currentValue + 1)}
              >
                Cuba Lagi
              </button>
            </div>
          </div>
        ) : activeTab === "unit" ? (
          <div className="max-h-[calc(100vh-12rem)] overflow-auto px-5 py-7 sm:px-8 sm:py-8">
            <section className="mb-9">
              <div className="mb-6 flex items-center justify-between gap-4">
                <SectionTitle>Maklumat Penghuni</SectionTitle>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-widest text-dark-blue transition hover:underline"
                >
                  Profil Penuh
                  <span className="text-xl leading-none">&rsaquo;</span>
                </button>
              </div>

              <div className="grid gap-x-6 gap-y-6 md:grid-cols-[2fr_1.3fr_0.6fr]">
                <ModalField label="Nama Penghuni" value={occupantName} />
                <ModalField
                  label="No. Kad Pengenalan"
                  value={occupantIcNumber}
                />
                <ModalField
                  label="Umur"
                  value={
                    currentOccupancy?.occupantAge === null ||
                    currentOccupancy?.occupantAge === undefined
                      ? "N/A"
                      : String(currentOccupancy.occupantAge)
                  }
                  tone={
                    currentOccupancy?.occupantAge === null ||
                    currentOccupancy?.occupantAge === undefined
                      ? "muted"
                      : "default"
                  }
                />
              </div>

              <div className="mt-6 grid gap-x-6 gap-y-6 md:grid-cols-[1fr_1fr_2.12fr]">
                <ModalField
                  label="Tarikh Masuk"
                  value={formatDisplayDate(currentOccupancy?.moveInDate ?? null)}
                  tone={currentOccupancy?.moveInDate ? "default" : "muted"}
                />
                <ModalField
                  label="Tarikh Keluar"
                  value={formatDisplayDate(currentOccupancy?.moveOutDate ?? null)}
                  tone={currentOccupancy?.moveOutDate ? "default" : "muted"}
                />
                <ModalField
                  label="Status"
                  value={statusLabel}
                  tone={isOccupied ? "success" : "muted"}
                />
              </div>
            </section>

            <section>
              <div className="mb-6 flex items-center justify-between gap-4">
                <SectionTitle>Maklumat Unit</SectionTitle>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[10px] font-extrabold before:h-1.5 before:w-1.5 before:rounded-full ${occupancyClass}`}
                >
                  {occupancyLabel}
                </span>
              </div>

              <div className="grid gap-x-6 gap-y-6 md:grid-cols-2">
                <ModalField label="Kategori" value={resolvedCategoryName} />
                <ModalField label="ID Unit" value={unitDetails?.unitCode ?? "N/A"} />
              </div>

              <div className="mt-6 grid gap-x-6 gap-y-6 md:grid-cols-3">
                <ModalField
                  label="Sewa (RM)"
                  value={formatRate(rates.rentalPrice)}
                  tone="strong"
                />
                <ModalField
                  label="Senggara (RM)"
                  value={formatRate(rates.maintenancePrice)}
                  tone="strong"
                />
                <ModalField
                  label="Penalti (RM)"
                  value={formatRate(rates.penaltyPrice)}
                  tone="strong"
                />
              </div>

              <div className="mt-6">
                <ModalField label="Alamat" value={resolvedAddress} />
              </div>
            </section>
          </div>
        ) : (
          <div className="max-h-[calc(100vh-12rem)] overflow-auto px-5 py-7 sm:px-8 sm:py-8">
            <section className="min-h-108 rounded-xl border border-[#DCE3F2] bg-white/45 p-7">
              <SectionTitle>Sejarah Penghunian</SectionTitle>

              {unitDetails?.occupancyHistory.length === 0 ? (
                <p className="mt-6 rounded-xl border border-[#DCE3F2] bg-white px-5 py-6 text-center text-sm font-semibold text-grey">
                  Tiada rekod penghunian untuk unit ini.
                </p>
              ) : (
                <div className="mt-6 space-y-3">
                  {unitDetails?.occupancyHistory.map((occupancy) => (
                    <article
                      key={occupancy.id}
                      className="grid gap-4 rounded-xl border border-[#DCE3F2] bg-white px-5 py-4 md:grid-cols-[1.4fr_1fr_0.8fr_0.8fr]"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-extrabold text-dark-grey">
                          {occupancy.occupantName}
                        </p>
                        <p className="mt-1 truncate text-xs font-semibold text-grey">
                          {occupancy.occupantIcNumber}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-grey">
                          Tarikh Masuk
                        </p>
                        <p className="mt-1 text-sm font-semibold text-dark-grey">
                          {formatDisplayDate(occupancy.moveInDate)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-grey">
                          Tarikh Keluar
                        </p>
                        <p className="mt-1 text-sm font-semibold text-dark-grey">
                          {formatDisplayDate(occupancy.moveOutDate)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-grey">
                          Status
                        </p>
                        <span
                          className={`mt-1 inline-flex rounded-full px-3 py-1 text-xs font-extrabold ${
                            occupancy.status === "CURRENT"
                              ? "bg-[#D4F0DB] text-[#157437]"
                              : "bg-background text-grey"
                          }`}
                        >
                          {occupancy.status === "CURRENT" ? "AKTIF" : "TAMAT"}
                        </span>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </section>
    </div>
  );
}

function formatDisplayDate(value: string | null) {
  if (!value) {
    return "N/A";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "N/A";
  }

  return new Intl.DateTimeFormat("ms-MY", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}
