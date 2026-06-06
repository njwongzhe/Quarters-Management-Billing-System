"use client";

import ToolbarIconButton from "@/app/components/ToolbarIconButton";
import { commonIcons } from "@/app/components/Icon/Icon";
import {
  downloadXlsxFile,
  type XlsxCell,
  type XlsxSheet,
} from "@/lib/download/xlsx-export";
import type { ResidentRecord } from "../page";

type PenghuniDownloadProps = {
  residents: ResidentRecord[];
  disabled?: boolean;
};

export default function PenghuniDownload({ residents, disabled = false }: PenghuniDownloadProps) {
  function handleDownloadResidents() {
    const headers: XlsxCell[] = [
      { value: "Nama", style: "header" },
      { value: "No. Kad Pengenalan", style: "header" },
      { value: "No. Telefon", style: "header" },
      { value: "Emel", style: "header" },
      { value: "Jawatan", style: "header" },
      { value: "Jabatan", style: "header" },
      { value: "Status", style: "header", align: "center" },
      { value: "Kuarters", style: "header" },
      { value: "ID Unit", style: "header", align: "center" },
      { value: "Alamat", style: "header" },
    ];
    const rows: XlsxSheet["rows"] = residents.map((resident) => [
        resident.fullName,
        formatIcNumber(resident.icNumber),
        resident.phone ? formatPhoneNumber(resident.phone) : "N/A",
        resident.email ?? "N/A",
        resident.position ?? "N/A",
        resident.department ?? "N/A",
        { value: formatResidentStatus(resident.status), align: "center" },
        resident.quarters?.quarterName ?? "N/A",
        { value: resident.quarters?.unitCode ?? "N/A", align: "center" },
        resident.quarters?.address ?? "N/A",
      ]);

    downloadXlsxFile({
      filename: "senarai-penghuni",
      sheets: [
        {
          name: "Senarai Penghuni",
          columns: [
            { width: 34 },
            { width: 24 },
            { width: 20 },
            { width: 34 },
            { width: 24 },
            { width: 24 },
            { width: 20 },
            { width: 24 },
            { width: 18 },
            { width: 34 },
          ],
          rows: [headers, ...rows],
        },
      ],
    });
  }

  return (
    <ToolbarIconButton
      icon={commonIcons.download}
      label="Muat turun senarai penghuni"
      disabled={disabled}
      onClick={handleDownloadResidents}
    />
  );
}

function formatResidentStatus(status: string) {
  const normalizedStatus = status.trim().toUpperCase();

  const statusLabels: Record<string, string> = {
    AKTIF: "Aktif",
    TIDAK_LAYAK: "Tidak Layak",
    PENCEN_MENDATANG: "Pencen Mendatang",
    DATA_TIDAK_LENGKAP: "Tidak Lengkap",
  };

  return statusLabels[normalizedStatus] ?? status;
}

function formatIcNumber(icNumber: string) {
  const digits = icNumber.replace(/\D/g, "");

  if (digits.length !== 12) {
    return icNumber;
  }

  return `${digits.slice(0, 6)}-${digits.slice(6, 8)}-${digits.slice(8)}`;
}

function formatPhoneNumber(phoneNumber: string) {
  const digits = phoneNumber.replace(/\D/g, "");

  if (digits.length < 10) {
    return phoneNumber;
  }

  return `${digits.slice(0, 3)}-${digits.slice(3)}`;
}
