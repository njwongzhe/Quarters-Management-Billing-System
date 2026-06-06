import type { BayaranStatusFilter } from "./bayaran-types";

export const BAYARAN_ROWS_PER_PAGE = 10;

export const bayaranStatTemplates = [
  {
    label: "JUMLAH REKOD",
    helper: "Terkini",
    icon: "fact_check",
    accent: "border-l-dark-blue",
    helperColor: "text-dark-blue",
  },
  {
    label: "CUKUP BAYARAN",
    helper: "Bayaran Lengkap",
    icon: "check_circle",
    accent: "border-l-cukup",
    helperColor: "text-cukup",
  },
  {
    label: "KURANG BAYARAN",
    helper: "Perlu Semakan",
    icon: "error",
    accent: "border-l-kurang",
    helperColor: "text-kurang",
  },
  {
    label: "LEBIHAN BAYARAN",
    helper: "Kredit Tersimpan",
    icon: "add_circle",
    accent: "border-l-lebih",
    helperColor: "text-lebih",
  },
  {
    label: "DATA TIDAK LENGKAP",
    helper: "Tindakan Segera",
    icon: "warning",
    accent: "border-l-x-lengkap",
    helperColor: "text-x-lengkap",
  },
] as const;

export const bayaranStatusFilters: {
  label: string;
  value: BayaranStatusFilter;
  checkedClass: string;
  dotColor: string;
}[] = [
  {
    label: "Cukup Bayaran",
    value: "cukup",
    checkedClass: "peer-checked:bg-cukup",
    dotColor: "bg-cukup",
  },
  {
    label: "Kurang Bayaran",
    value: "kurang",
    checkedClass: "peer-checked:bg-kurang",
    dotColor: "bg-kurang",
  },
  {
    label: "Lebihan Bayaran",
    value: "lebih",
    checkedClass: "peer-checked:bg-lebih",
    dotColor: "bg-lebih",
  },
  {
    label: "Data Tidak Lengkap",
    value: "tidak-lengkap",
    checkedClass: "peer-checked:bg-x-lengkap",
    dotColor: "bg-x-lengkap",
  },
];
