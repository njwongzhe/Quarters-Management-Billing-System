"use client";

import { useState, useEffect } from "react";
import Icon from "../../../components/Icon";

interface TransaksiAdjustModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: any;
  onSuccess: () => void;
}

export default function TransaksiAdjustModal({ isOpen, onClose, transaction, onSuccess }: TransaksiAdjustModalProps) {
  const [newAmount, setNewAmount] = useState("");
  const [remarks, setRemarks] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen && transaction) {
      setNewAmount("");
      setRemarks(`${transaction.description} (Pelarasan)`);
      setError("");
    }
  }, [isOpen, transaction]);

  if (!isOpen || !transaction) return null;

  const formatRM = (amount: number) => amount.toLocaleString("ms-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // 1. Core Variables & History
  const isDebitOriginal = Number(transaction.debitAmount) > 0;
  const originalAmount = isDebitOriginal ? Number(transaction.debitAmount) : Number(transaction.creditAmount);
  const pastPelarasans = transaction.childTransactions?.filter((c: any) => c.status === "PELARASAN") || [];

  // 2. Calculate Past Deltas
  const totalPastDebit = pastPelarasans.reduce((sum: number, c: any) => sum + Number(c.debitAmount), 0);
  const totalPastCredit = pastPelarasans.reduce((sum: number, c: any) => sum + Number(c.creditAmount), 0);

  // 3. Calculate Current Net Balance Before New Input
  let currentNet = originalAmount;
  if (isDebitOriginal) {
      currentNet = currentNet + totalPastDebit - totalPastCredit;
  } else {
      currentNet = currentNet + totalPastCredit - totalPastDebit;
  }

  // 4. Calculate New Input Logic
  const targetAmount = newAmount === "" ? currentNet : Number(newAmount);
  const delta = targetAmount - currentNet;
  
  let newDebit = 0;
  let newCredit = 0;
  if (isDebitOriginal) {
      if (delta > 0) newDebit = delta;
      if (delta < 0) newCredit = Math.abs(delta);
  } else {
      if (delta > 0) newCredit = delta;
      if (delta < 0) newDebit = Math.abs(delta);
  }

  // 5. Calculate Final Table Totals
  const finalTotalDebit = Number(transaction.debitAmount) + totalPastDebit + newDebit;
  const finalTotalCredit = Number(transaction.creditAmount) + totalPastCredit + newCredit;

  const handleSubmit = async () => {
    if (newAmount === "" || isNaN(Number(newAmount)) || Number(newAmount) < 0) {
      setError("Sila masukkan amaun baru yang sah.");
      return;
    }
    if (!remarks.trim()) {
      setError("Sila masukkan catatan pelarasan.");
      return;
    }
    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/transactions/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ originalTxId: transaction.id, newAmount: Number(newAmount), remarks }),
      });
      const result = await response.json();
      if (result.ok) {
        onSuccess();
        onClose();
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError("Ralat rangkaian. Sila cuba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header (Dark Blue) */}
        <div className="bg-[#1E293B] p-4 flex justify-between items-center text-white">
          <div>
            <h2 className="font-bold text-lg uppercase tracking-wide">Pelarasan Transaksi</h2>
            <p className="text-xs text-gray-300">SILA KEMASKINI BUTIRAN PELARASAN DI BAWAH</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <Icon icon="close" size={24} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar space-y-8">
          
          {/* Section 1: Maklumat Transaksi */}
          <div className="space-y-4">
            <h3 className="border-l-4 border-[#1E293B] pl-2 font-bold text-sm uppercase text-gray-700">Maklumat Transaksi</h3>
            
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
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{isDebitOriginal ? 'Debit' : 'Kredit'} Asal / Semasa (RM)</label>
                <input type="text" readOnly value={formatRM(currentNet)} className="w-full bg-gray-50 border border-gray-200 rounded p-2.5 text-sm font-bold text-dark-blue outline-none" />
              </div>
              <Icon icon="arrow_forward" size={20} className="text-gray-400 mt-5" />
              <div>
                <label className="block text-xs font-bold text-dark-blue uppercase mb-1">{isDebitOriginal ? 'Debit' : 'Kredit'} Baru (RM)</label>
                <input 
                  type="number" step="0.01" min="0" 
                  value={newAmount} 
                  onChange={(e) => setNewAmount(e.target.value)} 
                  placeholder={currentNet.toString()}
                  className="w-full bg-white border-2 border-blue-200 focus:border-dark-blue focus:ring-0 rounded p-2.5 text-sm font-bold text-dark-blue outline-none transition-all" 
                />
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
            <h3 className="border-l-4 border-[#1E293B] pl-2 font-bold text-sm uppercase text-gray-700">Pratonton Transaksi Berkaitan</h3>
            
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
                    <td className="px-4 py-3"><span className="bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase border border-yellow-100">DILARASKAN</span></td>
                    <td className="px-4 py-3">{transaction.description}</td>
                    <td className="px-4 py-3 text-right font-bold text-gray-500">{Number(transaction.debitAmount) > 0 ? formatRM(Number(transaction.debitAmount)) : '0.00'}</td>
                    <td className="px-4 py-3 text-right font-bold text-(--color-green)">{Number(transaction.creditAmount) > 0 ? formatRM(Number(transaction.creditAmount)) : '0.00'}</td>
                  </tr>

                  {/* Past Adjustments (If Any) */}
                  {pastPelarasans.map((p: any) => (
                     <tr key={p.id}>
                        <td className="px-4 py-3">{new Date(p.transactionDate).toLocaleDateString("en-GB")}</td>
                        <td className="px-4 py-3 font-bold">{p.transactionNo}</td>
                        <td className="px-4 py-3"><span className="bg-yellow-500 text-white px-2 py-0.5 rounded text-[10px] font-bold uppercase">PELARASAN</span></td>
                        <td className="px-4 py-3">{p.description}</td>
                        <td className="px-4 py-3 text-right font-bold text-(--color-red)">{Number(p.debitAmount) > 0 ? formatRM(Number(p.debitAmount)) : '0.00'}</td>
                        <td className="px-4 py-3 text-right font-bold text-gray-500">{Number(p.creditAmount) > 0 ? formatRM(Number(p.creditAmount)) : '0.00'}</td>
                     </tr>
                  ))}

                  {/* New Adjustment Row (Hari Ini) */}
                  {newAmount !== "" && delta !== 0 && (
                    <tr className="bg-yellow-50/30">
                        <td className="px-4 py-3 font-bold">Hari Ini</td>
                        <td className="px-4 py-3 italic text-gray-400">Diberikan Nanti</td>
                        <td className="px-4 py-3"><span className="bg-yellow-500 text-white px-2 py-0.5 rounded text-[10px] font-bold uppercase">PELARASAN</span></td>
                        <td className="px-4 py-3">{remarks}</td>
                        <td className="px-4 py-3 text-right font-bold text-(--color-red)">{newDebit > 0 ? formatRM(newDebit) : '0.00'}</td>
                        <td className="px-4 py-3 text-right font-bold text-gray-500">{newCredit > 0 ? formatRM(newCredit) : '0.00'}</td>
                    </tr>
                  )}

                  {/* Summary Row */}
                  <tr className="bg-blue-50/50 font-bold text-dark-blue border-t-2 border-gray-200">
                    <td colSpan={4} className="px-4 py-3 uppercase">Jumlah</td>
                    <td className="px-4 py-3 text-right text-(--color-red)">{formatRM(finalTotalDebit)}</td>
                    <td className="px-4 py-3 text-right text-(--color-green)">{formatRM(finalTotalCredit)}</td>
                  </tr>
                </tbody>
              </table>
              <div className="bg-[#1E293B] text-white p-3 flex justify-between items-center font-bold text-sm uppercase">
                <span>Amaun Bersih</span>
                <span>RM {formatRM(targetAmount)}</span>
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
              <Icon icon="save" size={18} /> Simpan Pelarasan
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}