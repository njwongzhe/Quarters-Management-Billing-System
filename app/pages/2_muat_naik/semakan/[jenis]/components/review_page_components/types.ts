export type ReviewKind = "bayaran" | "tunggakan" | "penghuni" | "kuarters";

export type StatCard = {
  label: string;
  value: string;
  helper: string;
  icon: string;
  tone: "blue" | "green";
};

export type StatCardTemplate = Omit<StatCard, "value">;

export type ReviewContent = {
  fileName: string;
  stats: StatCard[];
};

export type ReviewContentTemplate = {
  stats: StatCardTemplate[];
};

export type VerifyingMode = "selected";
