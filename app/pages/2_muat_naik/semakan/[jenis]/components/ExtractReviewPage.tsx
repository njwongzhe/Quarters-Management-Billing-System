"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import KuartersFeedbackBanner from "@/app/pages/7_kuarters/components/KuartersFeedbackBanner";
import type { KuartersNotice } from "@/app/pages/7_kuarters/components/kuartersHelpers";
import { ROUTES } from "../../../../../constants/routes";
import type {
  BayaranExtractResult,
  ExtractedBayaranRecord,
  ExtractedQuarterRecord,
  ExtractedTunggakanRecord,
  ExtractResult,
  KuartersExtractResult,
  ProcessingDraft,
  TunggakanExtractResult,
} from "../../../components/extract-review-shared";
import { getReviewContent } from "./review_page_components/get-review-content";
import ReviewActions from "./review_page_components/ReviewActions";
import ReviewHeader from "./review_page_components/ReviewHeader";
import ReviewPreviewPanel from "./review_page_components/ReviewPreviewPanel";
import StatCards from "./review_page_components/StatCards";
import type {
  ReviewKind,
  VerifyingMode,
} from "./review_page_components/types";

export type { ReviewKind } from "./review_page_components/types";

const verifyRouteByKind: Record<ReviewKind, (draftId: string) => string> = {
  bayaran: (draftId) => `/api/uploaded-documents/bayaran/verify/${draftId}`,
  tunggakan: (draftId) => `/api/uploaded-documents/tunggakan/verify/${draftId}`,
  penghuni: (draftId) => `/api/uploaded-documents/penghuni/verify/${draftId}`,
  kuarters: (draftId) => `/api/uploaded-documents/kuarters/verify/${draftId}`,
};

const draftUpdateRouteByKind: Record<ReviewKind, (draftId: string) => string> = {
  bayaran: (draftId) => `/api/uploaded-documents/bayaran/${draftId}`,
  tunggakan: (draftId) => `/api/uploaded-documents/tunggakan/${draftId}`,
  penghuni: (draftId) => `/api/uploaded-documents/penghuni/${draftId}`,
  kuarters: (draftId) => `/api/uploaded-documents/kuarters/${draftId}`,
};

