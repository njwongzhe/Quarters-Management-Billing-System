"use client";

import { useEffect, useMemo, useState } from "react";

import Icon from "@/app/components/Icon/Icon";
import { InputBox, InputField, Topic } from "@/app/components/InputField";
import SearchingDetailDataOverlay from "@/app/components/Loading/SearchingDetailDataOverlay";
import PenghuniComplete from "@/app/components/RecordNavigation/PenghuniComplete";

import TransaksiViewRelated from "./TransaksiViewRelated";

type TransactionRecord = {
  id: string;
  transactionNo?: string | null;
  residentId?: string | null;
  transactionDate: string | Date;
  status: string;
  category: string;
  description?: string | null;
  receiptNo?: string | null;
  debitAmount: number | string;
  creditAmount: number | string;
  relatedTransaction?: TransactionRecord | null;
  childTransactions?: TransactionRecord[];
  resident?: {
    id?: string | null;
    fullName?: string | null;
    icNumber?: string | null;
  } | null;
};

type ResidentReadResponse = {
  success: boolean;
  data?: {
    id: string;
    fullName: string;
    icNumber: string;
    status: string;
    quarter?: {
      moveInDate?: string | null;
      moveOutDate?: string | null;
    } | null;
  };
};

interface TransaksiViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: TransactionRecord | null;
}

type ActiveTab = "maklumat" | "berkaitan";

