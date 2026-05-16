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
        label: "Tarikh Bayaran",
        helper: "Data Bulanan",
        icon: "calendar_month",
        tone: "blue",
      },
      {
        label: "Jumlah Rekod",
        helper: "Perlu Disemak",
        icon: "fact_check",
        tone: "green",
      },
      {
        label: "Jumlah Bayaran (RM)",
        helper: "Telah Dikumpul",
        icon: "payments",
        tone: "green",
      },
    ],
  },
  tunggakan: {
    stats: [
      {
        label: "Tarikh Tunggakan",
        helper: "Data Bulanan",
        icon: "calendar_month",
        tone: "blue",
      },
      {
        label: "Jumlah Rekod",
        helper: "Perlu Disemak",
        icon: "fact_check",
        tone: "green",
      },
      {
        label: "Jumlah Tunggakan (RM)",
        helper: "Telah Tertunggak",
        icon: "payments",
        tone: "green",
      },
    ],
  },
  penghuni: {
    stats: [
      {
        label: "Jumlah Rekod",
        helper: "Perlu Disemak",
        icon: "fact_check",
        tone: "green",
      },
    ],
  },
  kuarters: {
    stats: [
      {
        label: "Total Kategori",
        helper: "Kategori Aktif",
        icon: "category",
        tone: "blue",
      },
      {
        label: "Total Unit",
        helper: "Unit Berdaftar",
        icon: "apartment",
        tone: "blue",
      },
    ],
  },
};

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

        return { ...stat, value: "-" };
      }),
    };
  }

  if (kind === "kuarters" && kuartersExtract) {
    return {
      fileName,
      stats: baseContent.stats.map((stat) => {
        if (stat.label === "Total Kategori") {
          return { ...stat, value: String(kuartersExtract.recordCount) };
        }

        if (stat.label === "Total Unit") {
          return { ...stat, value: String(kuartersExtract.totalUnits) };
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
        if (stat.label === "Tarikh Tunggakan") {
          return {
            ...stat,
            value: formatReviewDate(tunggakanExtract.lastUpdatedMonth),
          };
        }

        if (stat.label === "Jumlah Rekod") {
          return { ...stat, value: String(tunggakanExtract.recordCount) };
        }

        if (stat.label === "Jumlah Tunggakan (RM)") {
          return {
            ...stat,
            value: `RM ${tunggakanTotalAmount.toLocaleString(
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
      stats: baseContent.stats.map((stat) =>
        stat.label === "Jumlah Rekod"
          ? { ...stat, value: String(penghuniExtract.recordCount) }
          : { ...stat, value: "-" },
      ),
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
