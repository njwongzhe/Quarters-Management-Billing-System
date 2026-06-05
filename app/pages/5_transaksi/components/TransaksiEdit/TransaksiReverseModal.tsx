"use client";

import { useState, useEffect } from "react";
import Icon from "../../../../components/Icon";

interface TransaksiReverseModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: any;
  onSuccess: () => void;
}

export default function TransaksiReverseModal({ isOpen, onClose, transaction, onSuccess }: TransaksiReverseModalProps) {
  const [remarks, setRemarks] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen && transaction) {
      setRemarks(`${transaction.description} (Pembalikan)`);
      setError("");
    }
  }, [isOpen, transaction]);

  if (!isOpen || !transaction) return null;

  const isDebit = Number(transaction.debitAmount) > 0;
  const originalAmount = isDebit ? Number(transaction.debitAmount) : Number(transaction.creditAmount);

  const formatRM = (amount: number) => {
    return amount.toLocaleString("ms-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handleSubmit = async () => {
    if (!remarks.trim()) {
      setError("Sila masukkan catatan untuk pembalikan ini.");
      return;
    }
    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/transactions/reverse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ originalTxId: transaction.id, remarks }),
      });
      const result = await response.json();
      if (result.ok) {
        onSuccess();
        onClose();
      } else {
        setError(result.message);
      }
    } catch {
      setError("Ralat rangkaian. Sila cuba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed bottom-0 left-55 right-0 top-0 z-50 flex items-start justify-center bg-black/45 p-12 backdrop-blur-sm">
      <div className="flex max-h-full w-full max-w-4xl flex-col overflow-hidden rounded-lg bg-light-blue shadow-2xl">
        
        {/* Header (Dark Blue) */}
        <div className="flex items-center justify-between bg-dark-blue p-6 text-white">
          <div>
            <h2 className="font-bold text-lg uppercase tracking-wide">Pembalikan Transaksi</h2>
            <p className="text-xs text-gray-300">SILA KEMASKINI BUTIRAN PEMBALIKAN DI BAWAH</p>
          </div>
          <button onClick={onClose} className="text-white transition-colors hover:opacity-80">
            <Icon icon="close" size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar space-y-8">
          
          {/* Section 1: Maklumat Transaksi */}
          <div className="space-y-4">
            <h3 className="border-l-4 border-dark-blue pl-2 font-bold text-sm uppercase text-dark-blue">Maklumat Transaksi</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nama Penghuni</label>
                <input type="text" readOnly value={transaction.resident?.fullName || 'Tiada'} className="w-full bg-gray-50 border border-gray-200 rounded p-2.5 text-sm font-semibold text-gray-700 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">No. Kad Pengenalan</label>
                <input type="text" readOnly value={transaction.resident?.icNumber || 'Tiada'} className="w-full bg-gray-50 border border-gray-200 rounded p-2.5 text-sm font-semibold text-gray-700 outline-none" />
              </div>
            </div>

            <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{isDebit ? 'Debit' : 'Kredit'} Asal (RM)</label>
                <input type="text" readOnly value={formatRM(originalAmount)} className="w-full bg-gray-50 border border-gray-200 rounded p-2.5 text-sm font-bold text-dark-blue outline-none" />
              </div>
              <Icon icon="arrow_forward" size={20} className="text-gray-400 mt-5" />
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{isDebit ? 'Debit' : 'Kredit'} Baru (RM)</label>
                <input type="text" readOnly value="0.00" className="w-full bg-gray-50 border border-gray-200 rounded p-2.5 text-sm font-bold text-dark-blue outline-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Catatan Baru</label>
              <input type="text" value={remarks} onChange={(e) => setRemarks(e.target.value)} className="w-full bg-white border border-gray-300 focus:border-dark-blue focus:ring-1 focus:ring-dark-blue rounded p-2.5 text-sm outline-none transition-all" />
              {error && <p className="text-red-500 text-xs mt-1 font-medium">{error}</p>}
            </div>
          </div>

          {/* Section 2: Pratonton (Preview) */}
          <div className="space-y-4">
            <h3 className="border-l-4 border-dark-blue pl-2 font-bold text-sm uppercase text-dark-blue">Pratonton Transaksi Berkaitan</h3>
            
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-gray-50 text-gray-500 font-bold uppercase border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3">Tarikh</th>
                    <th className="px-4 py-3">ID</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Catatan</th>
                    <th className="px-4 py-3 text-right">Debit (RM)</th>
                    <th className="px-4 py-3 text-right">Kredit (RM)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {/* Original Row */}
                  <tr>
                    <td className="px-4 py-3">{new Date(transaction.transactionDate).toLocaleDateString("en-GB")}</td>
                    <td className="px-4 py-3 font-bold">{transaction.transactionNo}</td>
                    <td className="px-4 py-3"><span className="bg-red-50 text-red-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase border border-red-100">DIBALIKAN</span></td>
                    <td className="px-4 py-3">{transaction.description}</td>
                    <td className="px-4 py-3 text-right font-bold text-gray-500">{isDebit ? formatRM(originalAmount) : '0.00'}</td>
                    <td className="px-4 py-3 text-right font-bold text-(--color-green)">{!isDebit ? formatRM(originalAmount) : '0.00'}</td>
                  </tr>
                  {/* Balancing Row */}
                  <tr>
                    <td className="px-4 py-3 font-bold">Hari Ini</td>
                    <td className="px-4 py-3 italic text-gray-400">Diberikan Nanti</td>
                    <td className="px-4 py-3"><span className="bg-red-600 text-white px-2 py-0.5 rounded text-[10px] font-bold uppercase">PEMBALIKAN</span></td>
                    <td className="px-4 py-3">{remarks}</td>
                    <td className="px-4 py-3 text-right font-bold text-(--color-red)">{!isDebit ? formatRM(originalAmount) : '0.00'}</td>
                    <td className="px-4 py-3 text-right font-bold text-gray-500">{isDebit ? formatRM(originalAmount) : '0.00'}</td>
                  </tr>
                  {/* Summary Row */}
                  <tr className="bg-blue-50/50 font-bold text-dark-blue border-t-2 border-gray-200">
                    <td colSpan={4} className="px-4 py-3 uppercase">Jumlah</td>
                    <td className="px-4 py-3 text-right text-(--color-red)">{formatRM(originalAmount)}</td>
                    <td className="px-4 py-3 text-right text-(--color-green)">{formatRM(originalAmount)}</td>
                  </tr>
                </tbody>
              </table>
              <div className="bg-dark-blue p-3 text-sm font-bold uppercase text-white flex justify-between items-center">
                <span>Amaun Bersih</span>
                <span>RM 0.00</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 p-4 border-t border-gray-200 flex justify-between items-center">
          <div className="text-xs text-gray-500 italic flex items-center gap-2">
            {isSubmitting && <><div className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div> Sedang memproses rekod ini...</>}
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} disabled={isSubmitting} className="flex items-center gap-2 px-6 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-bold rounded shadow transition-colors">
              <Icon icon="close" size={18} /> Batal
            </button>
            <button onClick={handleSubmit} disabled={isSubmitting} className="flex items-center gap-2 px-6 py-2 bg-(--color-green) hover:bg-green-700 text-white text-sm font-bold rounded shadow transition-colors disabled:opacity-50">
              <Icon icon="save" size={18} /> Simpan Pembalikan
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
