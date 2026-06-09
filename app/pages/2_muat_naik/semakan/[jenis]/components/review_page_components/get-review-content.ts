import type {
  BayaranExtractResult,
  ExtractResult,
  KuartersExtractResult,
  PenghuniExtractResult,
  TunggakanExtractResult,
} from "../../../../components/extract-review-shared";
import type { ReviewContent, ReviewContentTemplate, ReviewKind } from "./types";

const reviewContent: Record<ReviewKind, ReviewContentTemplate> = {
  bayaran: {
    stats: [
      {
        label: "TARIKH BAYARAN",
        helper: "Data Bulanan",
        icon: "calendar_month",
        tone: "blue",
      },
      {
        label: "JUMLAH REKOD",
        helper: "Perlu Disemak",
        icon: "fact_check",
        tone: "green",
      },
      {
        label: "JUMLAH BAYARAN (RM)",
        helper: "Telah Dikumpul",
        icon: "payments",
        tone: "green",
      },
    ],
  },
  tunggakan: {
    stats: [
      {
        label: "TARIKH TUNGGAKAN",
        helper: "Data Bulanan",
        icon: "calendar_month",
        tone: "blue",
      },
      {
        label: "JUMLAH REKOD",
        helper: "Perlu Disemak",
        icon: "fact_check",
        tone: "green",
      },
      {
        label: "JUMLAH TUNGGAKAN (RM)",
        helper: "Telah Tertunggak",
        icon: "payments",
        tone: "green",
      },
    ],
  },
  penghuni: {
    stats: [
      {
        label: "JUMLAH REKOD",
        helper: "Perlu Disemak",
        icon: "fact_check",
        tone: "green",
      },
    ],
  },
  kuarters: {
    stats: [
      {
        label: "TOTAL KATEGORI",
        helper: "Kategori Aktif",
        icon: "category",
        tone: "green",
      },
      {
        label: "TOTAL UNIT",
        helper: "Unit Berdaftar",
        icon: "apartment",
        tone: "green",
      },
    ],
  },
};

type GetReviewContentInput = {
  kind: ReviewKind;
  extractResult: ExtractResult | null;
  uploadedFileName: string;
  bayaranEditedTotalAmount: string | null;
  filteredStats?: {
    recordCount?: number;
    totalAmount?: string;
    totalUnits?: number;
    categoryCount?: number;
  } | null;
};