export default function ExtractReviewPage({
  draftId,
  kind,
}: {
  draftId: string;
  kind: ReviewKind;
}) {
  const router = useRouter();
  const [bayaranEditedTotalAmount, setBayaranEditedTotalAmount] = useState<
    string | null
  >(null);
  const [verificationNotice, setVerificationNotice] =
    useState<KuartersNotice | null>(null);
  const [verifyingMode, setVerifyingMode] = useState<VerifyingMode | null>(null);
  const [selectedRecordKeys, setSelectedRecordKeys] = useState<string[]>([]);
  const [extractResult, setExtractResult] = useState<ExtractResult | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [isLoadingDraft, setIsLoadingDraft] = useState(true);

  const showVerificationNotice = (
    tone: KuartersNotice["tone"],
    message: string,
  ) => {
    setVerificationNotice(message ? { tone, message } : null);
  };

  const clearVerificationNotice = () => {
    setVerificationNotice(null);
  };

  useEffect(() => {
    let isActive = true;

    async function loadDraft() {
      if (!draftId) {
        showVerificationNotice("error", "Dokumen semakan tidak ditemui.");
        setIsLoadingDraft(false);
        return;
      }

      setIsLoadingDraft(true);
      clearVerificationNotice();

      try {
        const response = await fetch(`/api/uploaded-documents/${draftId}`);
        const result = await response.json().catch(() => null);

        if (!response.ok || !result?.data?.document) {
          throw new Error(result?.message ?? "Gagal mendapatkan draf dokumen.");
        }

        const document = result.data.document as ProcessingDraft;

        if (document.kind !== kind) {
          throw new Error("Jenis dokumen semakan tidak sepadan.");
        }

        if (!isActive) {
          return;
        }

        setExtractResult(document.extractResult);
        setUploadedFileName(document.fileName);
      } catch (error) {
        if (!isActive) {
          return;
        }

        setExtractResult(null);
        setUploadedFileName("");
        showVerificationNotice(
          "error",
          error instanceof Error
            ? error.message
            : "Gagal mendapatkan draf dokumen.",
        );
      } finally {
        if (isActive) {
          setIsLoadingDraft(false);
        }
      }
    }

    void loadDraft();

    return () => {
      isActive = false;
    };
  }, [draftId, kind]);

  const bayaranExtract =
    extractResult?.documentType === "bayaran" ? extractResult : null;
  const penghuniExtract =
    extractResult?.documentType === "penghuni" ? extractResult : null;
  const kuartersExtract =
    extractResult?.documentType === "kuarters" ? extractResult : null;
  const tunggakanExtract =
    extractResult?.documentType === "tunggakan" ? extractResult : null;

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
    if (!draftId) {
      throw new Error("Dokumen semakan tidak ditemui.");
    }

    const response = await fetch(draftUpdateRouteByKind.bayaran(draftId), {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        extractResult: nextExtract,
      }),
    });
    const result = await response.json().catch(() => null);

    if (response.ok && result?.data?.document?.extractResult) {
      setExtractResult(result.data.document.extractResult as ExtractResult);
    } else if (!response.ok) {
      showVerificationNotice(
        "error",
        result?.message ?? "Gagal menyimpan perubahan bayaran.",
      );
    }
  };

  const updateCurrentTunggakanDraft = async (
    records: ExtractedTunggakanRecord[],
    totalAmount: string,
  ) => {
    if (!tunggakanExtract) {
      return;
    }

    const nextExtract: TunggakanExtractResult = {
      ...tunggakanExtract,
      recordCount: records.length,
      totalAmount,
      records,
    };
    if (!draftId) {
      return;
    }

    setExtractResult(nextExtract);
    const response = await fetch(draftUpdateRouteByKind.tunggakan(draftId), {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        extractResult: nextExtract,
      }),
    });
    const result = await response.json().catch(() => null);

    if (response.ok && result?.data?.document?.extractResult) {
      setExtractResult(result.data.document.extractResult as ExtractResult);
    } else if (!response.ok) {
      showVerificationNotice(
        "error",
        result?.message ?? "Gagal menyimpan perubahan tunggakan.",
      );
    }
  };

  const updateCurrentKuartersDraft = async (records: ExtractedQuarterRecord[]) => {
    if (!kuartersExtract) {
      return;
    }

    const nextExtract: KuartersExtractResult = {
      ...kuartersExtract,
      recordCount: records.length,
      totalUnits: records.reduce((total, record) => total + record.units.length, 0),
      records,
    };
    if (!draftId) {
      return;
    }

    const response = await fetch(draftUpdateRouteByKind.kuarters(draftId), {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        extractResult: nextExtract,
      }),
    });
    const result = await response.json().catch(() => null);

    if (response.ok && result?.data?.document?.extractResult) {
      setExtractResult(result.data.document.extractResult as ExtractResult);
      clearVerificationNotice();
      return;
    }

    const message = result?.message ?? "Gagal menyimpan perubahan kuarters.";
    showVerificationNotice("error", message);
    throw new Error(message);
  };

  const updateKuartersCategoryDraft = async ({
    categoryId,
    categoryName,
    address,
    rentalPrice,
    maintenancePrice,
    penaltyPrice,
  }: {
    categoryId: string;
    categoryName: string;
    address: string;
    rentalPrice: string;
    maintenancePrice: string;
    penaltyPrice: string;
  }) => {
    if (!draftId) {
      throw new Error("Dokumen semakan tidak ditemui.");
    }

    const response = await fetch(draftUpdateRouteByKind.kuarters(draftId), {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "update-kuarters-category",
        categoryId,
        categoryName,
        address,
        rentalPrice,
        maintenancePrice,
        penaltyPrice,
      }),
    });
    const result = await response.json().catch(() => null);

    if (response.ok && result?.data?.document?.extractResult) {
      setExtractResult(result.data.document.extractResult as ExtractResult);
      clearVerificationNotice();
      return;
    }

    const message = result?.message ?? "Gagal menyimpan perubahan kategori kuarters.";
    showVerificationNotice("error", message);
    throw new Error(message);
  };

  const updateKuartersUnitDraft = async ({
    categoryId,
    unitId,
    unitCode,
  }: {
    categoryId: string;
    unitId: string;
    unitCode: string;
  }) => {
    if (!draftId) {
      throw new Error("Dokumen semakan tidak ditemui.");
    }

    const response = await fetch(draftUpdateRouteByKind.kuarters(draftId), {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "update-kuarters-unit",
        categoryId,
        unitId,
        unitCode,
      }),
    });
    const result = await response.json().catch(() => null);

    if (response.ok && result?.data?.document?.extractResult) {
      setExtractResult(result.data.document.extractResult as ExtractResult);
      clearVerificationNotice();
      return;
    }

    const message = result?.message ?? "Gagal menyimpan perubahan unit kuarters.";
    showVerificationNotice("error", message);
    throw new Error(message);
  };

  const handleReviewLater = () => {
    router.push(`${ROUTES.muatNaik}?kategori=${encodeURIComponent(kind)}`);
  };

  const handleVerifyData = async (mode: VerifyingMode) => {
    if (verifyingMode) {
      return;
    }

    if (!draftId) {
      showVerificationNotice("error", "Dokumen semakan tidak ditemui.");
      return;
    }

    if (selectedRecordKeys.length === 0) {
      showVerificationNotice(
        "error",
        "Sila pilih sekurang-kurangnya satu rekod untuk disahkan.",
      );
      return;
    }

    setVerifyingMode(mode);
    clearVerificationNotice();

    try {
      const response = await fetch(verifyRouteByKind[kind](draftId), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ selectedKeys: selectedRecordKeys }),
      });
      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(result?.message ?? "Gagal mengesahkan data.");
      }

      if (result?.data?.remainingExtractResult) {
        setExtractResult(result.data.remainingExtractResult as ExtractResult);
        setSelectedRecordKeys([]);
        const failedMessages = Array.isArray(result?.data?.failedMessages)
          ? result.data.failedMessages
          : [];
        const verifiedRows =
          typeof result?.data?.verifiedRows === "number"
            ? result.data.verifiedRows
            : 0;
        const noticeTone =
          verifiedRows === 0
            ? "error"
            : failedMessages.length > 0
              ? "info"
              : "success";

        showVerificationNotice(
          noticeTone,
          result?.message ?? "Rekod dipilih berjaya disahkan.",
        );
      } else {
        router.push(ROUTES.muatNaik);
      }
    } catch (error) {
      showVerificationNotice(
        "error",
        error instanceof Error ? error.message : "Gagal mengesahkan data.",
      );
    } finally {
      setVerifyingMode(null);
    }
  };

  const content = useMemo(
    () =>
      getReviewContent({
        kind,
        extractResult,
        uploadedFileName,
        bayaranEditedTotalAmount,
      }),
    [kind, extractResult, uploadedFileName, bayaranEditedTotalAmount],
  );

  return (
    <section className="min-h-full bg-background">
      <div className="flex w-full flex-col gap-8">
        <ReviewHeader
          fileName={isLoadingDraft ? "Memuatkan draf..." : content.fileName}
          onReviewLater={handleReviewLater}
        />

        <StatCards stats={content.stats} isLoading={isLoadingDraft} />

        <ReviewPreviewPanel
          kind={kind}
          isLoading={isLoadingDraft}
          bayaranRecords={bayaranExtract?.records ?? []}
          onBayaranTotalAmountChange={setBayaranEditedTotalAmount}
          onBayaranRecordsChange={updateCurrentBayaranDraft}
          penghuniRecords={penghuniExtract?.records ?? []}
          kuartersRecords={kuartersExtract?.records ?? []}
          kuartersParsingMode={kuartersExtract?.parsingMode}
          onKuartersRecordsChange={updateCurrentKuartersDraft}
          onKuartersCategoryChange={updateKuartersCategoryDraft}
          onKuartersUnitChange={updateKuartersUnitDraft}
          tunggakanRecords={tunggakanExtract?.records ?? []}
          onTunggakanRecordsChange={updateCurrentTunggakanDraft}
          selectedKeys={selectedRecordKeys}
          onSelectedKeysChange={setSelectedRecordKeys}
        />

        <ReviewActions
          verifyingMode={verifyingMode}
          onVerify={handleVerifyData}
        />

        <KuartersFeedbackBanner
          notice={kind === "kuarters" ? verificationNotice : null}
          onDismiss={clearVerificationNotice}
        />
      </div>
    </section>
  );
}