function TabButton({
  children,
  isActive,
  onClick,
}: {
  children: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`-mb-px py-4 text-sm font-bold transition-colors ${
        isActive
          ? "border-b-4 border-dark-blue text-dark-blue"
          : "text-gray-500 hover:text-dark-blue"
      }`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function getAgeFromIc(ic: string | null | undefined) {
  if (!ic) return null;

  const cleanIc = ic.replace(/\D/g, "");
  if (cleanIc.length < 6) return null;

  const year = parseInt(cleanIc.substring(0, 2), 10);
  const currentYear = new Date().getFullYear();
  const currentCentury = Math.floor(currentYear / 100) * 100;
  let birthYear = currentCentury + year;

  if (birthYear > currentYear) {
    birthYear -= 100;
  }

  return currentYear - birthYear;
}

function formatRM(value: number | string) {
  return Number(value).toLocaleString("ms-MY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function getStatusLabel(status: string) {
  return status === "DIBALIKAN" ? "DIBALIKKAN" : status;
}

export default function TransaksiViewModal({ isOpen, onClose, transaction }: TransaksiViewModalProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>("maklumat");
  const [residentDetails, setResidentDetails] = useState<ResidentReadResponse["data"] | null>(null);
  const [isResidentLoading, setIsResidentLoading] = useState(false);
  const [residentError, setResidentError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleEscapeKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleEscapeKey);

    return () => {
      document.removeEventListener("keydown", handleEscapeKey);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    setActiveTab("maklumat");
  }, [transaction?.id]);

  useEffect(() => {
    const residentId = transaction?.residentId || transaction?.resident?.id;

    if (!isOpen || !residentId) {
      setResidentDetails(null);
      setIsResidentLoading(false);
      setResidentError(null);
      return;
    }

    const controller = new AbortController();

    async function loadResidentDetails() {
      setIsResidentLoading(true);
      setResidentError(null);

      try {
        const response = await fetch(`/api/residents/${residentId}/read`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const payload = (await response.json().catch(() => null)) as ResidentReadResponse | null;

        if (!response.ok || !payload?.success || !payload.data) {
          throw new Error("Gagal mendapatkan maklumat penghuni.");
        }

        setResidentDetails(payload.data);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        setResidentDetails(null);
        setResidentError(
          error instanceof Error ? error.message : "Gagal mendapatkan maklumat penghuni.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsResidentLoading(false);
        }
      }
    }

    void loadResidentDetails();

    return () => {
      controller.abort();
    };
  }, [isOpen, reloadToken, transaction?.resident?.id, transaction?.residentId]);

  const relatedRecords = useMemo(() => {
    if (!transaction) {
      return [] as Array<{
        id: string;
        transactionNo?: string | null;
        transactionDate: string | Date;
        status: string;
        description?: string | null;
        debitAmount: number | string;
        creditAmount: number | string;
      }>;
    }

    const root =
      transaction.childTransactions && transaction.childTransactions.length > 0
        ? transaction
        : transaction.relatedTransaction ?? null;

    if (!root) {
      return [];
    }

    const records = [
      {
        id: root.id,
        transactionNo: root.transactionNo,
        transactionDate: root.transactionDate,
        status: root.status,
        description: root.description,
        debitAmount: root.debitAmount,
        creditAmount: root.creditAmount,
      },
    ];

    (root.childTransactions ?? []).forEach((child) => {
      records.push({
        id: child.id,
        transactionNo: child.transactionNo,
        transactionDate: child.transactionDate,
        status: child.status,
        description: child.description,
        debitAmount: child.debitAmount,
        creditAmount: child.creditAmount,
      });
    });

    return records;
  }, [transaction]);

  if (!isOpen || !transaction) {
    return null;
  }

  const residentIc = residentDetails?.icNumber || transaction.resident?.icNumber || null;
  const residentName = residentDetails?.fullName || transaction.resident?.fullName || "N/A";
  const residentId = residentDetails?.id || transaction.residentId || transaction.resident?.id || null;

  const occupantData = {
    occupantId: residentId ?? "",
    occupantName: residentName,
    occupantIcNumber: residentIc ?? "",
    occupantAge: getAgeFromIc(residentIc),
    moveInDate: residentDetails?.quarter?.moveInDate ?? null,
    moveOutDate: residentDetails?.quarter?.moveOutDate ?? null,
    occupantStatus: residentDetails?.status ?? "N/A",
  };

  return (
    <div
      className="fixed bottom-0 left-55 right-0 top-0 z-50 flex items-start justify-center bg-black/45 p-12 backdrop-blur-sm"
      onClick={onClose}
    >
      <section
        className="relative flex max-h-full w-full flex-col overflow-hidden rounded-lg bg-light-blue shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="transaksi-details-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-center justify-between bg-dark-blue p-6 text-white">
          <div>
            <h2 id="transaksi-details-title" className="text-lg font-bold">
              BUTIRAN TRANSAKSI
            </h2>
            <p className="text-xs font-extralight text-light-grey">
              MAKLUMAT TERPERINCI TRANSAKSI SEMASA
            </p>
          </div>
          <button
            type="button"
            className="text-white hover:scale-96 active:scale-92"
            aria-label="Tutup butiran transaksi"
            onClick={onClose}
          >
            <Icon icon="close" size={20} />
          </button>
        </header>

        <nav
          className="flex items-center justify-center gap-8 border-b border-light-grey/20 bg-white"
          aria-label="Tab butiran transaksi"
        >
          <TabButton
            isActive={activeTab === "maklumat"}
            onClick={() => setActiveTab("maklumat")}
          >
            MAKLUMAT TRANSAKSI
          </TabButton>
          <TabButton
            isActive={activeTab === "berkaitan"}
            onClick={() => setActiveTab("berkaitan")}
          >
            TRANSAKSI BERKAITAN
          </TabButton>
        </nav>

        {activeTab === "maklumat" ? (
          isResidentLoading ? (
            <div className="h-full">
              <SearchingDetailDataOverlay
                mode="loading"
                loadingMessage="Mendapatkan butiran transaksi..."
              />
            </div>
          ) : residentError ? (
            <div className="h-full">
              <SearchingDetailDataOverlay
                mode="warning"
                title="Maklumat Tidak Dapat Dipaparkan"
                message={residentError}
                onRetry={() => setReloadToken((value) => value + 1)}
                retryLabel="Cuba Lagi"
              />
            </div>
          ) : (
            <div className="overflow-y-auto bg-light-blue p-6">
              <div className="flex flex-col gap-8">
                <PenghuniComplete
                  currentOccupancy={occupantData}
                  actionButton={{
                    type: "profile",
                    residentId,
                    label: "Profil Penuh",
                  }}
                />

                <section className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <Topic content="MAKLUMAT TRANSAKSI" />
                    <span className="rounded-[5px] bg-dark-blue px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white">
                      {getStatusLabel(transaction.status)}
                    </span>
                  </div>

                  <div className="grid items-start gap-4 md:grid-cols-2">
                    <InputField
                      label="TARIKH"
                      value={new Date(transaction.transactionDate).toLocaleDateString("en-GB")}
                      state="inactive"
                      inactiveBackgroundClass="bg-[#EEF4FF]"
                    />
                    <InputField
                      label="ID"
                      value={transaction.transactionNo || `${transaction.id.split("-")[0]}...`}
                      state="inactive"
                      inactiveBackgroundClass="bg-[#EEF4FF]"
                    />
                    <InputField
                      label="KATEGORI"
                      value={transaction.category.replace(/_/g, " ")}
                      state="inactive"
                      inactiveBackgroundClass="bg-[#EEF4FF]"
                    />
                    <InputField
                      label="NO. RESIT"
                      value={transaction.receiptNo || "Tiada"}
                      state="inactive"
                      inactiveBackgroundClass="bg-[#EEF4FF]"
                    />
                    <InputField
                      label="DEBIT (RM)"
                      value={Number(transaction.debitAmount) > 0 ? formatRM(transaction.debitAmount) : "0.00"}
                      state="inactive"
                      inactiveBackgroundClass={`bg-[#EEF4FF] ${Number(transaction.debitAmount) > 0 ? "text-red" : ""}`}
                    />
                    <InputField
                      label="KREDIT (RM)"
                      value={Number(transaction.creditAmount) > 0 ? formatRM(transaction.creditAmount) : "0.00"}
                      state="inactive"
                      inactiveBackgroundClass={`bg-[#EEF4FF] ${Number(transaction.creditAmount) > 0 ? "text-green" : ""}`}
                    />
                  </div>

                  <InputBox
                    label="CATATAN"
                    value={transaction.description || "Tiada catatan"}
                    state="inactive"
                    inactiveBackgroundClass="bg-[#EEF4FF]"
                    inputMinHeight={110}
                  />
                </section>
              </div>
            </div>
          )
        ) : (
          <div className="overflow-y-auto bg-light-blue p-6">
            <TransaksiViewRelated
              records={relatedRecords}
              transactionNo={transaction.transactionNo}
            />
          </div>
        )}

        <footer className="flex items-center justify-end border-t border-light-grey/20 bg-white px-6 py-4">
          <button
            type="button"
            className="inline-flex min-h-10 items-center rounded-xl border border-light-grey/25 bg-white px-4 py-2 text-sm font-semibold text-grey transition-colors hover:border-dark-blue hover:text-dark-blue"
            onClick={onClose}
          >
            Tutup
          </button>
        </footer>
      </section>
    </div>
  );
}
