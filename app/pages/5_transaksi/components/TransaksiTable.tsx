"use client";

import Icon from "@/app/components/Icon/Icon";
import { loadingTableRows } from "@/app/components/Loading/LoadingTableRows";

type TransactionRow = {
  id: string;
  transactionNo?: string | null;
  relatedTransactionId?: string | null;
  transactionDate: string | Date;
  createdAt?: string | Date;
  category: string;
  status: string;
  debitAmount: number | string;
  creditAmount: number | string;
  receiptNo?: string | null;
  description?: string | null;
  resident?: {
    fullName?: string | null;
    icNumber?: string | null;
  } | null;
  relatedTransaction?: TransactionRow | null;
  childTransactions?: TransactionRow[];
};

interface TransaksiTableProps {
  transactions: TransactionRow[];
  isLoading: boolean;
  isFetching?: boolean;
  onView: (tx: TransactionRow) => void;
  onReverse: (tx: TransactionRow) => void;
  onAdjust: (tx: TransactionRow) => void;
}

function formatRM(amount: number | string) {
  return Number(amount).toLocaleString("ms-MY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function getStatusBadge(status: string) {
  switch (status) {
    case "NORMAL":
      return <span className="bg-normal px-2 py-0.5 text-[10px] font-bold uppercase text-[#0E7490]">Normal</span>;
    case "DIBALIKAN":
      return <span className="rounded-[5px] bg-red px-2 py-0.5 text-[10px] font-bold uppercase text-white">Dibalikkan</span>;
    case "DILARASKAN":
      return <span className="rounded-[5px] bg-[#FEF3C7] px-2 py-0.5 text-[10px] font-bold uppercase text-[#92400E]">Dilaraskan</span>;
    case "PEMBALIKAN":
      return <span className="rounded-[5px] bg-red px-2 py-0.5 text-[10px] font-bold uppercase text-white">Pembalikan</span>;
    case "PELARASAN":
      return <span className="rounded-[5px] bg-[#FEF3C7] px-2 py-0.5 text-[10px] font-bold uppercase text-[#92400E]">Pelarasan</span>;
    default:
      return <span className="rounded-[5px] bg-light-blue px-2 py-0.5 text-[10px] font-bold uppercase text-grey">{status}</span>;
  }
}

export default function TransaksiTable({
  transactions,
  isLoading,
  onView,
  onReverse,
  onAdjust,
}: TransaksiTableProps) {
  const sortedTransactions = [...transactions].sort((a, b) => {
    const timeA = new Date(a.createdAt || a.transactionDate).getTime();
    const timeB = new Date(b.createdAt || b.transactionDate).getTime();

    if (timeB !== timeA) return timeB - timeA;

    return (b.transactionNo || b.id).localeCompare(a.transactionNo || a.id);
  });

  const displayTransactions = sortedTransactions;

  const getRelatedChildren = (tx: TransactionRow) => {
    return (tx.relatedTransaction?.childTransactions || tx.childTransactions || [])
      .filter((child) => child.status === "PELARASAN" || child.status === "PEMBALIKAN")
      .sort((a, b) => {
        const timeA = new Date(a.createdAt || a.transactionDate).getTime();
        const timeB = new Date(b.createdAt || b.transactionDate).getTime();

        if (timeB !== timeA) return timeB - timeA;

        return (b.transactionNo || b.id).localeCompare(a.transactionNo || a.id);
      });
  };

  const newestRelatedChildByParentId = new Map<string, string>();

  sortedTransactions.forEach((tx) => {
    const isRelatedChild = ["PELARASAN", "PEMBALIKAN"].includes(tx.status) && tx.relatedTransactionId;
    if (!isRelatedChild || !tx.relatedTransactionId) return;

    if (!newestRelatedChildByParentId.has(tx.relatedTransactionId)) {
      newestRelatedChildByParentId.set(tx.relatedTransactionId, tx.id);
    }
  });

  const displayTransactions = sortedTransactions.filter((tx) => {
    const isRelatedChild = ["PELARASAN", "PEMBALIKAN"].includes(tx.status) && tx.relatedTransactionId;
    if (!isRelatedChild) return true;

    const relatedChildren = getRelatedChildren(tx);
    if (relatedChildren.length > 0) {
      return relatedChildren[0].id === tx.id;
    }

    return !!tx.relatedTransactionId && newestRelatedChildByParentId.get(tx.relatedTransactionId) === tx.id;
  });

  if (displayTransactions.length === 0) {
    return <div className="p-12 text-center text-gray-500 font-medium">Tiada rekod transaksi dijumpai.</div>;
  }

  return (
    <div className="overflow-x-auto overflow-y-auto" aria-busy={isLoading}>
      <table className="w-full min-w-290 text-left">
        <thead className="bg-background text-xs font-bold text-grey">
          <tr>
            <th className="w-min whitespace-nowrap p-3 text-left">Tarikh</th>
            <th className="w-min whitespace-nowrap p-3 text-left">ID Transaksi</th>
            <th className="w-min whitespace-nowrap p-3 text-left">Kategori</th>
            <th className="w-min whitespace-nowrap p-3 text-left">Status</th>
            <th className="w-min whitespace-nowrap p-3 text-left">ID Berkaitan</th>
            <th className="w-min whitespace-nowrap p-3 text-left">Penghuni</th>
            <th className="w-min whitespace-nowrap p-3 text-left">No. Resit</th>
            <th className="w-min whitespace-nowrap p-3 text-left">Catatan</th>
            <th className="w-min whitespace-nowrap p-3 text-right">Debit (RM)</th>
            <th className="w-min whitespace-nowrap p-3 text-right">Kredit (RM)</th>
            <th className="w-[0%] whitespace-nowrap p-3 text-center">Tindakan</th>
          </tr>
        </thead>

        <tbody className="bg-white">
          {isLoading ? (
            loadingTableRows({
              mode: "loading",
              columnCount: 11,
              rowCount: 10,
            })
          ) : displayTransactions.length === 0 ? (
            loadingTableRows({
              mode: "message",
              columnCount: 11,
              rowCount: 1,
              message: "Tiada rekod transaksi ditemui.",
            })
          ) : (
            displayTransactions.map((tx) => {
              const isMuted = ["DIBALIKAN", "PEMBALIKAN", "PELARASAN"].includes(tx.status);
              const isDilaraskan = tx.status === "DILARASKAN";
              const canAction = ["NORMAL", "DILARASKAN"].includes(tx.status);

              let finalDebit = Number(tx.debitAmount);
              let finalCredit = Number(tx.creditAmount);

              if (isDilaraskan && (tx.childTransactions?.length ?? 0) > 0) {
                const pelarasanTxs = (tx.childTransactions ?? []).filter((child) => child.status === "PELARASAN");
                const totalDeltaDebit = pelarasanTxs.reduce((sum, child) => sum + Number(child.debitAmount), 0);
                const totalDeltaCredit = pelarasanTxs.reduce((sum, child) => sum + Number(child.creditAmount), 0);

                if (finalDebit > 0) finalDebit = finalDebit + totalDeltaDebit - totalDeltaCredit;
                if (finalCredit > 0) finalCredit = finalCredit + totalDeltaCredit - totalDeltaDebit;
              }

              let displayRelatedId = "N/A";
              let extraRelatedCount = 0;

              if (isDilaraskan || tx.status === "DIBALIKAN") {
                const fixes = getRelatedChildren(tx);

                if (fixes.length > 0) {
                  displayRelatedId = fixes[0].transactionNo || `${fixes[0].id.split("-")[0]}...`;
                  extraRelatedCount = fixes.length - 1;
                }
              } else if (tx.relatedTransaction) {
                displayRelatedId = tx.relatedTransaction.transactionNo || `${tx.relatedTransaction.id.split("-")[0]}...`;
              }

              return (
                <tr
                  key={tx.id}
                  className="border-b border-light-grey/20 text-sm transition-colors hover:bg-background/60"
                >
                  <td className={`w-min whitespace-nowrap p-3 text-dark-grey ${isMuted ? "opacity-50" : ""}`}>
                    {new Date(tx.transactionDate).toLocaleDateString("en-GB")}
                  </td>

                  <td className={`w-min whitespace-nowrap p-3 font-bold text-dark-blue ${isMuted ? "opacity-50" : ""}`}>
                    {tx.transactionNo || `${tx.id.split("-")[0]}...`}
                  </td>

                  <td className={`w-min whitespace-nowrap p-3 capitalize text-dark-grey ${isMuted ? "opacity-50" : ""}`}>
                    {tx.category.replace(/_/g, " ")}
                  </td>

                  <td className={`w-min whitespace-nowrap p-3 ${isMuted ? "opacity-70" : ""}`}>
                    {getStatusBadge(tx.status)}
                  </td>

                  <td className="w-min whitespace-nowrap p-3 text-xs font-medium text-grey">
                    <div className="flex flex-col">
                      <span>{displayRelatedId}</span>
                      {extraRelatedCount > 0 ? (
                        <span className="mt-0.5 text-[10px] italic text-light-grey">
                          {extraRelatedCount} ID lagi berkaitan
                        </span>
                      ) : null}
                    </div>
                  </td>

                  <td className={`w-min whitespace-nowrap p-3 ${isMuted ? "opacity-50" : ""}`}>
                    <p className="max-w-50 truncate font-bold text-dark-grey">{tx.resident?.fullName || "Tiada"}</p>
                    <p className="text-xs text-grey">{tx.resident?.icNumber || "-"}</p>
                  </td>

                  <td className={`w-min whitespace-nowrap p-3 text-grey ${isMuted ? "opacity-50" : ""}`}>
                    {tx.receiptNo || "N/A"}
                  </td>

                  <td
                    className={`w-min max-w-55 truncate whitespace-nowrap p-3 text-grey ${isMuted ? "opacity-50 line-through" : ""}`}
                    title={tx.description ?? undefined}
                  >
                    {tx.description || "-"}
                  </td>

                  <td className="w-min whitespace-nowrap p-3 text-right font-bold">
                    {Number(tx.debitAmount) > 0 ? (
                      isDilaraskan ? (
                        <div className="flex flex-col items-end">
                          <span className="mb-0.5 text-xs font-normal text-light-grey line-through">
                            {formatRM(tx.debitAmount)}
                          </span>
                          <span className="text-red">{formatRM(finalDebit)}</span>
                        </div>
                      ) : (
                        <span className={isMuted ? "text-light-grey line-through" : "text-red"}>
                          {formatRM(tx.debitAmount)}
                        </span>
                      )
                    ) : (
                      <span className="font-normal text-light-grey">0.00</span>
                    )}
                  </td>

                  <td className="w-min whitespace-nowrap p-3 text-right font-bold">
                    {Number(tx.creditAmount) > 0 ? (
                      isDilaraskan ? (
                        <div className="flex flex-col items-end">
                          <span className="mb-0.5 text-xs font-normal text-light-grey line-through">
                            {formatRM(tx.creditAmount)}
                          </span>
                          <span className="text-green">{formatRM(finalCredit)}</span>
                        </div>
                      ) : (
                        <span className={isMuted ? "text-light-grey line-through" : "text-green"}>
                          {formatRM(tx.creditAmount)}
                        </span>
                      )
                    ) : (
                      <span className="font-normal text-light-grey">0.00</span>
                    )}
                  </td>

                  <td className="w-min whitespace-nowrap p-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => onView(tx)}
                        className="inline-grid h-8 w-8 place-items-center rounded-lg text-grey transition-colors hover:bg-background hover:text-dark-blue"
                        title="Lihat butiran"
                        aria-label="Lihat butiran"
                      >
                        <Icon icon="eye" size={18} />
                      </button>

                      <button
                        type="button"
                        onClick={() => canAction && onReverse(tx)}
                        className={`inline-grid h-8 w-8 place-items-center rounded-lg transition-colors ${
                          canAction
                            ? "text-grey hover:bg-background hover:text-red"
                            : "cursor-not-allowed text-light-grey opacity-50"
                        }`}
                        title={canAction ? "Pembalikan" : "Tidak dibenarkan"}
                        disabled={!canAction}
                        aria-label="Pembalikan"
                      >
                        <Icon icon="undo" size={18} />
                      </button>

                      <button
                        type="button"
                        onClick={() => canAction && onAdjust(tx)}
                        className={`inline-grid h-8 w-8 place-items-center rounded-lg transition-colors ${
                          canAction
                            ? "text-grey hover:bg-background hover:text-dark-blue"
                            : "cursor-not-allowed text-light-grey opacity-50"
                        }`}
                        title={canAction ? "Pelarasan" : "Tidak dibenarkan"}
                        disabled={!canAction}
                        aria-label="Pelarasan"
                      >
                        <Icon icon="edit" size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
