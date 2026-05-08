"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
  const [verificationMessage, setVerificationMessage] = useState("");
  const [verifyingMode, setVerifyingMode] = useState<VerifyingMode | null>(null);
  const [selectedRecordKeys, setSelectedRecordKeys] = useState<string[]>([]);
  const [extractResult, setExtractResult] = useState<ExtractResult | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [isLoadingDraft, setIsLoadingDraft] = useState(true);

  useEffect(() => {
    let isActive = true;

    async function loadDraft() {
      if (!draftId) {
        setVerificationMessage("Dokumen semakan tidak ditemui.");
        setIsLoadingDraft(false);
        return;
      }

      setIsLoadingDraft(true);
      setVerificationMessage("");

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
        setVerificationMessage(
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

    const response = await fetch(`/api/uploaded-documents/${draftId}`, {
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
      setVerificationMessage(
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
    const response = await fetch(`/api/uploaded-documents/${draftId}`, {
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
      setVerificationMessage(
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

    setExtractResult(nextExtract);
    const response = await fetch(`/api/uploaded-documents/${draftId}`, {
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
      setVerificationMessage("");
      return;
    }

    const message = result?.message ?? "Gagal menyimpan perubahan kuarters.";
    setVerificationMessage(message);
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
      setVerificationMessage("Dokumen semakan tidak ditemui.");
      return;
    }

    if (selectedRecordKeys.length === 0) {
      setVerificationMessage("Sila pilih sekurang-kurangnya satu rekod untuk disahkan.");
      return;
    }

    setVerifyingMode(mode);
    setVerificationMessage("");

    try {
      const response = await fetch(`/api/uploaded-documents/${draftId}/verify`, {
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
        setVerificationMessage("Rekod dipilih berjaya disahkan.");
      } else {
        router.push(ROUTES.muatNaik);
      }
    } catch (error) {
      setVerificationMessage(
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

        <StatCards stats={content.stats} />

        <ReviewPreviewPanel
          kind={kind}
          bayaranRecords={bayaranExtract?.records ?? []}
          onBayaranTotalAmountChange={setBayaranEditedTotalAmount}
          onBayaranRecordsChange={updateCurrentBayaranDraft}
          penghuniRecords={penghuniExtract?.records ?? []}
          kuartersRecords={kuartersExtract?.records ?? []}
          kuartersParsingMode={kuartersExtract?.parsingMode}
          onKuartersRecordsChange={updateCurrentKuartersDraft}
          tunggakanRecords={tunggakanExtract?.records ?? []}
          onTunggakanRecordsChange={updateCurrentTunggakanDraft}
          selectedKeys={selectedRecordKeys}
          onSelectedKeysChange={setSelectedRecordKeys}
        />

        <ReviewActions
          verifyingMode={verifyingMode}
          verificationMessage={verificationMessage}
          onVerify={handleVerifyData}
        />
      </div>
    </section>
  );
}
