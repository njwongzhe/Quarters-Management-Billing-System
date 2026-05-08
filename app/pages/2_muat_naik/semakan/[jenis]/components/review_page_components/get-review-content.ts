import type {
  BayaranExtractResult,
  ExtractResult,
  KuartersExtractResult,
  PenghuniExtractResult,
  TunggakanExtractResult,
} from "../../../../components/extract-review-shared";
import { reviewContent } from "./review-content";
import type { ReviewContent, ReviewKind } from "./types";

type GetReviewContentInput = {
  kind: ReviewKind;
  extractResult: ExtractResult | null;
  uploadedFileName: string;
  bayaranEditedTotalAmount: string | null;
};

export function getReviewContent({
  kind,
  extractResult,
  uploadedFileName,
  bayaranEditedTotalAmount,
}: GetReviewContentInput): ReviewContent {
  const baseContent = reviewContent[kind];
  const bayaranExtract = getExtractResult<BayaranExtractResult>(
    extractResult,
    "bayaran",
  );
  const kuartersExtract = getExtractResult<KuartersExtractResult>(
    extractResult,
    "kuarters",
  );
  const penghuniExtract = getExtractResult<PenghuniExtractResult>(
    extractResult,
    "penghuni",
  );
  const tunggakanExtract = getExtractResult<TunggakanExtractResult>(
    extractResult,
    "tunggakan",
  );

  if (kind === "bayaran" && bayaranExtract) {
    return {
      ...baseContent,
      fileName: uploadedFileName || baseContent.fileName,
      stats: baseContent.stats.map((stat) => {
        if (stat.label === "Tarikh Bayaran") {
          return { ...stat, value: bayaranExtract.paymentMonth || "-" };
        }

        if (stat.label === "Jumlah Rekod") {
          return { ...stat, value: String(bayaranExtract.recordCount) };
        }

        if (stat.label === "Jumlah Bayaran (RM)") {
          const totalAmount = bayaranEditedTotalAmount ?? bayaranExtract.totalAmount;

          return {
            ...stat,
            value: `RM ${Number(totalAmount).toLocaleString("ms-MY", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`,
          };
        }

        return stat;
      }),
    };
  }

  if (kind === "kuarters" && kuartersExtract) {
    return {
      ...baseContent,
      fileName: uploadedFileName || baseContent.fileName,
      stats: baseContent.stats.map((stat) => {
        if (stat.label === "Total Kategori") {
          return { ...stat, value: String(kuartersExtract.recordCount) };
        }

        if (stat.label === "Total Unit") {
          return { ...stat, value: String(kuartersExtract.totalUnits) };
        }

        return stat;
      }),
    };
  }

  if (kind === "tunggakan" && tunggakanExtract) {
    return {
      ...baseContent,
      fileName: uploadedFileName || baseContent.fileName,
      stats: baseContent.stats.map((stat) => {
        if (stat.label === "Tarikh Tunggakan") {
          return { ...stat, value: "-" };
        }

        if (stat.label === "Jumlah Rekod") {
          return { ...stat, value: String(tunggakanExtract.recordCount) };
        }

        if (stat.label === "Jumlah Tunggakan (RM)") {
          return {
            ...stat,
            value: `RM ${Number(tunggakanExtract.totalAmount).toLocaleString(
              "ms-MY",
              {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              },
            )}`,
          };
        }

        return stat;
      }),
    };
  }

  if (kind === "penghuni" && penghuniExtract) {
    return {
      ...baseContent,
      fileName: uploadedFileName || baseContent.fileName,
      stats: baseContent.stats.map((stat) =>
        stat.label === "Jumlah Rekod"
          ? { ...stat, value: String(penghuniExtract.recordCount) }
          : stat,
      ),
    };
  }

  return baseContent;
}

function getExtractResult<T extends ExtractResult>(
  extractResult: ExtractResult | null,
  documentType: ExtractResult["documentType"],
) {
  return extractResult?.documentType === documentType ? (extractResult as T) : null;
}
