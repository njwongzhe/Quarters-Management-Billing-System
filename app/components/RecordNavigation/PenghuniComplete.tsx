"use client";

import { useRouter } from "next/navigation";

import {
  InputField,
  InputFieldActionButton,
  Topic,
} from "@/app/components/InputField";
import { ROUTES } from "@/app/constants/routes";

type PenghuniOccupancy = {
  occupantId: string;
  occupantName: string;
  occupantIcNumber: string;
  occupantAge: number | null;
  moveInDate: string | null;
  moveOutDate: string | null;
  occupantStatus: string;
};

type EmptyButtonProps = {
  label: string;
  onClick: () => void;
  isPrimary?: boolean;
  showChevron?: boolean;
  disabled?: boolean;
};

type ProfileButtonProps = {
  type: "profile";
  residentId?: string | null;
  label?: string;
};

type CustomButtonProps = EmptyButtonProps & {
  type: "custom";
};

type PenghuniCompleteProps = {
  currentOccupancy: PenghuniOccupancy | null;
  actionButton?: ProfileButtonProps | CustomButtonProps;
};

function formatIcNumber(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 12) return value;
  return `${digits.slice(0, 6)}-${digits.slice(6, 8)}-${digits.slice(8)}`;
}

function formatDate(value: string | null): string {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return new Intl.DateTimeFormat("ms-MY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatResidentStatus(value: string): string {
  switch (value.trim().toUpperCase()) {
    case "AKTIF":
      return "Aktif";
    case "TIDAK_LAYAK":
      return "Tidak Layak";
    case "PENCEN_MENDATANG":
      return "Pencen Mendatang";
    case "DATA_TIDAK_LENGKAP":
      return "Data Tidak Lengkap";
    default:
      return value;
  }
}

function getOccupantStatusClass(value: string): string {
  switch (value.trim().toUpperCase()) {
    case "AKTIF":
      return "text-aktif";
    case "TIDAK_LAYAK":
      return "text-x-layak";
    case "PENCEN_MENDATANG":
      return "text-pencen-datang";
    case "DATA_TIDAK_LENGKAP":
      return "text-x-lengkap";
    default:
      return "text-dark-blue";
  }
}

export default function PenghuniComplete({
  currentOccupancy,
  actionButton,
}: PenghuniCompleteProps) {
  const router = useRouter();
  const statusClass = getOccupantStatusClass(
    currentOccupancy?.occupantStatus ?? "",
  );
  const statusLabel = currentOccupancy
    ? formatResidentStatus(currentOccupancy.occupantStatus)
    : "N/A";

  function handleProfileClick(residentId?: string | null) {
    const targetResidentId = residentId?.trim() ?? "";
    if (!targetResidentId) return;
    router.push(
      `${ROUTES.penghuni}?targetId=${encodeURIComponent(targetResidentId)}`,
    );
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Topic content="MAKLUMAT PENGHUNI" />
        {actionButton?.type === "profile" ? (
          <InputFieldActionButton
            label={actionButton.label ?? "Profil Penuh"}
            onClick={() => handleProfileClick(actionButton.residentId)}
            showChevron
            disabled={!(actionButton.residentId?.trim())}
          />
        ) : actionButton?.type === "custom" ? (
          <InputFieldActionButton
            label={actionButton.label}
            onClick={actionButton.onClick}
            isPrimary={actionButton.isPrimary}
            showChevron={actionButton.showChevron}
            disabled={actionButton.disabled}
          />
        ) : null}
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
            currentOccupancy?.occupantAge != null
              ? String(currentOccupancy.occupantAge)
              : "N/A"
          }
          state="inactive"
          inactiveBackgroundClass="bg-[#EEF4FF]"
          className="md:col-span-2"
        />
      </div>

      <div className="grid items-start gap-4 md:grid-cols-4">
        <InputField
          label="TARIKH MASUK"
          value={formatDate(currentOccupancy?.moveInDate ?? null)}
          state="inactive"
          inactiveBackgroundClass="bg-[#EEF4FF]"
          className="md:col-span-1"
        />
        <InputField
          label="TARIKH KELUAR"
          value={formatDate(currentOccupancy?.moveOutDate ?? null)}
          state="inactive"
          inactiveBackgroundClass="bg-[#EEF4FF]"
          className="md:col-span-1"
        />
        <InputField
          label="STATUS"
          value={statusLabel}
          state="inactive"
          inactiveBackgroundClass={`bg-[#EEF4FF] ${statusClass}`}
          className="md:col-span-2"
        />
      </div>
    </section>
  );
}