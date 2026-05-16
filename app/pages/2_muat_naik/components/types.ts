import type { ProcessingDraft } from "./extract-review-shared";

export type Category = "Bayaran" | "Tunggakan" | "Penghuni" | "Kuarters";

export type DraftKind = ProcessingDraft["kind"];

export type ParsingMode = "strict" | "assisted";
