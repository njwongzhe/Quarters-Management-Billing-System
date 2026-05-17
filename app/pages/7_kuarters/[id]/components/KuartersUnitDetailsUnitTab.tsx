"use client";

import { formatMoney } from "@/app/pages/7_kuarters/components/kuartersHelpers";
import Icon, { commonIcons } from "@/app/components/Icon/Icon";
import { InputField, Topic } from "@/app/components/InputField";

import type { QuarterUnitDetails } from "@/lib/quarter-units";

type KuartersUnitDetailsUnitTabProps = {
  unitDetails: QuarterUnitDetails;
  onAssignOccupant: () => void;
};

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
    <div className="max-h-[calc(100vh-10rem)] overflow-auto">
      <div className="flex flex-col gap-8">
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <Topic content="MAKLUMAT PENGHUNI" />
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

          <div className="grid items-start gap-4 md:grid-cols-8">
            <InputField
              label="NAMA PENGHUNI"
              value={currentOccupancy?.occupantName ?? "N/A"}
              state="inactive"
              inactiveBackgroundClass="bg-[#EEF4FF]"
              className="md:col-span-4"
            />
            <InputField
              label="NO. K/P"
              value={
                currentOccupancy?.occupantIcNumber
                  ? formatIcNumber(currentOccupancy.occupantIcNumber)
                  : "N/A"
              }
              state="inactive"
              inactiveBackgroundClass="bg-[#EEF4FF]"
              className="md:col-span-2"
            />
            <InputField
              label="UMUR"
              value={
                currentOccupancy?.occupantAge === null ||
                currentOccupancy?.occupantAge === undefined
                  ? "N/A"
                  : String(currentOccupancy.occupantAge)
              }
              state="inactive"
              inactiveBackgroundClass="bg-[#EEF4FF]"
              className="md:col-span-2"
            />
          </div>

          <div className="grid items-start gap-4 md:grid-cols-8">
            <InputField
              label="TARIKH MASUK"
              value={formatDisplayDate(currentOccupancy?.moveInDate ?? null)}
              state="inactive"
              inactiveBackgroundClass="bg-[#EEF4FF]"
              className="md:col-span-2"
            />
            <InputField
              label="TARIKH KELUAR"
              value={formatDisplayDate(currentOccupancy?.moveOutDate ?? null)}
              state="inactive"
              inactiveBackgroundClass="bg-[#EEF4FF]"
              className="md:col-span-2"
            />
            <InputField
              label="STATUS"
              value={statusLabel}
              state="inactive"
              inactiveBackgroundClass="bg-[#EEF4FF]"
              className="md:col-span-4"
            />
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <Topic content="MAKLUMAT UNIT" />
            <span
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[10px] font-extrabold before:h-1.5 before:w-1.5 before:rounded-full ${occupancyClass}`}
            >
              {occupancyLabel}
            </span>
          </div>

          <div className="grid items-start gap-4 md:grid-cols-12">
            <InputField
              label="KATEGORI"
              value={categoryName}
              state="inactive"
              inactiveBackgroundClass="bg-[#EEF4FF]"
              className="md:col-span-4"
            />
            <InputField
              label="ALAMAT"
              value={address}
              state="inactive"
              inactiveBackgroundClass="bg-[#EEF4FF]"
              className="md:col-span-6"
            />
            <InputField
              label="ID UNIT"
              value={unitDetails.unitCode}
              state="inactive"
              inactiveBackgroundClass="bg-[#EEF4FF]"
              className="md:col-span-2"
            />
          </div>

          <div className="grid items-start gap-4 md:grid-cols-12">
            <InputField
              label="SEWA (RM)"
              value={formatRate(unitDetails.category.rates.rentalPrice)}
              state="inactive"
              inactiveBackgroundClass="bg-[#EEF4FF]"
              className="md:col-span-4"
            />
            <InputField
              label="SENGGARA (RM)"
              value={formatRate(unitDetails.category.rates.maintenancePrice)}
              state="inactive"
              inactiveBackgroundClass="bg-[#EEF4FF]"
              className="md:col-span-4"
            />
            <InputField
              label="PENALTI (RM)"
              value={formatRate(unitDetails.category.rates.penaltyPrice)}
              state="inactive"
              inactiveBackgroundClass="bg-[#EEF4FF]"
              className="md:col-span-4"
            />
          </div>
        </section>
      </div>
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
