import type { QuarterUnitOccupancyDetails } from "@/lib/quarter-units";
import { type XlsxCell, type XlsxSheet } from "@/lib/xlsx-export";
import { downloadDataAsXlsx } from "@/app/hooks/download/downloadXlsx";

type QuarterCategoryRateExportRecord = {
  categoryName: string;
  address: string | null;
  rentalPrice: number;
  maintenancePrice: number;
  penaltyPrice: number;
};

type QuarterUnitExportRecord = {
  unitCode: string;
  occupantIcNumber: string | null;
  occupantName: string | null;
  moveInDate: string | null;
  moveOutDate: string | null;
  status: "OCCUPIED" | "VACANT";
};

export function downloadQuarterCategoryRates(
  exportRates: QuarterCategoryRateExportRecord[],
) {
  const headers: XlsxCell[] = [
    { value: "Kategori", style: "header" },
    { value: "Alamat", style: "header" },
    { value: "Sewa (RM)", style: "header", align: "right" },
    { value: "Senggara (RM)", style: "header", align: "right" },
    { value: "Penalti (RM)", style: "header", align: "right" },
  ];

  const rows: XlsxSheet["rows"] = exportRates.map((rate) => [
    rate.categoryName,
    rate.address ?? "N/A",
    { value: rate.rentalPrice, type: "number", align: "right" },
    { value: rate.maintenancePrice, type: "number", align: "right" },
    { value: rate.penaltyPrice, type: "number", align: "right" },
  ]);

  downloadDataAsXlsx({
    filename: "senarai-kategori-kuarters",
    sheets: [
      {
        name: "Senarai Kategori",
        columns: [
          { width: 24 },
          { width: 40 },
          { width: 16 },
          { width: 18 },
          { width: 16 },
        ],
        headers,
        rows,
      },
    ],
  });
}

export function downloadQuarterUnits(
  exportUnits: QuarterUnitExportRecord[],
  categoryName: string,
  address: string | null,
) {
  const headers: XlsxCell[] = [
    { value: "ID Unit", style: "header" },
    { value: "No. Kad Pengenalan Penghuni", style: "header" },
    { value: "Nama Penghuni", style: "header" },
    { value: "Tarikh Masuk", style: "header", align: "center" },
    { value: "Tarikh Keluar", style: "header", align: "center" },
    { value: "Status", style: "header", align: "center" },
  ];

  const rows: XlsxSheet["rows"] = exportUnits.map((unit) => [
    unit.unitCode,
    unit.occupantIcNumber ? formatIcNumber(unit.occupantIcNumber) : "N/A",
    unit.occupantName ?? "N/A",
    { value: formatDisplayDate(unit.moveInDate), align: "center" },
    { value: formatDisplayDate(unit.moveOutDate), align: "center" },
    {
      value: unit.status === "OCCUPIED" ? "Didiami" : "Kosong",
      align: "center",
    },
  ]);

  downloadDataAsXlsx({
    filename: buildUnitsExportFilename(categoryName, address),
    sheets: [
      {
        name: "Senarai Unit",
        columns: [
          { width: 18 },
          { width: 30 },
          { width: 38 },
          { width: 16 },
          { width: 16 },
          { width: 16 },
        ],
        headers,
        rows,
      },
    ],
  });
}

export function downloadQuarterUnitOccupancyHistory(
  unitCode: string,
  records: QuarterUnitOccupancyDetails[],
) {
  const headers: XlsxCell[] = [
    { value: "Tarikh Masuk", style: "header" },
    { value: "Tarikh Keluar", style: "header" },
    { value: "Nama Penghuni", style: "header" },
    { value: "No. Kad Pengenalan", style: "header", align: "center" },
    { value: "Status", style: "header", align: "center" },
  ];

  const rows: XlsxSheet["rows"] = records.map((occupancy) => [
    formatHistoryDate(occupancy.moveInDate),
    formatHistoryDate(occupancy.moveOutDate),
    occupancy.occupantName,
    { value: formatIcNumber(occupancy.occupantIcNumber), align: "center" },
    {
      value: occupancy.status === "CURRENT" ? "Aktif" : "Keluar",
      align: "center",
    },
  ]);

  downloadDataAsXlsx({
    filename: ["sejarah-penghunian", sanitizeFilenamePart(unitCode)]
      .filter(Boolean)
      .join("-"),
    sheets: [
      {
        name: "Sejarah Penghunian",
        columns: [
          { width: 16 },
          { width: 16 },
          { width: 34 },
          { width: 24 },
          { width: 14 },
        ],
        headers,
        rows,
      },
    ],
  });
}

function formatHistoryDate(value: string | null) {
  if (!value) {
    return "N/A";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "N/A";
  }

  return new Intl.DateTimeFormat("ms-MY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
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

function formatIcNumber(value: string) {
  const digits = value.replace(/\D/g, "");

  if (digits.length !== 12) {
    return value;
  }

  return `${digits.slice(0, 6)}-${digits.slice(6, 8)}-${digits.slice(8)}`;
}

function buildUnitsExportFilename(categoryName: string, address: string | null) {
  return [
    "senarai-unit-kuarters",
    sanitizeFilenamePart(categoryName),
    sanitizeFilenamePart(address ?? "tiada-alamat"),
  ]
    .filter(Boolean)
    .join("-");
}

function sanitizeFilenamePart(value: string) {
  return value
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}