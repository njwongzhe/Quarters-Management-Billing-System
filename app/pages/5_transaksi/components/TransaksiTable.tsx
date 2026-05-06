"use client";

import Icon from "../../../components/Icon";

interface TransaksiTableProps {
  transactions: any[];
  isLoading: boolean;
  onView: (tx: any) => void;
  onReverse: (tx: any) => void;
  onAdjust: (tx: any) => void;
}

export default function TransaksiTable({ transactions, isLoading, onView, onReverse, onAdjust }: TransaksiTableProps) {
  
  const formatRM = (amount: number | string) => {
    return Number(amount).toLocaleString("ms-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case "NORMAL": return <span className="bg-teal-50 text-teal-700 px-2 py-1 rounded text-[10px] font-bold uppercase border border-teal-100">NORMAL</span>;
      case "DIBATALKAN": return <span className="bg-red-50 text-red-700 px-2 py-1 rounded text-[10px] font-bold uppercase border border-red-100">DIBATALKAN</span>;
      case "DILARASKAN": return <span className="bg-yellow-50 text-yellow-700 px-2 py-1 rounded text-[10px] font-bold uppercase border border-yellow-100">DILARASKAN</span>;
      case "PEMBALIKAN": return <span className="bg-red-600 text-white px-2 py-1 rounded text-[10px] font-bold uppercase">PEMBALIKAN</span>;
      case "PELARASAN": return <span className="bg-yellow-500 text-white px-2 py-1 rounded text-[10px] font-bold uppercase">PELARASAN</span>;
      default: return <span>{status}</span>;
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

  if (transactions.length === 0) {
    return <div className="p-12 text-center text-gray-500 font-medium">Tiada rekod transaksi dijumpai.</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead className="text-[10px] text-gray-500 uppercase bg-gray-50 border-y border-gray-100">
          <tr>
            <th className="px-6 py-4 font-bold">Tarikh</th>
            <th className="px-6 py-4 font-bold">ID</th>
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
          {transactions.map((tx) => (
            <tr key={tx.id} className="hover:bg-blue-50/50 transition-colors bg-white">
              <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                {new Date(tx.transactionDate).toLocaleDateString("en-GB")}
              </td>
              <td className="px-6 py-4 whitespace-nowrap font-medium text-dark-blue">{tx.id.split('-')[0] + '...'}</td>
              <td className="px-6 py-4 text-gray-600 capitalize">{tx.category.replace(/_/g, ' ')}</td>
              <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(tx.status)}</td>
              <td className="px-6 py-4 whitespace-nowrap text-gray-400 text-xs">
                {tx.relatedTransactionId ? tx.relatedTransactionId.split('-')[0] + '...' : 'N/A'}
              </td>
              <td className="px-6 py-4">
                <p className="font-bold text-dark-blue truncate max-w-[150px]">{tx.resident?.fullName || 'Tiada'}</p>
                <p className="text-xs text-gray-400">{tx.resident?.icNumber}</p>
              </td>
              <td className="px-6 py-4 text-gray-500">{tx.receiptNo || 'N/A'}</td>
              <td className="px-6 py-4 text-gray-500 truncate max-w-[150px]" title={tx.description}>{tx.description}</td>
              
              {/* Debit (Merah) */}
              <td className="px-6 py-4 text-right font-bold text-(--color-red) whitespace-nowrap">
                {Number(tx.debitAmount) > 0 ? formatRM(tx.debitAmount) : '0.00'}
              </td>
              
              {/* Kredit (Hijau) */}
              <td className="px-6 py-4 text-right font-bold text-(--color-green) whitespace-nowrap">
                {Number(tx.creditAmount) > 0 ? formatRM(tx.creditAmount) : '0.00'}
              </td>

              <td className="px-6 py-4">
                <div className="flex items-center justify-center gap-2 text-gray-400">
                  <button onClick={() => onView(tx)} className="hover:text-dark-blue p-1 rounded transition-colors" title="Lihat Butiran">
                    <Icon icon="visibility" size={18} />
                  </button>
                  {/* Hanya boleh batal/laras jika status NORMAL */}
                  {tx.status === "NORMAL" && (
                    <>
                      <button onClick={() => onReverse(tx)} className="hover:text-(--color-red) p-1 rounded transition-colors" title="Pembalikan">
                        <Icon icon="undo" size={18} />
                      </button>
                      <button onClick={() => onAdjust(tx)} className="hover:text-yellow-600 p-1 rounded transition-colors" title="Pelarasan">
                        <Icon icon="edit" size={18} />
                      </button>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}