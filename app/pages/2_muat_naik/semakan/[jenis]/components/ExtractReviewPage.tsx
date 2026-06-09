"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import GlobalFixedMessage from "@/app/components/Message/GlobalFixedMessage";
import type { GlobalFixedNotice } from "@/app/components/Message/GlobalFixedMessage";
import { ROUTES } from "../../../../../constants/routes";
import type {
  BayaranExtractResult,
  ExtractedBayaranRecord,
  ExtractedPenghuniRecord,
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
    useState<GlobalFixedNotice | null>(null);
  const [verifyingMode, setVerifyingMode] = useState<VerifyingMode | null>(null);
  const [selectedRecordKeys, setSelectedRecordKeys] = useState<string[]>([]);
  const [extractResult, setExtractResult] = useState<ExtractResult | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [isLoadingDraft, setIsLoadingDraft] = useState(true);
  const [filteredStats, setFilteredStats] = useState<{
    recordCount?: number;
    totalAmount?: string;
    totalUnits?: number;
    categoryCount?: number;
  } | null>(null);

  const handleFilteredStatsChange = useCallback((stats: {
    recordCount?: number;
    totalAmount?: string;
    totalUnits?: number;
    categoryCount?: number;
  }) => {
    setFilteredStats(stats);
  }, []);

  useEffect(() => {
    setFilteredStats(null);
  }, [kind, draftId]);

  const uploadPageForKind = `${ROUTES.muatNaik}?kategori=${encodeURIComponent(kind)}`;

  const showVerificationNotice = (
    tone: GlobalFixedNotice["tone"],
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

        if (response.status === 404) {
          router.replace(uploadPageForKind);
          return;
        }

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
  }, [draftId, kind, router, uploadPageForKind]);

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
    if (!bayaranExtract || !draftId) {
      return;
    }

    const changedRecord = findSingleChangedBayaranRecord(
      bayaranExtract.records,
      records,
    );

    if (changedRecord === "unchanged") {
      return;
    }

    if (changedRecord) {
      const response = await fetch(draftUpdateRouteByKind.bayaran(draftId), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "update-bayaran-record",
          record: changedRecord,
        }),
      });
      const result = await response.json().catch(() => null);

      if (response.ok && result?.data?.record) {
        const updatedRecord = result.data.record as ExtractedBayaranRecord;
        const nextRecords = bayaranExtract.records.map((record) =>
          getBayaranRecordKey(record) === getBayaranRecordKey(changedRecord)
            ? updatedRecord
            : record,
        );
        const nextTotalAmount = nextRecords
          .reduce((total, record) => total + Number(record.amaunRm || 0), 0)
          .toFixed(2);

        setExtractResult({
          ...bayaranExtract,
          recordCount: nextRecords.length,
          totalAmount: nextTotalAmount,
          paymentMonth: updatedRecord.tarikh || bayaranExtract.paymentMonth,
          records: nextRecords,
        });
        setBayaranEditedTotalAmount(nextTotalAmount);
        showVerificationNotice("success", "Perubahan bayaran berjaya disimpan.");
        return updatedRecord;
      }

      const message = result?.message ?? "Gagal menyimpan perubahan bayaran.";
      showVerificationNotice("error", message);
      throw new Error(message);
    }

    const nextExtract: BayaranExtractResult = {
      ...bayaranExtract,
      recordCount: records.length,
      totalAmount,
      records,
    };
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
      showVerificationNotice("success", "Perubahan bayaran berjaya disimpan.");
    } else if (!response.ok) {
      showVerificationNotice(
        "error",
        result?.message ?? "Gagal menyimpan perubahan bayaran.",
      );
      throw new Error(result?.message ?? "Gagal menyimpan perubahan bayaran.");
    }
  };

  const updateCurrentTunggakanDraft = async (
    records: ExtractedTunggakanRecord[],
    totalAmount: string,
  ) => {
    if (!tunggakanExtract || !draftId) {
      return;
    }

    const changedRecord = findSingleChangedTunggakanRecord(
      tunggakanExtract.records,
      records,
    );

    if (changedRecord === "unchanged") {
      return;
    }

    if (changedRecord) {
      const response = await fetch(draftUpdateRouteByKind.tunggakan(draftId), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "update-tunggakan-record",
          record: changedRecord,
        }),
      });
      const result = await response.json().catch(() => null);

      if (response.ok && result?.data?.record) {
        const updatedRecord = result.data.record as ExtractedTunggakanRecord;
        const nextRecords = tunggakanExtract.records.map((record) =>
          getTunggakanRecordKey(record) === getTunggakanRecordKey(changedRecord)
            ? updatedRecord
            : record,
        );
        const acceptedRecords = nextRecords.filter(
          (record) => record.importStatus !== "IGNORED",
        );
        setExtractResult({
          ...tunggakanExtract,
          recordCount: acceptedRecords.length,
          totalAmount: acceptedRecords
            .reduce(
              (total, record) => total + parseSignedAmount(record.jumlahTunggakan),
              0,
            )
            .toFixed(2),
          records: nextRecords,
        });
        showVerificationNotice("success", "Perubahan tunggakan berjaya disimpan.");
        return updatedRecord;
      }

      const message = result?.message ?? "Gagal menyimpan perubahan tunggakan.";
      showVerificationNotice("error", message);
      throw new Error(message);
    }

    const nextExtract: TunggakanExtractResult = {
      ...tunggakanExtract,
      recordCount: records.length,
      totalAmount,
      records,
    };

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
      const message = result?.message ?? "Gagal menyimpan perubahan tunggakan.";
      showVerificationNotice("error", message);
      throw new Error(message);
    }
  };

  const updateCurrentPenghuniDraft = async (
    records: ExtractedPenghuniRecord[],
  ) => {
    if (!penghuniExtract || !draftId) {
      return;
    }

    const changedRecord = findSingleChangedPenghuniRecord(
      penghuniExtract.records,
      records,
    );

    if (changedRecord === "unchanged") {
        showVerificationNotice("success", "Tiada perubahan baharu untuk disimpan.");
        return;
      }

    if (changedRecord) {
      const response = await fetch(draftUpdateRouteByKind.penghuni(draftId), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "update-penghuni-record",
          record: changedRecord,
        }),
      });
      const result = await response.json().catch(() => null);

      if (response.ok && result?.data?.record) {
        const updatedRecord = result.data.record as ExtractedPenghuniRecord;
        setExtractResult({
          ...penghuniExtract,
          records: penghuniExtract.records.map((record) =>
            getPenghuniRecordKey(record) === getPenghuniRecordKey(updatedRecord)
              ? updatedRecord
              : record,
          ),
        });
        showVerificationNotice("success", "Perubahan penghuni berjaya disimpan.");
        return updatedRecord;
      }

      const message = result?.message ?? "Gagal menyimpan perubahan penghuni.";
      showVerificationNotice("error", message);
      throw new Error(message);
    }

    const nextExtract = {
      ...penghuniExtract,
      recordCount: records.length,
      records,
    };

    const response = await fetch(draftUpdateRouteByKind.penghuni(draftId), {
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
      showVerificationNotice("success", "Perubahan penghuni berjaya disimpan.");
      return;
    }

    const message = result?.message ?? "Gagal menyimpan perubahan penghuni.";
    showVerificationNotice("error", message);
    throw new Error(message);
  };

  const deletePenghuniDraft = async (record: ExtractedPenghuniRecord) => {
    if (!penghuniExtract || !draftId || !record.residentId) {
      throw new Error("Rekod penghuni tidak ditemui.");
    }

    const response = await fetch(draftUpdateRouteByKind.penghuni(draftId), {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "delete-penghuni-record",
        residentId: record.residentId,
      }),
    });
    const result = await response.json().catch(() => null);

    if (!response.ok) {
      const message = result?.message ?? "Gagal memadam rekod penghuni.";
      showVerificationNotice("error", message);
      throw new Error(message);
    }

    const recordKey = getPenghuniRecordKey(record);
    setExtractResult({
      ...penghuniExtract,
      recordCount: Math.max(0, penghuniExtract.recordCount - 1),
      records: penghuniExtract.records.filter(
        (currentRecord) => getPenghuniRecordKey(currentRecord) !== recordKey,
      ),
    });
    setSelectedRecordKeys((currentKeys) =>
      currentKeys.filter((key) => key !== recordKey),
    );
    showVerificationNotice("success", "Rekod penghuni berjaya dipadam.");
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

  const deleteKuartersCategoryDraft = async ({
    categoryId,
  }: {
    categoryId: string;
  }) => {
    if (!draftId || !kuartersExtract) {
      throw new Error("Dokumen semakan tidak ditemui.");
    }

    const response = await fetch(draftUpdateRouteByKind.kuarters(draftId), {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "delete-kuarters-category",
        categoryId,
      }),
    });
    const result = await response.json().catch(() => null);

    if (!response.ok) {
      const message = result?.message ?? "Gagal memadam kategori kuarters.";
      showVerificationNotice("error", message);
      throw new Error(message);
    }

    const deletedCategory = kuartersExtract.records.find(
      (record) => record.categoryId === categoryId || record.id === categoryId,
    );
    const removedKeys = new Set<string>([
      categoryId,
      ...(deletedCategory?.units.map((unit) => unit.unitId ?? unit.unitCode) ?? []),
    ]);
    const nextRecords = kuartersExtract.records.filter(
      (record) => record.categoryId !== categoryId && record.id !== categoryId,
    );

    setExtractResult({
      ...kuartersExtract,
      recordCount: nextRecords.length,
      totalUnits: nextRecords.reduce(
        (total, record) => total + record.units.length,
        0,
      ),
      records: nextRecords,
    });
    setSelectedRecordKeys((currentKeys) =>
      currentKeys.filter((key) => !removedKeys.has(key)),
    );
    clearVerificationNotice();
  };

  const deleteKuartersUnitDraft = async ({
    categoryId,
    unitId,
  }: {
    categoryId: string;
    unitId: string;
  }) => {
    if (!draftId || !kuartersExtract) {
      throw new Error("Dokumen semakan tidak ditemui.");
    }

    const response = await fetch(draftUpdateRouteByKind.kuarters(draftId), {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "delete-kuarters-unit",
        categoryId,
        unitId,
      }),
    });
    const result = await response.json().catch(() => null);

    if (!response.ok) {
      const message = result?.message ?? "Gagal memadam unit kuarters.";
      showVerificationNotice("error", message);
      throw new Error(message);
    }

    const nextRecords = kuartersExtract.records.map((record) => {
      if (record.categoryId !== categoryId && record.id !== categoryId) {
        return record;
      }

      const nextUnits = record.units.filter((unit) => unit.unitId !== unitId);

      return { ...record, units: nextUnits, unitCount: nextUnits.length };
    });

    setExtractResult({
      ...kuartersExtract,
      totalUnits: nextRecords.reduce(
        (total, record) => total + record.units.length,
        0,
      ),
      records: nextRecords,
    });
    setSelectedRecordKeys((currentKeys) =>
      currentKeys.filter((key) => key !== unitId),
    );
    clearVerificationNotice();
  };

  const handleReviewLater = () => {
    router.push(uploadPageForKind);
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
      const shouldSkipRemainingExtractResult =
        selectedRecordKeys.length === 1 &&
        (kind !== "kuarters" ||
          isSingleKuartersUnitSelection(kuartersExtract, selectedRecordKeys[0]));
      const response = await fetch(verifyRouteByKind[kind](draftId), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          selectedKeys: selectedRecordKeys,
          skipRemainingExtractResult: shouldSkipRemainingExtractResult,
        }),
      });
      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(result?.message ?? "Gagal mengesahkan data.");
      }

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
      const noticeMessage =
        result?.message ?? "Rekod dipilih berjaya disahkan.";

      if (result?.data?.remainingExtractResult) {
        setExtractResult(result.data.remainingExtractResult as ExtractResult);
        setSelectedRecordKeys([]);
        showVerificationNotice(noticeTone, noticeMessage);
      } else if (result?.data?.documentCompleted) {
        setExtractResult(null);
        setSelectedRecordKeys([]);
        router.replace(uploadPageForKind);
      } else if (result?.data?.remainingExtractResultSkipped) {
        if (verifiedRows > 0) {
          setExtractResult((currentExtractResult) =>
            currentExtractResult
              ? removeVerifiedRecordsFromExtractResult(
                  currentExtractResult,
                  selectedRecordKeys,
                )
              : currentExtractResult,
          );
        }

        setSelectedRecordKeys([]);
        showVerificationNotice(noticeTone, noticeMessage);
      } else {
        setSelectedRecordKeys([]);
        showVerificationNotice(noticeTone, noticeMessage);
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
        filteredStats,
      }),
    [kind, extractResult, uploadedFileName, bayaranEditedTotalAmount, filteredStats],
  );

  return (
    <section className="min-h-full bg-background">
      <div className="flex w-full flex-col gap-4 mb-10">
        <ReviewHeader
          fileName={isLoadingDraft ? "Memuatkan draf..." : content.fileName}
          onReviewLater={handleReviewLater}
          parsingMode={
            // All four extract result types share the same parsingMode field
            extractResult?.parsingMode
          }
        />

        <StatCards stats={content.stats} isLoading={isLoadingDraft} />

        <ReviewPreviewPanel
          kind={kind}
          isLoading={isLoadingDraft}
          bayaranRecords={bayaranExtract?.records ?? []}
          bayaranParsingMode={bayaranExtract?.parsingMode}
          onBayaranTotalAmountChange={setBayaranEditedTotalAmount}
          onBayaranRecordsChange={updateCurrentBayaranDraft}
          penghuniRecords={penghuniExtract?.records ?? []}
          penghuniParsingMode={penghuniExtract?.parsingMode}
          onPenghuniRecordsChange={updateCurrentPenghuniDraft}
          onPenghuniRecordDelete={deletePenghuniDraft}
          kuartersRecords={kuartersExtract?.records ?? []}
          kuartersParsingMode={kuartersExtract?.parsingMode}
          onKuartersRecordsChange={updateCurrentKuartersDraft}
          onKuartersCategoryChange={updateKuartersCategoryDraft}
          onKuartersUnitChange={updateKuartersUnitDraft}
          onKuartersCategoryDelete={deleteKuartersCategoryDraft}
          onKuartersUnitDelete={deleteKuartersUnitDraft}
          tunggakanRecords={tunggakanExtract?.records ?? []}
          tunggakanParsingMode={tunggakanExtract?.parsingMode}
          onTunggakanRecordsChange={updateCurrentTunggakanDraft}
          selectedKeys={selectedRecordKeys}
          onSelectedKeysChange={setSelectedRecordKeys}
          onNotice={showVerificationNotice}
          onFilteredStatsChange={handleFilteredStatsChange}
        />

        <ReviewActions
          verifyingMode={verifyingMode}
          onVerify={handleVerifyData}
        />

        <GlobalFixedMessage
          notice={verificationNotice}
          onDismiss={clearVerificationNotice}
        />
      </div>
    </section>
  );
}

