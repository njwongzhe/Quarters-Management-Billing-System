"use client";

import { useState, useEffect } from "react";
import Icon from "../../../components/Icon";

interface TransaksiViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: any;
}

export default function TransaksiViewModal({ isOpen, onClose, transaction }: TransaksiViewModalProps) {
  const [activeTab, setActiveTab] = useState<"maklumat" | "berkaitan">("maklumat");
  const [residentDetails, setResidentDetails] = useState<any>(null);
  const [loadingResident, setLoadingResident] = useState(false);

  useEffect(() => {
    const residentId = transaction?.residentId || transaction?.resident?.id;
    if (isOpen && residentId) {
      setLoadingResident(true);
      fetch(`/api/residents/${residentId}/read`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.data) {
            setResidentDetails(data.data);
          }
        })
        .catch((err) => console.error("Error fetching resident details:", err))
        .finally(() => setLoadingResident(false));
    } else {
      setResidentDetails(null);
    }
  }, [isOpen, transaction?.residentId, transaction?.resident?.id]);

  const getAgeFromIc = (ic: string | null | undefined) => {
    if (!ic) return 'N/A';
    const cleanIc = ic.replace(/\D/g, "");
    if (cleanIc.length < 6) return 'N/A';
    const year = parseInt(cleanIc.substring(0, 2), 10);
    const currentYear = new Date().getFullYear();
    const currentCentury = Math.floor(currentYear / 100) * 100;
    let birthYear = currentCentury + year;
    if (birthYear > currentYear) birthYear -= 100;
    return currentYear - birthYear;
  };

  if (!isOpen || !transaction) return null;

  const formatRM = (amount: number | string) => {
    return Number(amount).toLocaleString("ms-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const getStatusBadge = (status: string) => {
    const baseClass = "text-white text-[10px] font-extrabold px-3 py-1 rounded-[10px] uppercase";
    switch(status) {
      case "NORMAL": return <span className={`bg-[#059669] ${baseClass}`}>NORMAL</span>;
      case "DIBALIKAN": return <span className={`bg-[#DC2626] ${baseClass}`}>DIBALIKAN</span>;
      case "DILARASKAN": return <span className={`bg-[#D97706] ${baseClass}`}>DILARASKAN</span>;
      case "PEMBALIKAN": return <span className={`bg-[#DC2626] ${baseClass}`}>PEMBALIKAN</span>;
      case "PELARASAN": return <span className={`bg-[#D97706] ${baseClass}`}>PELARASAN</span>;
      default: return <span className={`bg-gray-500 ${baseClass}`}>{status}</span>;
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
      <div className="w-full max-w-[900px] bg-[#EFF4FF] rounded-xl overflow-hidden shadow-[0_10px_25px_rgba(0,0,0,0.2)] flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <header className="bg-[#151E66] px-8 py-6 flex justify-between items-start text-white shrink-0">
          <div className="flex flex-col">
            <h1 className="text-[20px] font-bold tracking-[0.5px] mb-1 uppercase">Butiran Transaksi</h1>
            <p className="text-[13px] opacity-80 tracking-[0.3px] uppercase">MAKLUMAT TERPERINCI TRANSAKSI SEMASA</p>
          </div>
          <button onClick={onClose} className="text-white text-2xl opacity-70 hover:opacity-100 cursor-pointer transition-opacity">
            ✕
          </button>
        </header>

        {/* Tabs */}
        <nav className="bg-white flex border-b border-black/5 shrink-0">
          <button 
            onClick={() => setActiveTab("maklumat")}
            className={`px-8 py-4 text-[14px] font-bold cursor-pointer uppercase transition-colors ${activeTab === "maklumat" ? "text-[#151E66] border-b-[3px] border-[#151E66]" : "text-[#767682] border-b-[3px] border-transparent"}`}
          >
            Maklumat Transaksi
          </button>
          <button 
            onClick={() => setActiveTab("berkaitan")}
            className={`px-8 py-4 text-[14px] font-bold cursor-pointer uppercase transition-colors flex items-center gap-2 ${activeTab === "berkaitan" ? "text-[#151E66] border-b-[3px] border-[#151E66]" : "text-[#767682] border-b-[3px] border-transparent"}`}
          >
            Transaksi Berkaitan
            {relatedRecords.length > 0 && (
              <span className="bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full text-[10px]">{relatedRecords.length}</span>
            )}
          </button>
        </nav>

        {/* Body Content */}
        <main className="p-8 overflow-y-auto custom-scrollbar flex-grow">
          
          {/* TAB 1: Maklumat */}
          {activeTab === "maklumat" && (
            <div className="animate-in slide-in-from-left-4 duration-300">
                
                {/* Section 1: Maklumat Penghuni */}
                <div className="flex justify-between items-center mb-5">
                  <div className="flex items-center text-[14px] font-extrabold text-[#151E66] uppercase tracking-[1px]">
                    <span className="inline-block w-1 h-[18px] bg-[#151E66] mr-3 rounded-sm"></span>
                    Maklumat Penghuni
                  </div>
                  {(transaction?.residentId || transaction?.resident?.id) && (
                    <a href={`/pages/6_penghuni/${transaction?.residentId || transaction?.resident?.id}`} className="text-[12px] font-bold text-[#151E66] no-underline uppercase hover:underline">
                      Profil Penuh &rsaquo;
                    </a>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-5 mb-10">
                    <div className="flex flex-col col-span-2">
                        <span className="text-[11px] font-bold text-[#767682] mb-2 uppercase tracking-[0.5px]">Nama Penghuni</span>
                        <div className="bg-[#F9FBFF] border border-[#C6C5D2]/40 rounded-lg px-4 py-[14px] text-[14px] text-[#0B1C30] min-h-[48px] flex items-center justify-between">
                            {loadingResident ? 'Memuatkan...' : (residentDetails?.fullName || transaction.resident?.fullName || 'Tiada')}
                        </div>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[11px] font-bold text-[#767682] mb-2 uppercase tracking-[0.5px]">No. Kad Pengenalan</span>
                        <div className="bg-[#F9FBFF] border border-[#C6C5D2]/40 rounded-lg px-4 py-[14px] text-[14px] text-[#0B1C30] min-h-[48px] flex items-center justify-between">
                            {loadingResident ? 'Memuatkan...' : (residentDetails?.icNumber || transaction.resident?.icNumber || 'Tiada')}
                        </div>
                    </div>

                    <div className="flex flex-col">
                        <span className="text-[11px] font-bold text-[#767682] mb-2 uppercase tracking-[0.5px]">Kelas</span>
                        <div className="bg-[#F9FBFF] border border-[#C6C5D2]/40 rounded-lg px-4 py-[14px] text-[14px] text-[#0B1C30] min-h-[48px] flex items-center justify-between">
                            {loadingResident ? 'Memuatkan...' : (residentDetails?.quarters?.quarterName || 'N/A')}
                            {!loadingResident && <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='black'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14' /%3E%3C/svg%3E" className="w-3.5 h-3.5 opacity-30" alt="" />}
                        </div>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[11px] font-bold text-[#767682] mb-2 uppercase tracking-[0.5px]">Unit Kuarters</span>
                        <div className="bg-[#F9FBFF] border border-[#C6C5D2]/40 rounded-lg px-4 py-[14px] text-[14px] font-bold text-[#151E66] min-h-[48px] flex items-center justify-between">
                            {loadingResident ? 'Memuatkan...' : (residentDetails?.quarters?.unitCode || 'N/A')}
                            {!loadingResident && <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='black'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14' /%3E%3C/svg%3E" className="w-3.5 h-3.5 opacity-30" alt="" />}
                        </div>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[11px] font-bold text-[#767682] mb-2 uppercase tracking-[0.5px]">Umur</span>
                        <div className="bg-[#F9FBFF] border border-[#C6C5D2]/40 rounded-lg px-4 py-[14px] text-[14px] text-[#0B1C30] min-h-[48px] flex items-center justify-between">
                            {loadingResident ? 'Memuatkan...' : getAgeFromIc(residentDetails?.icNumber || transaction.resident?.icNumber)}
                        </div>
                    </div>

                    <div className="flex flex-col">
                        <span className="text-[11px] font-bold text-[#767682] mb-2 uppercase tracking-[0.5px]">Tarikh Masuk</span>
                        <div className="bg-[#F9FBFF] border border-[#C6C5D2]/40 rounded-lg px-4 py-[14px] text-[14px] text-[#0B1C30] min-h-[48px] flex items-center justify-between">
                            {loadingResident ? 'Memuatkan...' : (residentDetails?.quarters?.moveInDate ? new Date(residentDetails.quarters.moveInDate).toLocaleDateString("en-GB") : 'N/A')}
                        </div>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[11px] font-bold text-[#767682] mb-2 uppercase tracking-[0.5px]">Tarikh Keluar</span>
                        <div className="bg-[#F9FBFF] border border-[#C6C5D2]/40 rounded-lg px-4 py-[14px] text-[14px] text-[#A0AEC0] min-h-[48px] flex items-center justify-between">
                            {loadingResident ? 'Memuatkan...' : (residentDetails?.quarters?.moveOutDate ? new Date(residentDetails.quarters.moveOutDate).toLocaleDateString("en-GB") : 'N/A')}
                        </div>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[11px] font-bold text-[#767682] mb-2 uppercase tracking-[0.5px]">Status Penghuni</span>
                        <div className="bg-[#F9FBFF] border border-[#C6C5D2]/40 rounded-lg px-4 py-[14px] text-[14px] text-[#059669] font-bold min-h-[48px] flex items-center justify-between">
                            {loadingResident ? 'Memuatkan...' : (residentDetails?.status === 'VERIFIED' ? 'Aktif' : residentDetails?.status || 'N/A')}
                        </div>
                    </div>
                </div>

                {/* Section 2: Maklumat Transaksi */}
                <div className="flex justify-between items-center mb-5">
                  <div className="flex items-center text-[14px] font-extrabold text-[#151E66] uppercase tracking-[1px]">
                    <span className="inline-block w-1 h-[18px] bg-[#151E66] mr-3 rounded-sm"></span>
                    Maklumat Transaksi
                  </div>
                  {getStatusBadge(transaction.status)}
                </div>

                <div className="grid grid-cols-3 gap-5 mb-4">
                    <div className="flex flex-col col-span-2">
                        <span className="text-[11px] font-bold text-[#767682] mb-2 uppercase tracking-[0.5px]">Tarikh</span>
                        <div className="bg-[#F9FBFF] border border-[#C6C5D2]/40 rounded-lg px-4 py-[14px] text-[14px] text-[#0B1C30] min-h-[48px] flex items-center justify-between">
                            {new Date(transaction.transactionDate).toLocaleDateString("en-GB")}
                        </div>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[11px] font-bold text-[#767682] mb-2 uppercase tracking-[0.5px]">ID</span>
                        <div className="bg-[#F9FBFF] border border-[#C6C5D2]/40 rounded-lg px-4 py-[14px] text-[14px] text-[#0B1C30] min-h-[48px] flex items-center justify-between">
                            {transaction.transactionNo || transaction.id.split('-')[0]+'...'}
                        </div>
                    </div>

                    <div className="flex flex-col col-span-2">
                        <span className="text-[11px] font-bold text-[#767682] mb-2 uppercase tracking-[0.5px]">Kategori</span>
                        <div className="bg-[#F9FBFF] border border-[#C6C5D2]/40 rounded-lg px-4 py-[14px] text-[14px] text-[#0B1C30] min-h-[48px] flex items-center justify-between capitalize">
                            {transaction.category.replace(/_/g, ' ')}
                        </div>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[11px] font-bold text-[#767682] mb-2 uppercase tracking-[0.5px]">No Resit</span>
                        <div className="bg-[#F9FBFF] border border-[#C6C5D2]/40 rounded-lg px-4 py-[14px] text-[14px] text-[#0B1C30] min-h-[48px] flex items-center justify-between">
                            {transaction.receiptNo || 'Tiada'}
                        </div>
                    </div>

                    <div className="flex flex-col">
                        <span className="text-[11px] font-bold text-[#767682] mb-2 uppercase tracking-[0.5px]">Debit (RM)</span>
                        <div className={`bg-[#F9FBFF] border border-[#C6C5D2]/40 rounded-lg px-4 py-[14px] text-[14px] min-h-[48px] flex items-center justify-between ${Number(transaction.debitAmount) > 0 ? 'text-[#DC2626] font-bold' : 'text-[#0B1C30]'}`}>
                            {Number(transaction.debitAmount) > 0 ? formatRM(transaction.debitAmount) : '0.00'}
                        </div>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[11px] font-bold text-[#767682] mb-2 uppercase tracking-[0.5px]">Kredit (RM)</span>
                        <div className={`bg-[#F9FBFF] border border-[#C6C5D2]/40 rounded-lg px-4 py-[14px] text-[14px] min-h-[48px] flex items-center justify-between ${Number(transaction.creditAmount) > 0 ? 'text-[#059669] font-bold' : 'text-[#0B1C30]'}`}>
                            {Number(transaction.creditAmount) > 0 ? formatRM(transaction.creditAmount) : '0.00'}
                        </div>
                    </div>
                    <div></div> {/* Empty Alignment Cell */}

                    <div className="flex flex-col col-span-3">
                        <span className="text-[11px] font-bold text-[#767682] mb-2 uppercase tracking-[0.5px]">Catatan</span>
                        <div className="bg-[#F9FBFF] border border-[#C6C5D2]/40 rounded-lg px-4 py-[14px] text-[14px] text-[#0B1C30] min-h-[48px] flex items-center justify-between">
                            {transaction.description || 'Tiada catatan'}
                        </div>
                    </div>
                </div>
            </div>
          )}

          {/* TAB 2: Berkaitan */}
          {activeTab === "berkaitan" && (
            <div className="animate-in slide-in-from-right-4 duration-300">
                {relatedRecords.length === 0 ? (
                    <div className="text-center py-16 text-[#767682] bg-white rounded-lg border border-[#C6C5D2]/30 shadow-sm">
                        <Icon icon="link_off" size={48} className="mx-auto mb-3 opacity-20" />
                        <p>Tiada rekod pelarasan atau pembalikan berkaitan.</p>
                    </div>
                ) : (
                    <div className="bg-white border border-[#C6C5D2]/40 rounded-lg overflow-hidden shadow-sm">
                        <table className="w-full text-xs text-left">
                            <thead className="bg-[#F9FBFF] text-[#767682] font-bold uppercase border-b border-[#C6C5D2]/40">
                            <tr>
                                <th className="px-4 py-3">Tarikh</th>
                                <th className="px-4 py-3">ID</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3 text-right">Debit (RM)</th>
                                <th className="px-4 py-3 text-right">Kredit (RM)</th>
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-[#C6C5D2]/30 bg-white text-[#0B1C30]">
                                {relatedRecords.map((rec) => (
                                    <tr key={rec.id} className="hover:bg-[#F9FBFF] transition-colors">
                                        <td className="px-4 py-3">{new Date(rec.transactionDate).toLocaleDateString("en-GB")}</td>
                                        <td className="px-4 py-3 font-bold">{rec.transactionNo || rec.id.split('-')[0]+'...'}</td>
                                        <td className="px-4 py-3">{getStatusBadge(rec.status)}</td>
                                        <td className="px-4 py-3 text-right font-bold text-[#DC2626]">{Number(rec.debitAmount) > 0 ? formatRM(rec.debitAmount) : '-'}</td>
                                        <td className="px-4 py-3 text-right font-bold text-[#059669]">{Number(rec.creditAmount) > 0 ? formatRM(rec.creditAmount) : '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
          )}
        </main>

      </div>
    </div>
  );
}