"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import Icon from "../../../components/Icon";
import { ROUTES } from "../../../constants/routes";
import BayaranReviewTable from "./BayaranReviewTable";
import KuartersReviewTable from "./KuartersReviewTable";
import PenghuniReviewTable from "./PenghuniReviewTable";
import TunggakanReviewTable from "./TunggakanReviewTable";
import {
  CURRENT_EXTRACT_DRAFT_ID_STORAGE_KEY,
} from "./extract-review-shared";
import type {
  BayaranExtractResult,
  ExtractedPenghuniRecord,
  ExtractedQuarterRecord,
  ExtractedBayaranRecord,
  ExtractResult,
} from "./extract-review-shared";

export type ReviewKind = "bayaran" | "tunggakan" | "penghuni" | "kuarters";

type StatCard = {
  label: string;
  value: string;
  helper: string;
  icon: string;
  tone: "blue" | "green";
};

const reviewContent: Record<
  ReviewKind,
  {
    fileName: string;
    stats: StatCard[];
    addLabel: string;
  }
> = {
  bayaran: {
    fileName: "Penyata_Gaji_Jan_2024.pdf",
    stats: [
      {
        label: "Tarikh Bayaran",
        value: "Julai 2024",
        helper: "Data Bulanan",
        icon: "calendar_month",
        tone: "blue",
      },
      {
        label: "Jumlah Rekod",
        value: "45",
        helper: "Perlu Disemak",
        icon: "fact_check",
        tone: "green",
      },
      {
        label: "Jumlah Bayaran (RM)",
        value: "RM 15,450.00",
        helper: "Telah Dikumpul",
        icon: "payments",
        tone: "green",
      },
    ],
    addLabel: "Tambah Bayaran",
  },
  tunggakan: {
    fileName: "Penyata_Tunggakan_Jan_2024.pdf",
    stats: [
      {
        label: "Tarikh Tunggakan",
        value: "12 Januari 2024",
        helper: "Data Bulanan",
        icon: "calendar_month",
        tone: "blue",
      },
      {
        label: "Jumlah Rekod",
        value: "45",
        helper: "Perlu Disemak",
        icon: "fact_check",
        tone: "green",
      },
      {
        label: "Jumlah Tunggakan (RM)",
        value: "RM 15,450.00",
        helper: "Telah Tertunggak",
        icon: "payments",
        tone: "green",
      },
    ],
    addLabel: "Tambah Tunggakan",
  },
  penghuni: {
    fileName: "Penyata_Penghuni_Jan_2024.pdf",
    stats: [
      {
        label: "Jumlah Rekod",
        value: "45",
        helper: "Perlu Disemak",
        icon: "fact_check",
        tone: "green",
      },
    ],
    addLabel: "Tambah Penghuni",
  },
  kuarters: {
    fileName: "Penyata_Kuarters_Jan_2024.pdf",
    stats: [
      {
        label: "Jumlah Rekod",
        value: "158",
        helper: "Perlu Disemak",
        icon: "fact_check",
        tone: "green",
      },
      {
        label: "Total Kategori",
        value: "12",
        helper: "Kategori Aktif",
        icon: "category",
        tone: "blue",
      },
      {
        label: "Total Unit",
        value: "146",
        helper: "Unit Berdaftar",
        icon: "apartment",
        tone: "blue",
      },
    ],
    addLabel: "Tambah Kategori",
  },
};

function StatCards({ stats }: { stats: StatCard[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="min-h-29 rounded border border-[#E7EAF2] bg-white px-6 py-5 shadow-sm"
        >
          <p className="text-[10px] font-extrabold uppercase text-[#667085]">
            {stat.label}
          </p>
          <p className="mt-2 text-[30px] font-extrabold leading-none text-[#07162F]">
            {stat.value}
          </p>
          <div
            className={[
              "mt-4 flex items-center gap-1 text-[10px] font-extrabold",
              stat.tone === "green" ? "text-green" : "text-blue-500",
            ].join(" ")}
          >
            <Icon icon={stat.icon} size={12} weight={700} />
            {stat.helper}
          </div>
        </div>
      ))}
    </div>
  );
}

const subscribeToSessionStorage = () => () => {};

