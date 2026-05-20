"use client";

import { useEffect, useMemo, useState } from "react";

import Icon from "@/app/components/Icon/Icon";

import type { BayaranDetailData, BayaranDetailResponse } from "./types";

type TambahBayaranModalProps = {
  isOpen: boolean;
  paymentId: string;
  onClose: () => void;
  onSaved: () => void;
};

type DraftPaymentRow = {
  id: string;
  paymentDate: string;
  receiptNo: string;
  description: string;
  amount: string;
};

const PAYMENT_ROW_GRID =
  "grid grid-cols-[8.75rem_10rem_minmax(0,1fr)_7.75rem_2rem] items-center gap-3";

export default function TambahBayaranModal({
  isOpen,
  paymentId,
  onClose,
  onSaved,
}: TambahBayaranModalProps) {
  const [data, setData] = useState<BayaranDetailData | null>(null);
  const [draftRows, setDraftRows] = useState<DraftPaymentRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    let ignore = false;

    async function fetchDetail() {
      setIsLoading(true);
      setFeedback(null);

      try {
        const response = await fetch(`/api/payments/${paymentId}`);
        const result = (await response.json()) as BayaranDetailResponse;

        if (ignore) {
          return;
        }

        if (!response.ok || !result.ok || !result.data) {
          setFeedback({
            type: "error",
            message: result.message ?? "Gagal mengambil rekod bayaran manual.",
          });
          return;
        }

        setData(result.data);
        setDraftRows([]);
      } catch {
        if (!ignore) {
          setFeedback({
            type: "error",
            message: "Ralat rangkaian semasa mengambil rekod bayaran.",
          });
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    fetchDetail();

    return () => {
      ignore = true;
    };
  }, [isOpen, paymentId]);

  const newPaymentTotal = useMemo(
    () =>
      draftRows.reduce((total, row) => {
        const amount = Number(row.amount);
        return total + (Number.isFinite(amount) ? amount : 0);
      }, 0),
    [draftRows],
  );

  const manualPaymentTotal = useMemo(
    () =>
      data?.manualPayments.reduce((total, payment) => total + payment.amount, 0) ??
      0,
    [data?.manualPayments],
  );
  const displayedPaymentTotal = manualPaymentTotal + newPaymentTotal;
  const startingBalance =
    (data?.currentPayment.currentArrears ?? 0) + manualPaymentTotal;
  const balanceAfter = startingBalance - displayedPaymentTotal;

  if (!isOpen) {
    return null;
  }

  const handleAddRow = () => {
    setDraftRows((rows) => [...rows, createDraftRow(data?.currentPayment.amount ?? 0)]);
  };

  const handleRemoveRow = (id: string) => {
    setDraftRows((rows) => rows.filter((row) => row.id !== id));
  };

  const handleUpdateRow = (
    id: string,
    field: keyof Omit<DraftPaymentRow, "id">,
    value: string,
  ) => {
    setDraftRows((rows) =>
      rows.map((row) => (row.id === id ? { ...row, [field]: value } : row)),
    );
  };

  const handleSave = async () => {
    const rowsToSave = draftRows.filter(
      (row) => row.paymentDate || row.receiptNo || row.description || row.amount,
    );

    if (rowsToSave.length === 0) {
      setFeedback({
        type: "error",
        message: "Sila tambah sekurang-kurangnya satu rekod bayaran.",
      });
      return;
    }

    setIsSaving(true);
    setFeedback(null);

    try {
      const response = await fetch(`/api/payments/${paymentId}/manual`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payments: rowsToSave.map((row) => ({
            paymentDate: row.paymentDate,
            receiptNo: row.receiptNo,
            description: row.description,
            amount: row.amount,
          })),
        }),
      });
      const result = (await response.json()) as BayaranDetailResponse;

      if (!response.ok || !result.ok) {
        setFeedback({
          type: "error",
          message: result.message ?? "Gagal menyimpan rekod bayaran.",
        });
        return;
      }

      setFeedback({
        type: "success",
        message: result.message ?? "Rekod bayaran manual berjaya disimpan.",
      });

      if (result.data) {
        setData(result.data);
      }

      setDraftRows([]);
      onSaved();
    } catch {
      setFeedback({
        type: "error",
        message: "Ralat rangkaian semasa menyimpan rekod bayaran.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-3 backdrop-blur-sm">
      <div className="flex max-h-[86vh] w-full max-w-[780px] flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
        <div className="flex shrink-0 items-start justify-between bg-dark-blue px-6 py-4 text-white">
          <div>
            <h2 className="text-[1.1rem] font-extrabold uppercase tracking-wide">
              Tambah Bayaran
            </h2>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-blue-200">
              Sunting maklumat pembayaran semasa
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 transition-colors hover:bg-white/10"
            aria-label="Tutup tambah bayaran"
          >
            <Icon icon="close" size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden bg-light-blue px-6 py-5">
          {isLoading ? (
            <LoadingState />
          ) : (
            <div className="space-y-5">
              {feedback ? (
                <div
                  className={[
                    "flex items-start gap-3 rounded-lg border px-4 py-3 text-sm font-semibold",
                    feedback.type === "success"
                      ? "border-green-200 bg-green-50 text-green-800"
                      : "border-red-200 bg-red-50 text-red-800",
                  ].join(" ")}
                >
                  <Icon
                    icon={feedback.type === "success" ? "save" : "warning"}
                    size={18}
                    className="mt-0.5 shrink-0"
                  />
                  <span>{feedback.message}</span>
                </div>
              ) : null}

              <section>
                <div className="mb-4 flex items-center justify-between gap-4">
                  <SectionTitle>Bayaran Ditambah</SectionTitle>
                  <button
                    type="button"
                    onClick={handleAddRow}
                    className="inline-flex h-9 shrink-0 items-center gap-2 rounded-md bg-white px-4 text-[11px] font-extrabold uppercase text-dark-blue shadow-sm transition-colors hover:bg-blue-50"
                  >
                    <Icon icon="add" size={16} weight={700} />
                    Tambah Bayaran Baru
                  </button>
                </div>

                <div className="space-y-2 pl-4">
                  <div
                    className={`${PAYMENT_ROW_GRID} px-2 text-[10px] font-extrabold uppercase tracking-wider text-grey`}
                  >
                    <div>Tarikh</div>
                    <div>No. Resit</div>
                    <div>Catatan</div>
                    <div className="text-right">Amaun (RM)</div>
                    <div />
                  </div>

                  {data?.manualPayments.map((payment) => (
                    <div
                      key={payment.id}
                      className={`${PAYMENT_ROW_GRID} rounded-md border border-gray-100 bg-white/75 p-2`}
                    >
                      <ReadOnlyCell>{formatDateInput(payment.paymentDate)}</ReadOnlyCell>
                      <ReadOnlyCell>{payment.receiptNo}</ReadOnlyCell>
                      <ReadOnlyCell>{payment.description}</ReadOnlyCell>
                      <ReadOnlyCell alignRight>{formatRM(payment.amount)}</ReadOnlyCell>
                      <span />
                    </div>
                  ))}

                  {draftRows.map((row) => (
                    <div
                      key={row.id}
                      className={`${PAYMENT_ROW_GRID} rounded-md border border-gray-100 bg-white p-2 shadow-sm`}
                    >
                      <input
                        type="date"
                        value={row.paymentDate}
                        onChange={(event) =>
                          handleUpdateRow(row.id, "paymentDate", event.target.value)
                        }
                        className="h-9 w-full min-w-0 rounded border border-gray-200 px-2.5 text-sm font-semibold outline-none focus:border-dark-blue"
                      />
                      <input
                        type="text"
                        value={row.receiptNo}
                        onChange={(event) =>
                          handleUpdateRow(row.id, "receiptNo", event.target.value)
                        }
                        placeholder="RES-0000"
                        className="h-9 w-full min-w-0 rounded border border-gray-200 px-2.5 text-sm font-semibold outline-none focus:border-dark-blue"
                      />
                      <input
                        type="text"
                        value={row.description}
                        onChange={(event) =>
                          handleUpdateRow(row.id, "description", event.target.value)
                        }
                        placeholder="N/A"
                        className="h-9 w-full min-w-0 rounded border border-gray-200 px-2.5 text-sm font-semibold outline-none focus:border-dark-blue"
                      />
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={row.amount}
                        onChange={(event) =>
                          handleUpdateRow(row.id, "amount", event.target.value)
                        }
                        placeholder="0.00"
                        className="h-9 w-full min-w-0 rounded border border-gray-200 px-2.5 text-right text-sm font-semibold outline-none focus:border-dark-blue"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(row.id)}
                        className="flex h-9 w-8 items-center justify-center rounded text-red transition-colors hover:bg-red-50"
                        aria-label="Padam baris bayaran"
                      >
                        <Icon icon="delete" size={18} />
                      </button>
                    </div>
                  ))}

                  {!data?.manualPayments.length && draftRows.length === 0 ? (
                    <div className="rounded-lg bg-white px-4 py-8 text-center text-sm font-semibold text-grey">
                      Tiada bayaran manual ditambah lagi.
                    </div>
                  ) : null}
                </div>
              </section>

              <div className="ml-4 rounded-lg bg-dark-blue p-4 text-white shadow-lg">
                <SummaryLine
                  label="Tunggakan Semasa"
                  value={`RM ${formatRM(startingBalance)}`}
                />
                <SummaryLine
                  label="Amaun Bayar"
                  value={`RM ${formatRM(displayedPaymentTotal)}`}
                />
                <div className="mt-3 flex items-end justify-between">
                  <div>
                    <p className="text-[10px] font-extrabold uppercase tracking-widest text-blue-200">
                      Baki Tunggakan
                    </p>
                    <h3 className="mt-1 text-2xl font-extrabold text-blue-300">
                      RM {formatRM(balanceAfter)}
                    </h3>
                  </div>
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white/10">
                    <span className="text-2xl font-extrabold">!</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center justify-between gap-4 border-t border-gray-200 bg-[#F8FAFC] px-6 py-4">
          <div className="flex min-w-0 items-center gap-2 text-sm font-medium text-grey">
            <Icon icon="edit" size={16} />
            <span className="truncate">
              {draftRows.length > 0
                ? "Sedang menambah bayaran rekod..."
                : "Tambah bayaran baru jika diperlukan."}
            </span>
          </div>
          <div className="flex shrink-0 gap-3">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 items-center gap-2 rounded-md bg-red px-5 font-bold text-white shadow-sm transition-colors hover:bg-red-800"
            >
              <Icon icon="close" size={20} />
              Batal
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || isLoading}
              className="inline-flex h-10 min-w-37 items-center justify-center gap-2 rounded-md bg-green px-5 font-bold text-white shadow-sm transition-colors hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSaving ? (
                <>
                  <Icon icon="progress_activity" size={20} className="animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <Icon icon="save" size={20} />
                  Simpan Rekod
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function createDraftRow(defaultAmount: number): DraftPaymentRow {
  return {
    id: crypto.randomUUID(),
    paymentDate: new Date().toISOString().slice(0, 10),
    receiptNo: "",
    description: "N/A",
    amount: defaultAmount > 0 ? defaultAmount.toFixed(2) : "",
  };
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="h-4 w-1 rounded-full bg-dark-blue" />
      <h3 className="text-xs font-extrabold uppercase tracking-wider text-dark-blue">
        {children}
      </h3>
    </div>
  );
}

function ReadOnlyCell({
  children,
  alignRight = false,
}: {
  children: React.ReactNode;
  alignRight?: boolean;
}) {
  return (
    <div
      className={[
        "h-9 min-w-0 truncate rounded border border-gray-100 bg-gray-50 px-2.5 py-2 text-sm font-semibold text-dark-grey",
        alignRight ? "text-right" : "",
      ].join(" ")}
    >
      {children}
    </div>
  );
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-2.5 flex items-center justify-between gap-4">
      <p className="text-[10px] font-extrabold uppercase tracking-widest text-blue-200">
        {label}
      </p>
      <p className="shrink-0 text-sm font-extrabold">{value}</p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center text-dark-blue">
      <Icon icon="progress_activity" size={44} className="mb-3 animate-spin" />
      <p className="text-sm font-extrabold uppercase tracking-widest">
        Memuat rekod bayaran...
      </p>
    </div>
  );
}

function formatDateInput(value: string) {
  return new Date(value).toLocaleDateString("en-GB", {
    timeZone: "Asia/Kuala_Lumpur",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatRM(value: number) {
  return Number(value).toLocaleString("ms-MY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
