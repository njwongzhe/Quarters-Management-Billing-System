import type { BayaranStatusFilter } from "./bayaran-types";

export const BAYARAN_ROWS_PER_PAGE = 10;

export const bayaranStatTemplates = [
  {
    label: "Jumlah Rekod",
    helper: "Terkini",
    icon: "fact_check",
    accent: "border-l-dark-blue",
    dot: "bg-dark-blue",
    helperColor: "text-dark-blue",
  },
  {
    label: "Cukup Bayaran",
    helper: "Bayaran Lengkap",
    icon: "check_circle",
    accent: "border-l-cukup",
    dot: "bg-cukup",
    helperColor: "text-cukup",
  },
  {
    label: "Kurang Bayaran",
    helper: "Perlu Semakan",
    icon: "error",
    accent: "border-l-kurang",
    dot: "bg-kurang",
    helperColor: "text-kurang",
  },
  {
    label: "Lebihan Bayaran",
    helper: "Kredit Tersimpan",
    icon: "add_circle",
    accent: "border-l-lebih",
    dot: "bg-lebih",
    helperColor: "text-lebih",
  },
  {
    label: "Data Tidak Lengkap",
    helper: "Tindakan Segera",
    icon: "warning",
    accent: "border-l-x-lengkap",
    dot: "bg-x-lengkap",
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
