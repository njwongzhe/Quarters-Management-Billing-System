export type ReviewKind = "bayaran" | "tunggakan" | "penghuni" | "kuarters";

export type StatCard = {
  label: string;
  value: string;
  helper: string;
  icon: string;
  tone: "blue" | "green";
};

export type ReviewContent = {
  fileName: string;
  stats: StatCard[];
};

export type VerifyingMode = "selected";
