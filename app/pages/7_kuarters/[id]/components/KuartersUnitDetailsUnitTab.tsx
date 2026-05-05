"use client";

import { formatMoney } from "@/app/pages/7_kuarters/components/kuartersHelpers";
import Icon, { commonIcons } from "@/app/components/Icon";

import type { QuarterUnitDetails } from "@/lib/quarter-units";

type KuartersUnitDetailsUnitTabProps = {
  unitDetails: QuarterUnitDetails;
  onAssignOccupant: () => void;
};

function ModalField({
  label,
  value,
  tone = "default",
  className = "",
}: {
  label: string;
  value: string;
  tone?: "default" | "muted" | "success" | "strong";
  className?: string;
}) {
  const valueClass = {
    default: "text-dark-grey",
    muted: "text-light-grey",
    success: "font-extrabold text-green",
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

function SectionTitle({ children }: { children: string }) {
  return (
    <h4 className="flex items-center gap-2 text-[13px] font-extrabold uppercase tracking-[0.2em] text-dark-blue">
      <span className="h-4 w-1 rounded-sm bg-dark-blue" aria-hidden="true" />
      {children}
    </h4>
  );
}

export default function KuartersUnitDetailsUnitTab({
  unitDetails,
  onAssignOccupant,
}: KuartersUnitDetailsUnitTabProps) {
  const currentOccupancy = unitDetails.currentOccupancy;
  const isOccupied = unitDetails.status === "OCCUPIED";
  const statusLabel = currentOccupancy
    ? formatResidentStatus(currentOccupancy.occupantStatus)
    : "N/A";
  const occupancyLabel = isOccupied ? "Berpenghuni" : "Kosong";
  const occupancyClass = isOccupied
    ? "bg-[#D4F0DB] text-[#157437] before:bg-[#157437]"
    : "bg-pencen-datang/10 text-pencen-datang before:bg-pencen-datang";
  const categoryName =
    unitDetails.category.categoryName.trim() || "Maklumat kategori kuarters";
  const address = unitDetails.category.address?.trim() || "N/A";

  function formatRate(value: number | null) {
    return value === null ? "N/A" : formatMoney(value);
  }

  return (
    <div className="max-h-[calc(100vh-10rem)] overflow-auto px-5 py-7 sm:px-8 sm:py-8">
      <section className="mb-9">
        <div className="mb-6 flex items-center justify-between gap-4">
          <SectionTitle>Maklumat Penghuni</SectionTitle>
          <button
            type="button"
            className={`inline-flex min-h-10 items-center gap-1 rounded-xl px-4 py-2 text-[11px] font-extrabold uppercase tracking-widest transition ${
              currentOccupancy
                ? "text-dark-blue hover:underline"
                : "bg-dark-blue text-white hover:opacity-90"
            }`}
            onClick={currentOccupancy ? undefined : onAssignOccupant}
          >
            {currentOccupancy ? "Profil Penuh" : "Tetapkan Penghuni"}
            {currentOccupancy ? (
              <Icon icon={commonIcons.chevronRight} size={16} />
            ) : null}
          </button>
        </div>

        <div className="grid items-start gap-x-5 gap-y-6 md:grid-cols-8">
          <ModalField
            label="Nama Penghuni"
            value={currentOccupancy?.occupantName ?? "N/A"}
            tone={currentOccupancy ? "default" : "muted"}
            className="md:col-span-4"
          />
          <ModalField
            label="No. Kad Pengenalan"
            value={
              currentOccupancy?.occupantIcNumber
                ? formatIcNumber(currentOccupancy.occupantIcNumber)
                : "N/A"
            }
            tone={currentOccupancy ? "default" : "muted"}
            className="md:col-span-2"
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
            className="md:col-span-2"
          />
        </div>

        <div className="mt-6 grid items-start gap-x-5 gap-y-6 md:grid-cols-8">
          <ModalField
            label="Tarikh Masuk"
            value={formatDisplayDate(currentOccupancy?.moveInDate ?? null)}
            tone={currentOccupancy?.moveInDate ? "default" : "muted"}
            className="md:col-span-2"
          />
          <ModalField
            label="Tarikh Keluar"
            value={formatDisplayDate(currentOccupancy?.moveOutDate ?? null)}
            tone={currentOccupancy?.moveOutDate ? "default" : "muted"}
            className="md:col-span-2"
          />
          <ModalField
            label="Status"
            value={statusLabel}
            tone={
              currentOccupancy?.occupantStatus === "AKTIF"
                ? "success"
                : currentOccupancy
                  ? "default"
                  : "muted"
            }
            className="md:col-span-4"
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

        <div className="grid items-start gap-x-5 gap-y-6 md:grid-cols-12">
          <ModalField
            label="Kategori"
            value={categoryName}
            className="md:col-span-4"
          />
          <ModalField
            label="Alamat"
            value={address}
            className="md:col-span-6"
          />
          <ModalField
            label="ID Unit"
            value={unitDetails.unitCode}
            className="md:col-span-2"
          />
        </div>

        <div className="mb-6 mt-6 grid items-start gap-x-5 gap-y-6 md:grid-cols-12">
          <ModalField
            label="Sewa (RM)"
            value={formatRate(unitDetails.category.rates.rentalPrice)}
            tone="strong"
            className="md:col-span-4"
          />
          <ModalField
            label="Senggara (RM)"
            value={formatRate(unitDetails.category.rates.maintenancePrice)}
            tone="strong"
            className="md:col-span-4"
          />
          <ModalField
            label="Penalti (RM)"
            value={formatRate(unitDetails.category.rates.penaltyPrice)}
            tone="strong"
            className="md:col-span-4"
          />
        </div>
      </section>
    </div>
  );
}

function formatResidentStatus(value: string) {
  return value.replace(/_/g, " ");
}

function formatIcNumber(value: string) {
  const digits = value.replace(/\D/g, "");

  if (digits.length !== 12) {
    return value;
  }

  return `${digits.slice(0, 6)}-${digits.slice(6, 8)}-${digits.slice(8)}`;
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
