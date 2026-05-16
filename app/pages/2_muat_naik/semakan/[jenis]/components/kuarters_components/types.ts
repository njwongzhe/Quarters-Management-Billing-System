import type { ExtractedQuarterRecord } from "../../../../components/extract-review-shared";

export type KuartersPriceField =
  | "categoryName"
  | "address"
  | "rentalPrice"
  | "maintenancePrice"
  | "penaltyPrice";

export type KuartersCategoryDraft = Pick<ExtractedQuarterRecord, KuartersPriceField>;