export function getReviewContent({
  kind,
  extractResult,
  uploadedFileName,
  bayaranEditedTotalAmount,
  filteredStats,
}: GetReviewContentInput): ReviewContent {
  const baseContent = reviewContent[kind];
  const fileName = uploadedFileName || "Dokumen semakan";
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
      fileName,
      stats: baseContent.stats.map((stat) => {
        const labelUpper = stat.label.toUpperCase();
        if (labelUpper === "TARIKH BAYARAN") {
          return { ...stat, value: formatReviewDate(bayaranExtract.paymentMonth) };
        }

        if (labelUpper === "JUMLAH REKOD") {
          const recordCount = filteredStats?.recordCount !== undefined
            ? filteredStats.recordCount
            : bayaranExtract.recordCount;
          return { ...stat, value: String(recordCount) };
        }

        if (labelUpper === "JUMLAH BAYARAN (RM)") {
          const totalAmount = filteredStats?.totalAmount !== undefined
            ? filteredStats.totalAmount
            : (bayaranEditedTotalAmount ?? bayaranExtract.totalAmount);

          return {
            ...stat,
            value: `RM ${Number(totalAmount).toLocaleString("ms-MY", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`,
          };
        }

        return { ...stat, value: "-" };
      }),
    };
  }

  if (kind === "kuarters" && kuartersExtract) {
    return {
      fileName,
      stats: baseContent.stats.map((stat) => {
        const labelUpper = stat.label.toUpperCase();
        if (labelUpper === "TOTAL KATEGORI") {
          const categoryCount = filteredStats?.categoryCount !== undefined
            ? filteredStats.categoryCount
            : kuartersExtract.recordCount;
          return { ...stat, value: String(categoryCount) };
        }

        if (labelUpper === "TOTAL UNIT") {
          const totalUnits = filteredStats?.totalUnits !== undefined
            ? filteredStats.totalUnits
            : kuartersExtract.totalUnits;
          return { ...stat, value: String(totalUnits) };
        }

        return { ...stat, value: "-" };
      }),
    };
  }

  if (kind === "tunggakan" && tunggakanExtract) {
    const tunggakanTotalAmount = tunggakanExtract.records
      .filter((record) => record.importStatus !== "IGNORED")
      .reduce(
        (total, record) => total + parseSignedAmount(record.jumlahTunggakan),
        0,
      );

    return {
      fileName,
      stats: baseContent.stats.map((stat) => {
        const labelUpper = stat.label.toUpperCase();
        if (labelUpper === "TARIKH TUNGGAKAN") {
          return {
            ...stat,
            value: formatReviewDate(tunggakanExtract.lastUpdatedMonth),
          };
        }

        if (labelUpper === "JUMLAH REKOD") {
          const recordCount = filteredStats?.recordCount !== undefined
            ? filteredStats.recordCount
            : tunggakanExtract.recordCount;
          return { ...stat, value: String(recordCount) };
        }

        if (labelUpper === "JUMLAH TUNGGAKAN (RM)") {
          const totalAmount = filteredStats?.totalAmount !== undefined
            ? Number(filteredStats.totalAmount)
            : tunggakanTotalAmount;
          return {
            ...stat,
            value: `RM ${totalAmount.toLocaleString(
              "ms-MY",
              {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              },
            )}`,
          };
        }

        return { ...stat, value: "-" };
      }),
    };
  }

  if (kind === "penghuni" && penghuniExtract) {
    return {
      fileName,
      stats: baseContent.stats.map((stat) => {
        if (stat.label.toUpperCase() === "JUMLAH REKOD") {
          const recordCount = filteredStats?.recordCount !== undefined
            ? filteredStats.recordCount
            : penghuniExtract.recordCount;
          return { ...stat, value: String(recordCount) };
        }
        return { ...stat, value: "-" };
      }),
    };
  }

  return {
    fileName,
    stats: baseContent.stats.map((stat) => ({ ...stat, value: "-" })),
  };
}

function formatReviewDate(value: string | undefined) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ms-MY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function getExtractResult<T extends ExtractResult>(
  extractResult: ExtractResult | null,
  documentType: ExtractResult["documentType"],
) {
  return extractResult?.documentType === documentType ? (extractResult as T) : null;
}

/**
 * Parses a signed monetary string (supports RM prefix, negative signs, and
 * parenthesized negatives) into a numeric value.
 *
 * NOTE: This utility is also duplicated in ExtractReviewPage.tsx and
 * TunggakanReviewTable.tsx. Consider extracting to a shared util if more
 * sharing is needed in the future.
 */
function parseSignedAmount(value: string) {
  const normalizedValue = String(value ?? "").trim();

  if (!normalizedValue) {
    return 0;
  }

  const normalizedSign = normalizedValue.replace(/[−–—]/g, "-");
  const isParenthesizedNegative = /^\(.*\)$/.test(normalizedSign);
  const hasNegativeSign = normalizedSign.includes("-");
  const numericValue = Number(
    normalizedSign
      .replace(/RM/gi, "")
      .replace(/,/g, "")
      .replace(/\s+/g, "")
      .replace(/[()]/g, "")
      .replace(/-/g, ""),
  );

  if (!Number.isFinite(numericValue)) {
    return 0;
  }

  return (isParenthesizedNegative || hasNegativeSign) && numericValue > 0
    ? numericValue * -1
    : numericValue;
}
