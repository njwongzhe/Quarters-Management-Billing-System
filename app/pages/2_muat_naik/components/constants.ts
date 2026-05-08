import type { ProcessingDraft } from "./extract-review-shared";
import type { Category } from "./types";

export const categories: Category[] = [
  "Bayaran",
  "Tunggakan",
  "Penghuni",
  "Kuarters",
];

export const reviewRoutes: Record<Category, string> = {
  Bayaran: "bayaran",
  Tunggakan: "tunggakan",
  Penghuni: "penghuni",
  Kuarters: "kuarters",
};

export const draftKindByCategory: Partial<
  Record<Category, ProcessingDraft["kind"]>
> = {
  Bayaran: "bayaran",
  Tunggakan: "tunggakan",
  Penghuni: "penghuni",
  Kuarters: "kuarters",
};

export const categoryByDraftKind: Record<ProcessingDraft["kind"], Category> = {
  bayaran: "Bayaran",
  tunggakan: "Tunggakan",
  penghuni: "Penghuni",
  kuarters: "Kuarters",
};