function getPenghuniRecordKey(record: ExtractedPenghuniRecord) {
  return record.residentId ?? record.noKadPengenalan;
}

function getTunggakanRecordKey(record: ExtractedTunggakanRecord) {
  return record.arrearsSummaryId ?? `${record.noKadPengenalan}-${record.nama}`;
}

function getBayaranRecordKey(record: ExtractedBayaranRecord) {
  return (
    record.paymentId ??
    `${record.page}-${record.bil}-${record.noGajiNoKp}-${record.noRujukan}`
  );
}

function findSingleChangedPenghuniRecord(
  currentRecords: ExtractedPenghuniRecord[],
  nextRecords: ExtractedPenghuniRecord[],
) {
  if (currentRecords.length !== nextRecords.length) {
    return null;
  }

  const currentByKey = new Map(
    currentRecords.map((record) => [getPenghuniRecordKey(record), record]),
  );
  const changedRecords = nextRecords.filter((record) => {
    const currentRecord = currentByKey.get(getPenghuniRecordKey(record));

    return (
      currentRecord &&
      JSON.stringify(currentRecord) !== JSON.stringify(record)
    );
  });

  if (changedRecords.length === 0) {
    return "unchanged";
  }

  return changedRecords.length === 1 ? changedRecords[0] : null;
}

