import type { ProcessingDraft } from "./extract-review-shared";
import type { Category } from "./types";

export const categories: Category[] = [
  "Bayaran",
  "Tunggakan",
  "Penghuni",
  "Kuarters",
];

// Maps each Category tab to its corresponding draft/API kind string.
// Used for routing, API calls, and upload logic.
export const reviewRoutes: Record<Category, ProcessingDraft["kind"]> = {
  Bayaran: "bayaran",
  Tunggakan: "tunggakan",
  Penghuni: "penghuni",
  Kuarters: "kuarters",
};

// Reverse mapping: draft kind → Category tab label.
export const categoryByDraftKind: Record<ProcessingDraft["kind"], Category> = {
  bayaran: "Bayaran",
  tunggakan: "Tunggakan",
  penghuni: "Penghuni",
  kuarters: "Kuarters",
};
