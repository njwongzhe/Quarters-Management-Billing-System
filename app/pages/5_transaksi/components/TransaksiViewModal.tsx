"use client";

import { useState } from "react";
import Icon from "../../../components/Icon";

interface TransaksiViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: any;
}

export default function TransaksiViewModal({ isOpen, onClose, transaction }: TransaksiViewModalProps) {
  const [activeTab, setActiveTab] = useState<"maklumat" | "berkaitan">("maklumat");

  if (!isOpen || !transaction) return null;

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

  // Determine what the "Related" transactions are
  let relatedRecords: any[] = [];
  if (transaction.childTransactions && transaction.childTransactions.length > 0) {
      // This is a parent record, show its children
      relatedRecords = transaction.childTransactions;
  } else if (transaction.relatedTransaction) {
      // This is a child record, show its parent
      relatedRecords = [transaction.relatedTransaction];
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header (Dark Blue) */}
        <div className="bg-[#1E293B] p-4 flex justify-between items-center text-white">
          <div className="flex items-center gap-3">
            <Icon icon="visibility" size={24} className="text-blue-300" />
            <div>
              <h2 className="font-bold text-lg uppercase tracking-wide">Butiran Transaksi</h2>
              <p className="text-xs text-gray-300">{transaction.transactionNo}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <Icon icon="close" size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 bg-gray-50 px-6">
            <button 
                onClick={() => setActiveTab("maklumat")}
                className={`py-3 px-4 text-sm font-bold border-b-2 transition-colors ${activeTab === "maklumat" ? "border-dark-blue text-dark-blue" : "border-transparent text-gray-500 hover:text-gray-700"}`}
            >
                Maklumat Transaksi
            </button>
            <button 
                onClick={() => setActiveTab("berkaitan")}
                className={`py-3 px-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === "berkaitan" ? "border-dark-blue text-dark-blue" : "border-transparent text-gray-500 hover:text-gray-700"}`}
            >
                Transaksi Berkaitan
                {relatedRecords.length > 0 && (
                    <span className="bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full text-[10px]">{relatedRecords.length}</span>
                )}
            </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-grow bg-white">
          
          {/* TAB 1: Maklumat */}
          {activeTab === "maklumat" && (
            <div className="space-y-6 animate-in slide-in-from-left-4 duration-300">
                
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-xs text-gray-500 font-bold uppercase mb-1">Status</p>
                        {getStatusBadge(transaction.status)}
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-gray-500 font-bold uppercase mb-1">Kategori</p>
                        <p className="font-bold text-gray-800 capitalize">{transaction.category.replace(/_/g, ' ')}</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border-y border-gray-100 py-4">
                    <div>
                        <p className="text-xs text-gray-500 font-bold uppercase mb-1">Tarikh Transaksi</p>
                        <p className="font-medium text-gray-800">{new Date(transaction.transactionDate).toLocaleDateString("en-GB", { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 font-bold uppercase mb-1">No. Resit</p>
                        <p className="font-medium text-gray-800">{transaction.receiptNo || 'Tiada'}</p>
                    </div>
                    <div className="col-span-2">
                        <p className="text-xs text-gray-500 font-bold uppercase mb-1">Catatan</p>
                        <p className="font-medium text-gray-800 bg-gray-50 p-3 rounded border border-gray-100">{transaction.description || 'Tiada catatan'}</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 bg-blue-50/50 p-4 rounded-lg border border-blue-100">
                    <div>
                        <p className="text-xs text-blue-800/60 font-bold uppercase mb-1">Penghuni</p>
                        <p className="font-bold text-dark-blue">{transaction.resident?.fullName || 'Tiada Penghuni Berdaftar'}</p>
                        <p className="text-sm text-gray-600">{transaction.resident?.icNumber || '-'}</p>
                    </div>
                    <div className="text-right flex flex-col justify-center">
                        <p className="text-xs text-blue-800/60 font-bold uppercase mb-1">Amaun (RM)</p>
                        {Number(transaction.debitAmount) > 0 ? (
                            <p className="text-2xl font-bold text-(--color-red)">{formatRM(transaction.debitAmount)} <span className="text-sm font-normal text-gray-500">(Debit)</span></p>
                        ) : (
                            <p className="text-2xl font-bold text-(--color-green)">{formatRM(transaction.creditAmount)} <span className="text-sm font-normal text-gray-500">(Kredit)</span></p>
                        )}
                    </div>
                </div>

            </div>
          )}

          {/* TAB 2: Berkaitan */}
          {activeTab === "berkaitan" && (
            <div className="animate-in slide-in-from-right-4 duration-300">
                {relatedRecords.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                        <Icon icon="link_off" size={48} className="mx-auto mb-3 opacity-20" />
                        <p>Tiada rekod pelarasan atau pembalikan berkaitan.</p>
                    </div>
                ) : (
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <table className="w-full text-xs text-left">
                            <thead className="bg-gray-50 text-gray-500 font-bold uppercase border-b border-gray-200">
                            <tr>
                                <th className="px-4 py-3">Tarikh</th>
                                <th className="px-4 py-3">ID</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3 text-right">Debit (RM)</th>
                                <th className="px-4 py-3 text-right">Kredit (RM)</th>
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 bg-white">
                                {relatedRecords.map((rec) => (
                                    <tr key={rec.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3">{new Date(rec.transactionDate).toLocaleDateString("en-GB")}</td>
                                        <td className="px-4 py-3 font-bold">{rec.transactionNo || rec.id.split('-')[0]+'...'}</td>
                                        <td className="px-4 py-3">{getStatusBadge(rec.status)}</td>
                                        <td className="px-4 py-3 text-right font-bold text-(--color-red)">{Number(rec.debitAmount) > 0 ? formatRM(rec.debitAmount) : '-'}</td>
                                        <td className="px-4 py-3 text-right font-bold text-(--color-green)">{Number(rec.creditAmount) > 0 ? formatRM(rec.creditAmount) : '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 p-4 border-t border-gray-200 flex justify-end">
          <button onClick={onClose} className="px-6 py-2 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 text-sm font-bold rounded shadow-sm transition-colors">
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
}