function ReviewTable({
  kind,
  bayaranRecords,
  onBayaranTotalAmountChange,
  onBayaranRecordsChange,
  penghuniRecords,
  kuartersRecords,
}: {
  kind: ReviewKind;
  bayaranRecords: ExtractedBayaranRecord[];
  onBayaranTotalAmountChange?: (totalAmount: string) => void;
  onBayaranRecordsChange?: (
    records: ExtractedBayaranRecord[],
    totalAmount: string,
  ) => void;
  penghuniRecords: ExtractedPenghuniRecord[];
  kuartersRecords: ExtractedQuarterRecord[];
}) {
  if (kind === "bayaran") {
    return (
      <BayaranReviewTable
        records={bayaranRecords}
        onTotalAmountChange={onBayaranTotalAmountChange}
        onRecordsChange={onBayaranRecordsChange}
      />
    );
  }

  if (kind === "tunggakan") {
    return <TunggakanReviewTable />;
  }

  if (kind === "penghuni") {
    return <PenghuniReviewTable records={penghuniRecords} />;
  }

  return <KuartersReviewTable records={kuartersRecords} />;
}

export default function ExtractReviewPage({ kind }: { kind: ReviewKind }) {
  const router = useRouter();
  const [bayaranEditedTotalAmount, setBayaranEditedTotalAmount] = useState<
    string | null
  >(null);
  const [verificationMessage, setVerificationMessage] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const storedExtract = useSyncExternalStore(
    subscribeToSessionStorage,
    () =>
      kind === "bayaran" || kind === "penghuni" || kind === "kuarters"
        ? window.sessionStorage.getItem(`${kind}ExtractResult`) ?? ""
        : "",
    () => "",
  );
  const uploadedFileName = useSyncExternalStore(
    subscribeToSessionStorage,
    () =>
      kind === "bayaran" || kind === "penghuni" || kind === "kuarters"
        ? window.sessionStorage.getItem(`${kind}ExtractFileName`) ?? ""
        : "",
    () => "",
  );
  const extractResult = useMemo(() => {
    if (!storedExtract) {
      return null;
    }

    try {
      return JSON.parse(storedExtract) as ExtractResult;
    } catch {
      return null;
    }
  }, [storedExtract]);
  const bayaranExtract =
    extractResult?.documentType === "bayaran" ? extractResult : null;
  const penghuniExtract =
    extractResult?.documentType === "penghuni" ? extractResult : null;
  const kuartersExtract =
    extractResult?.documentType === "kuarters" ? extractResult : null;

  const updateCurrentBayaranDraft = async (
    records: ExtractedBayaranRecord[],
    totalAmount: string,
  ) => {
    if (!bayaranExtract) {
      return;
    }

    const nextExtract: BayaranExtractResult = {
      ...bayaranExtract,
      recordCount: records.length,
      totalAmount,
      records,
    };
    const draftId = window.sessionStorage.getItem(
      CURRENT_EXTRACT_DRAFT_ID_STORAGE_KEY,
    );

    window.sessionStorage.setItem("bayaranExtractResult", JSON.stringify(nextExtract));

    if (!draftId) {
      return;
    }

    await fetch(`/api/uploaded-documents/${draftId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        extractResult: nextExtract,
      }),
    });
  };

  const handleReviewLater = () => {
    router.push(ROUTES.muatNaik);
  };

  const handleVerifyData = async () => {
    const draftId = window.sessionStorage.getItem(
      CURRENT_EXTRACT_DRAFT_ID_STORAGE_KEY,
    );

    if (!draftId) {
      setVerificationMessage("Dokumen semakan tidak ditemui.");
      return;
    }

    setIsVerifying(true);
    setVerificationMessage("");

    try {
      const response = await fetch(`/api/uploaded-documents/${draftId}/verify`, {
        method: "POST",
      });
      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(result?.message ?? "Gagal mengesahkan data.");
      }

      window.sessionStorage.removeItem(CURRENT_EXTRACT_DRAFT_ID_STORAGE_KEY);
      window.sessionStorage.removeItem(`${kind}ExtractResult`);
      window.sessionStorage.removeItem(`${kind}ExtractFileName`);
      router.push(ROUTES.muatNaik);
    } catch (error) {
      setVerificationMessage(
        error instanceof Error ? error.message : "Gagal mengesahkan data.",
      );
    } finally {
      setIsVerifying(false);
    }
  };

  const content = useMemo(() => {
    const baseContent = reviewContent[kind];

    if (kind === "bayaran" && bayaranExtract) {
      return {
        ...baseContent,
        fileName: uploadedFileName || baseContent.fileName,
        stats: baseContent.stats.map((stat) => {
          if (stat.label === "Tarikh Bayaran") {
            return {
              ...stat,
              value: bayaranExtract.paymentMonth || "-",
            };
          }

          if (stat.label === "Jumlah Rekod") {
            return {
              ...stat,
              value: String(bayaranExtract.recordCount),
            };
          }

          if (stat.label === "Jumlah Bayaran (RM)") {
            const totalAmount =
              bayaranEditedTotalAmount ?? bayaranExtract.totalAmount;

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
          if (stat.label === "Jumlah Rekod" || stat.label === "Total Kategori") {
            return {
              ...stat,
              value: String(kuartersExtract.recordCount),
            };
          }

          if (stat.label === "Total Unit") {
            return {
              ...stat,
              value: String(kuartersExtract.totalUnits),
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
            ? {
                ...stat,
                value: String(penghuniExtract.recordCount),
              }
            : stat,
        ),
      };
    }

    return baseContent;
  }, [
    kind,
    bayaranEditedTotalAmount,
    bayaranExtract,
    kuartersExtract,
    penghuniExtract,
    uploadedFileName,
  ]);

  return (
    <section className="min-h-full bg-background">
      <div className="flex w-full flex-col gap-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-4">
            <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded bg-[#FFEAEA] text-red">
              <Icon icon="picture_as_pdf" size={22} filled weight={700} />
            </span>
            <div className="min-w-0">
              <h1 className="truncate text-[26px] font-extrabold leading-tight text-[#07162F]">
                {content.fileName}
              </h1>
              <p className="mt-1 text-sm font-medium text-[#667085]">
                Sila sahkan ketepatan data yang telah diekstrak secara automatik.
              </p>
            </div>
          </div>

          <button
            type="button"
            className="inline-flex h-11 items-center justify-center gap-2 rounded border border-[#E1E5EF] bg-white px-6 text-xs font-extrabold text-[#344054] shadow-sm"
            onClick={handleReviewLater}
          >
            <Icon icon="history" size={16} weight={600} />
            Semak Nanti
          </button>
        </div>

        <StatCards stats={content.stats} />

        <div className="overflow-hidden rounded-xl border border-[#DCE7FF] bg-light-blue shadow-sm">
          <div className="flex items-start justify-between px-5 py-5">
            <div>
              <h2 className="text-lg font-extrabold text-[#07162F]">
                Pratinjau Data Ekstrak
              </h2>
              <p className="text-xs font-medium text-[#344054]">
                Sila semak maklumat sebelum pengesahan.
              </p>
            </div>
            <Icon icon="filter_alt" size={22} weight={500} className="text-[#667085]" />
          </div>
          <div className="px-2 pb-2">
            <ReviewTable
              kind={kind}
              bayaranRecords={bayaranExtract?.records ?? []}
              onBayaranTotalAmountChange={setBayaranEditedTotalAmount}
              onBayaranRecordsChange={updateCurrentBayaranDraft}
              penghuniRecords={penghuniExtract?.records ?? []}
              kuartersRecords={kuartersExtract?.records ?? []}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <button className="inline-flex h-11 items-center justify-center gap-2 rounded bg-dark-blue px-6 text-xs font-extrabold text-white shadow-sm">
            <Icon icon="add" size={16} weight={700} />
            {content.addLabel}
          </button>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className="inline-flex h-11 items-center justify-center gap-2 rounded bg-dark-blue px-7 text-xs font-extrabold text-white shadow-sm disabled:cursor-not-allowed disabled:bg-[#6B7280]"
              onClick={handleVerifyData}
              disabled={isVerifying}
            >
              <Icon icon="settings_backup_restore" size={15} weight={700} />
              {isVerifying ? "Mengesahkan..." : "Sahkan Data"}
            </button>
            <button
              type="button"
              className="inline-flex h-11 items-center justify-center gap-2 rounded bg-green px-7 text-xs font-extrabold text-white shadow-sm disabled:cursor-not-allowed disabled:bg-[#6B7280]"
              onClick={handleVerifyData}
              disabled={isVerifying}
            >
              <Icon icon="done_all" size={15} weight={700} />
              {isVerifying ? "Mengesahkan..." : "Sahkan Semua Data"}
            </button>
          </div>
        </div>
        {verificationMessage ? (
          <p className="text-right text-xs font-bold text-red">
            {verificationMessage}
          </p>
        ) : null}
      </div>
    </section>
  );
}