function findSingleChangedBayaranRecord(
  currentRecords: ExtractedBayaranRecord[],
  nextRecords: ExtractedBayaranRecord[],
) {
  if (currentRecords.length !== nextRecords.length) {
    return null;
  }

  const currentByKey = new Map(
    currentRecords.map((record) => [getBayaranRecordKey(record), record]),
  );
  const changedRecords = nextRecords.filter((record) => {
    const currentRecord = currentByKey.get(getBayaranRecordKey(record));

    return (
      currentRecord &&
      JSON.stringify(currentRecord) !== JSON.stringify(record)
    );
  });

  if (changedRecords.length === 0) {
    return "unchanged";
  }

  return changedRecords.length === 1 ? changedRecords[0] : null;
}

function findSingleChangedTunggakanRecord(
  currentRecords: ExtractedTunggakanRecord[],
  nextRecords: ExtractedTunggakanRecord[],
) {
  if (currentRecords.length !== nextRecords.length) {
    return null;
  }

  const currentByKey = new Map(
    currentRecords.map((record) => [getTunggakanRecordKey(record), record]),
  );
  const changedRecords = nextRecords.filter((record) => {
    const currentRecord = currentByKey.get(getTunggakanRecordKey(record));

    return (
      currentRecord &&
      JSON.stringify(currentRecord) !== JSON.stringify(record)
    );
  });

  if (changedRecords.length === 0) {
    return "unchanged";
  }

  return changedRecords.length === 1 ? changedRecords[0] : null;
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

function removeVerifiedRecordsFromExtractResult(
  extractResult: ExtractResult,
  selectedKeys: string[],
): ExtractResult {
  const selectedKeySet = new Set(selectedKeys);

  if (extractResult.documentType === "bayaran") {
    const records = extractResult.records.filter(
      (record) => !selectedKeySet.has(getBayaranRecordKey(record)),
    );

    return {
      ...extractResult,
      recordCount: records.length,
      totalAmount: records
        .reduce((total, record) => total + Number(record.amaunRm || 0), 0)
        .toFixed(2),
      records,
    };
  }

  if (extractResult.documentType === "tunggakan") {
    const records = extractResult.records.filter(
      (record) => !selectedKeySet.has(getTunggakanRecordKey(record)),
    );
    const acceptedRecords = records.filter(
      (record) => record.importStatus !== "IGNORED",
    );

    return {
      ...extractResult,
      recordCount: acceptedRecords.length,
      totalAmount: acceptedRecords
        .reduce(
          (total, record) => total + parseSignedAmount(record.jumlahTunggakan),
          0,
        )
        .toFixed(2),
      records,
    };
  }

  if (extractResult.documentType === "penghuni") {
    const records = extractResult.records.filter(
      (record) => !selectedKeySet.has(getPenghuniRecordKey(record)),
    );

    return {
      ...extractResult,
      recordCount: records.length,
      records,
    };
  }

  if (extractResult.documentType === "kuarters") {
    const records = extractResult.records
      .map((record) => {
        if (selectedKeySet.has(getQuarterRecordKey(record))) {
          return null;
        }

        const units = record.units.filter(
          (unit) => !selectedKeySet.has(getQuarterUnitKey(unit)),
        );

        return { ...record, units, unitCount: units.length };
      })
      .filter(
        (record): record is ExtractedQuarterRecord =>
          Boolean(record && record.units.length > 0),
      );

    return {
      ...extractResult,
      recordCount: records.length,
      totalUnits: records.reduce((total, record) => total + record.units.length, 0),
      records,
    };
  }

  return extractResult;
}

function isSingleKuartersUnitSelection(
  extractResult: KuartersExtractResult | null,
  selectedKey: string | undefined,
) {
  if (!extractResult || !selectedKey) {
    return false;
  }

  return extractResult.records.some((record) =>
    record.units.some((unit) => getQuarterUnitKey(unit) === selectedKey),
  );
}

function getQuarterRecordKey(record: ExtractedQuarterRecord) {
  return record.categoryId ?? record.id;
}

function getQuarterUnitKey(unit: { unitId?: string; unitCode: string }) {
  return unit.unitId ?? unit.unitCode;
}
