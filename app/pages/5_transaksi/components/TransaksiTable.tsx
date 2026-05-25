"use client";

import Icon from "../../../components/Icon";

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
  onView: (tx: TransactionRow) => void;
  onReverse: (tx: TransactionRow) => void;
  onAdjust: (tx: TransactionRow) => void;
}

export default function TransaksiTable({ transactions, isLoading, onView, onReverse, onAdjust }: TransaksiTableProps) {
  
  const formatRM = (amount: number | string) => {
    return Number(amount).toLocaleString("ms-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case "NORMAL": return <span className="bg-teal-50 text-teal-700 px-2 py-1 rounded text-[10px] font-bold uppercase border border-teal-100">NORMAL</span>;
      case "DIBALIKAN": return <span className="bg-red-50 text-red-700 px-2 py-1 rounded text-[10px] font-bold uppercase border border-red-100">DIBALIKAN</span>;
      case "DILARASKAN": return <span className="bg-yellow-50 text-yellow-700 px-2 py-1 rounded text-[10px] font-bold uppercase border border-yellow-100">DILARASKAN</span>;
      case "PEMBALIKAN": return <span className="bg-red-600 text-white px-2 py-1 rounded text-[10px] font-bold uppercase">PEMBALIKAN</span>;
      case "PELARASAN": return <span className="bg-yellow-500 text-white px-2 py-1 rounded text-[10px] font-bold uppercase">PELARASAN</span>;
      default: return <span className="px-2 py-1 rounded text-[10px] font-bold uppercase">{status}</span>;
    }
  };

  if (isLoading) {
    return (
      <div className="p-12 text-center text-gray-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-dark-blue mx-auto mb-4"></div>
        <p>Sedang memuat turun data transaksi...</p>
      </div>
    );
  }

  const sortedTransactions = [...transactions].sort((a, b) => {
    // Susun mengikut waktu dicipta (Terkini sentiasa di atas)
    const timeA = new Date(a.createdAt || a.transactionDate).getTime();
    const timeB = new Date(b.createdAt || b.transactionDate).getTime();
    if (timeB !== timeA) return timeB - timeA;
    // Jika masa sama, susun mengikut ID (descending)
    return (b.transactionNo || b.id).localeCompare(a.transactionNo || a.id);
  });

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
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead className="text-[10px] text-gray-500 uppercase bg-gray-50 border-y border-gray-100">
          <tr>
            <th className="px-6 py-4 font-bold">Tarikh</th>
            <th className="px-6 py-4 font-bold">ID Transaksi</th>
            <th className="px-6 py-4 font-bold">Kategori</th>
            <th className="px-6 py-4 font-bold">Status</th>
            <th className="px-6 py-4 font-bold text-gray-400">ID Berkaitan</th>
            <th className="px-6 py-4 font-bold">Penghuni</th>
            <th className="px-6 py-4 font-bold">No. Resit</th>
            <th className="px-6 py-4 font-bold">Catatan</th>
            <th className="px-6 py-4 font-bold text-right">Debit (RM)</th>
            <th className="px-6 py-4 font-bold text-right">Kredit (RM)</th>
            <th className="px-6 py-4 font-bold text-center">Tindakan</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {displayTransactions.map((tx) => {
            
            // 1. Define Boolean States
            const isMuted = ["DIBALIKAN", "PEMBALIKAN", "PELARASAN"].includes(tx.status);
            const isDilaraskan = tx.status === "DILARASKAN";
            const canAction = ["NORMAL", "DILARASKAN"].includes(tx.status); // Includes BAKI_AWAL because it's NORMAL

            // 2. Calculate DILARASKAN Adjusted Amount
            let finalDebit = Number(tx.debitAmount);
            let finalCredit = Number(tx.creditAmount);
            
            if (isDilaraskan && (tx.childTransactions?.length ?? 0) > 0) {
                const pelarasanTxs = (tx.childTransactions ?? []).filter((c) => c.status === "PELARASAN");
                const totalDeltaDebit = pelarasanTxs.reduce((sum, c) => sum + Number(c.debitAmount), 0);
                const totalDeltaCredit = pelarasanTxs.reduce((sum, c) => sum + Number(c.creditAmount), 0);
                
                if (finalDebit > 0) finalDebit = finalDebit + totalDeltaDebit - totalDeltaCredit;
                if (finalCredit > 0) finalCredit = finalCredit + totalDeltaCredit - totalDeltaDebit;
            }

            // 3. Find Related ID and Collapse Count
            let displayRelatedId = 'N/A';
            let extraRelatedCount = 0;

            if (isDilaraskan || tx.status === "DIBALIKAN") {
                // Find the newest child fixing this transaction
                const fixes = getRelatedChildren(tx);
                
                if (fixes.length > 0) {
                    displayRelatedId = fixes[0].transactionNo || fixes[0].id.split('-')[0] + '...';
                    extraRelatedCount = fixes.length - 1;
                }
            } else if (tx.relatedTransaction) {
                // Child rows point to their parent transaction, but do not show the hidden-related count.
                displayRelatedId = tx.relatedTransaction.transactionNo || tx.relatedTransaction.id.split('-')[0] + '...';
            }

            return (
              <tr key={tx.id} className="hover:bg-blue-50/50 transition-colors bg-white">
                {/* Tarikh */}
                <td className={`px-6 py-4 whitespace-nowrap text-gray-600 ${isMuted ? 'opacity-50' : ''}`}>
                  {new Date(tx.transactionDate).toLocaleDateString("en-GB")}
                </td>

                {/* ID Transaksi (Uses the new Custom ID!) */}
                <td className={`px-6 py-4 whitespace-nowrap font-bold text-dark-blue ${isMuted ? 'opacity-50' : ''}`}>
                  {tx.transactionNo || tx.id.split('-')[0] + '...'}
                </td>

                {/* Kategori */}
                <td className={`px-6 py-4 text-gray-600 capitalize ${isMuted ? 'opacity-50' : ''}`}>
                  {tx.category.replace(/_/g, ' ')}
                </td>

                {/* Status Badge */}
                <td className={`px-6 py-4 whitespace-nowrap ${isMuted ? 'opacity-60' : ''}`}>
                  {getStatusBadge(tx.status)}
                </td>

                {/* ID Berkaitan & Collapse Text */}
                <td className="px-6 py-4 whitespace-nowrap text-gray-500 font-medium text-xs">
                  <div className="flex flex-col">
                    <span>{displayRelatedId}</span>
                    {extraRelatedCount > 0 && (
                      <span className="text-[10px] italic text-gray-400 mt-0.5">{extraRelatedCount} Id Lagi Berkaitan</span>
                    )}
                  </div>
                </td>

                {/* Penghuni */}
                <td className={`px-6 py-4 ${isMuted ? 'opacity-50' : ''}`}>
                  <p className="font-bold text-dark-blue truncate max-w-[150px]">{tx.resident?.fullName || 'Tiada'}</p>
                  <p className="text-xs text-gray-400">{tx.resident?.icNumber}</p>
                </td>

                {/* No Resit */}
                <td className={`px-6 py-4 text-gray-500 ${isMuted ? 'opacity-50' : ''}`}>{tx.receiptNo || 'N/A'}</td>

                {/* Catatan (Strike-through if muted) */}
                <td className={`px-6 py-4 text-gray-500 truncate max-w-[150px] ${isMuted ? 'opacity-50 line-through' : ''}`} title={tx.description ?? undefined}>
                  {tx.description}
                  {/* Small helper text like Figma */}
                  {["PEMBALIKAN", "PELARASAN"].includes(tx.status) && (
                    <span className="block text-[10px] text-gray-400 mt-0.5 capitalize">({tx.status.toLowerCase()})</span>
                  )}
                </td>
                
                {/* Debit (Merah) */}
                <td className="px-6 py-4 text-right font-bold whitespace-nowrap">
                  {Number(tx.debitAmount) > 0 ? (
                    isDilaraskan ? (
                      <div className="flex flex-col items-end">
                        <span className="line-through text-gray-400 opacity-60 text-xs font-normal mb-0.5">{formatRM(tx.debitAmount)}</span>
                        <span className="text-(--color-red)">{formatRM(finalDebit)}</span>
                      </div>
                    ) : (
                      <span className={isMuted ? "opacity-40 line-through text-gray-400" : "text-(--color-red)"}>
                        {formatRM(tx.debitAmount)}
                      </span>
                    )
                  ) : (
                    <span className="text-gray-400 font-normal">0.00</span>
                  )}
                </td>
                
                {/* Kredit (Hijau) */}
                <td className="px-6 py-4 text-right font-bold whitespace-nowrap">
                  {Number(tx.creditAmount) > 0 ? (
                    isDilaraskan ? (
                      <div className="flex flex-col items-end">
                        <span className="line-through text-gray-400 opacity-60 text-xs font-normal mb-0.5">{formatRM(tx.creditAmount)}</span>
                        <span className="text-(--color-green)">{formatRM(finalCredit)}</span>
                      </div>
                    ) : (
                      <span className={isMuted ? "opacity-40 line-through text-gray-400" : "text-(--color-green)"}>
                        {formatRM(tx.creditAmount)}
                      </span>
                    )
                  ) : (
                    <span className="text-gray-400 font-normal">0.00</span>
                  )}
                </td>

                {/* Tindakan (Icons with disabled state logic) */}
                <td className="px-6 py-4">
                  <div className="flex items-center justify-center gap-2">
                    {/* View - Always active */}
                    <button onClick={() => onView(tx)} className="text-gray-400 hover:text-dark-blue p-1 transition-colors" title="Lihat Butiran">
                      <Icon icon="visibility" size={18} />
                    </button>
                    
                    {/* Reverse - Active only if canAction is true */}
                    <button 
                      onClick={() => canAction && onReverse(tx)} 
                      className={`p-1 transition-colors ${canAction ? 'text-gray-400 hover:text-(--color-red)' : 'text-gray-300 opacity-40 cursor-not-allowed'}`} 
                      title={canAction ? "Pembalikan" : "Tidak Dibenarkan"}
                      disabled={!canAction}
                    >
                      <Icon icon="undo" size={18} />
                    </button>
                    
                    {/* Adjust - Active only if canAction is true */}
                    <button 
                      onClick={() => canAction && onAdjust(tx)} 
                      className={`p-1 transition-colors ${canAction ? 'text-gray-400 hover:text-yellow-600' : 'text-gray-300 opacity-40 cursor-not-allowed'}`} 
                      title={canAction ? "Pelarasan" : "Tidak Dibenarkan"}
                      disabled={!canAction}
                    >
                      <Icon icon="edit" size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
