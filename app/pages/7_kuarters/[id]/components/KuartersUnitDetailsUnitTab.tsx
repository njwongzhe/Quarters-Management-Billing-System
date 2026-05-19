"use client";

import PenghuniComplete from "@/app/components/RecordNavigation/PenghuniComplete";
import { formatMoney } from "@/app/pages/7_kuarters/components/kuartersHelpers";
import { InputField, Topic } from "@/app/components/InputField";

import type { QuarterUnitDetails } from "@/lib/quarters/quarter-units";

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
        <PenghuniComplete
          currentOccupancy={currentOccupancy}
          actionButton={
            currentOccupancy
              ? {
                  type: "profile",
                  residentId: currentOccupancy.occupantId,
                }
              : {
                  type: "custom",
                  label: "Tetapkan Penghuni",
                  onClick: onAssignOccupant,
                  isPrimary: true,
                }
          }
        />

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
