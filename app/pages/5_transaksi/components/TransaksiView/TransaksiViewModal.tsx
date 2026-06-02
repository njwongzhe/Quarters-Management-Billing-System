"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Icon from "@/app/components/Icon/Icon";
import TransaksiViewRelated from "./TransaksiViewRelated";

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
    if (!ic) return "N/A";
    const cleanIc = ic.replace(/\D/g, "");
    if (cleanIc.length < 6) return "N/A";
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
    const baseClass = "text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider text-center inline-block";
    const displayStatus = status === "DIBALIKAN" ? "DIBALIKKAN" : status;
    
    switch (status) {
      case "NORMAL":
        return <span className={`bg-normal text-[#0E7490] ${baseClass}`}>NORMAL</span>;
      case "DIBALIKAN":
      case "PEMBALIKAN":
        return <span className={`bg-[#DC2626] text-white ${baseClass}`}>{displayStatus}</span>;
      case "DILARASKAN":
      case "PELARASAN":
        return <span className={`bg-[#FEF3C7] text-[#92400E] ${baseClass}`}>{displayStatus}</span>;
      default:
        return <span className={`bg-gray-500 text-white ${baseClass}`}>{displayStatus}</span>;
    }
  };

  // Determine family tree for related transactions
  let parentTx = null;
  if (transaction.childTransactions && transaction.childTransactions.length > 0) {
    parentTx = transaction;
  } else if (transaction.relatedTransaction) {
    parentTx = transaction.relatedTransaction;
  }

  const relatedRecords: any[] = [];
  if (parentTx) {
    relatedRecords.push({
      id: parentTx.id,
      transactionNo: parentTx.transactionNo,
      transactionDate: parentTx.transactionDate,
      status: parentTx.status,
      description: parentTx.description,
      debitAmount: parentTx.debitAmount,
      creditAmount: parentTx.creditAmount,
    });
    if (parentTx.childTransactions && parentTx.childTransactions.length > 0) {
      parentTx.childTransactions.forEach((child: any) => {
        relatedRecords.push({
          id: child.id,
          transactionNo: child.transactionNo,
          transactionDate: child.transactionDate,
          status: child.status,
          description: child.description,
          debitAmount: child.debitAmount,
          creditAmount: child.creditAmount,
        });
      });
    }
  }

  return (
    <div className="fixed top-0 left-55 right-0 bottom-0 z-50 bg-black/40 backdrop-blur-sm p-12 flex items-start justify-center">
      <div className="bg-light-blue rounded-lg shadow-2xl w-full max-w-225 overflow-hidden flex flex-col max-h-full">
        
        {/* Header */}
        <header className="bg-dark-blue px-8 py-5 flex justify-between items-start text-white shrink-0">
          <div className="flex flex-col">
            <h1 className="text-[1.1rem] font-bold uppercase tracking-wide">Butiran Transaksi</h1>
            <p className="text-[10px] font-semibold text-blue-200 mt-1 uppercase tracking-widest">
              MAKLUMAT | TERPERINCI | TRANSAKSI SEMASA
            </p>
          </div>
          <button onClick={onClose} className="hover:bg-white/10 p-1 rounded transition-colors text-white">
            <Icon icon="close" size={20} />
          </button>
        </header>

        {/* Tabs */}
        <nav className="bg-white flex justify-center gap-8 border-b border-light-grey/20 shrink-0">
          <button 
            onClick={() => setActiveTab("maklumat")}
            className={`py-4 text-xs font-bold uppercase tracking-widest border-b-4 transition-colors duration-200 ${activeTab === "maklumat" ? "border-dark-blue text-dark-blue" : "border-transparent text-light-grey hover:text-dark-blue"}`}
          >
            Maklumat Transaksi
          </button>
          <button 
            onClick={() => setActiveTab("berkaitan")}
            className={`py-4 text-xs font-bold uppercase tracking-widest border-b-4 transition-colors duration-200 flex items-center gap-2 ${activeTab === "berkaitan" ? "border-dark-blue text-dark-blue" : "border-transparent text-light-grey hover:text-dark-blue"}`}
          >
            Transaksi Berkaitan
            {relatedRecords.length > 0 && (
              <span className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full text-[10px]">
                {relatedRecords.length}
              </span>
            )}
          </button>
        </nav>

        {/* Body Content */}
        <main className="p-8 overflow-y-auto flex-1 bg-light-blue relative min-h-75">
          
          {/* TAB 1: Maklumat */}
          {activeTab === "maklumat" && (
            <div className="space-y-8 animate-in fade-in duration-200">
                
                {/* Section 1: Maklumat Penghuni */}
                <div>
                  <div className="flex justify-between items-center mb-5">
                    <div className="flex items-center text-xs font-bold text-dark-blue uppercase tracking-widest">
                      <span className="inline-block w-1 h-4.5 bg-dark-blue mr-3 rounded-sm"></span>
                      Maklumat Penghuni
                    </div>
                     {(transaction?.residentId || transaction?.resident?.id) && (
                       <Link
                         href={`/pages/6_penghuni?targetId=${transaction?.residentId || transaction?.resident?.id}`}
                         className="text-[10px] font-bold text-dark-blue flex items-center gap-1 hover:underline uppercase tracking-wider"
                       >
                         Profil Penuh <Icon icon="chevronRight" size={16} />
                       </Link>
                     )}
                  </div>

                  <div className="grid grid-cols-12 gap-5">
                      <div className="flex flex-col col-span-6">
                          <span className="text-[10px] font-bold text-gray-500 mb-2 uppercase tracking-wider pl-1">Nama Penghuni</span>
                          <div className="bg-transparent border border-light-grey/40 rounded-lg px-4 py-3.5 text-sm text-[#0B1C30] min-h-12 flex items-center font-bold">
                              {loadingResident ? "Memuatkan..." : (residentDetails?.fullName || transaction.resident?.fullName || "Tiada")}
                          </div>
                      </div>
                      <div className="flex flex-col col-span-4">
                          <span className="text-[10px] font-bold text-gray-500 mb-2 uppercase tracking-wider pl-1">No. Kad Pengenalan</span>
                          <div className="bg-transparent border border-light-grey/40 rounded-lg px-4 py-3.5 text-sm text-[#0B1C30] min-h-12 flex items-center font-bold">
                              {loadingResident ? "Memuatkan..." : (residentDetails?.icNumber || transaction.resident?.icNumber || "Tiada")}
                          </div>
                      </div>
                      <div className="flex flex-col col-span-2">
                          <span className="text-[10px] font-bold text-gray-500 mb-2 uppercase tracking-wider pl-1">Umur</span>
                          <div className="bg-transparent border border-light-grey/40 rounded-lg px-4 py-3.5 text-sm text-[#0B1C30] min-h-12 flex items-center font-bold">
                              {loadingResident ? "Memuatkan..." : getAgeFromIc(residentDetails?.icNumber || transaction.resident?.icNumber)}
                          </div>
                      </div>

                      <div className="flex flex-col col-span-6">
                          <span className="text-[10px] font-bold text-gray-500 mb-2 uppercase tracking-wider pl-1">Kelas</span>
                          <div className="bg-transparent border border-light-grey/40 rounded-lg px-4 py-3.5 text-sm text-[#0B1C30] min-h-12 flex items-center justify-between font-bold">
                              {loadingResident ? "Memuatkan..." : (residentDetails?.quarters?.quarterName || "N/A")}
                              {!loadingResident && <Icon icon="externalLink" size={16} className="text-light-grey" />}
                          </div>
                      </div>
                      <div className="flex flex-col col-span-6">
                          <span className="text-[10px] font-bold text-gray-500 mb-2 uppercase tracking-wider pl-1">Unit Kuarters</span>
                          <div className="bg-transparent border border-light-grey/40 rounded-lg px-4 py-3.5 text-sm font-bold text-dark-blue min-h-12 flex items-center justify-between">
                              {loadingResident ? "Memuatkan..." : (residentDetails?.quarters?.unitCode || "N/A")}
                              {!loadingResident && <Icon icon="externalLink" size={16} className="text-dark-blue" />}
                          </div>
                      </div>

                      <div className="flex flex-col col-span-3">
                          <span className="text-[10px] font-bold text-gray-500 mb-2 uppercase tracking-wider pl-1">Tarikh Masuk</span>
                          <div className="bg-transparent border border-light-grey/40 rounded-lg px-4 py-3.5 text-sm text-[#0B1C30] min-h-12 flex items-center font-bold">
                              {loadingResident ? "Memuatkan..." : (residentDetails?.quarters?.moveInDate ? new Date(residentDetails.quarters.moveInDate).toLocaleDateString("en-GB") : "N/A")}
                          </div>
                      </div>
                      <div className="flex flex-col col-span-3">
                          <span className="text-[10px] font-bold text-gray-500 mb-2 uppercase tracking-wider pl-1">Tarikh Keluar</span>
                          <div className="bg-transparent border border-light-grey/40 rounded-lg px-4 py-3.5 text-sm text-light-grey min-h-12 flex items-center font-bold">
                              {loadingResident ? "Memuatkan..." : (residentDetails?.quarters?.moveOutDate ? new Date(residentDetails.quarters.moveOutDate).toLocaleDateString("en-GB") : "N/A")}
                          </div>
                      </div>
                      <div className="flex flex-col col-span-6">
                          <span className="text-[10px] font-bold text-gray-500 mb-2 uppercase tracking-wider pl-1">Status Penghuni</span>
                          <div className="bg-transparent border border-light-grey/40 rounded-lg px-4 py-3.5 text-sm text-[#059669] font-bold min-h-12 flex items-center justify-between">
                              {loadingResident ? "Memuatkan..." : (residentDetails?.status === "VERIFIED" ? "Aktif" : residentDetails?.status || "N/A")}
                          </div>
                      </div>
                  </div>
                </div>

                {/* Section 2: Maklumat Transaksi */}
                <div>
                  <div className="flex justify-between items-center mb-5">
                    <div className="flex items-center text-xs font-bold text-dark-blue uppercase tracking-widest">
                      <span className="inline-block w-1 h-4.5 bg-dark-blue mr-3 rounded-sm"></span>
                      Maklumat Transaksi
                    </div>
                    {getStatusBadge(transaction.status)}
                  </div>

                  <div className="grid grid-cols-12 gap-5">
                      <div className="flex flex-col col-span-6">
                          <span className="text-[10px] font-bold text-gray-500 mb-2 uppercase tracking-wider pl-1">Tarikh</span>
                          <div className="bg-transparent border border-light-grey/40 rounded-lg px-4 py-3.5 text-sm text-[#0B1C30] min-h-12 flex items-center font-bold">
                              {new Date(transaction.transactionDate).toLocaleDateString("en-GB")}
                          </div>
                      </div>
                      <div className="flex flex-col col-span-6">
                          <span className="text-[10px] font-bold text-gray-500 mb-2 uppercase tracking-wider pl-1">ID</span>
                          <div className="bg-transparent border border-light-grey/40 rounded-lg px-4 py-3.5 text-sm text-[#0B1C30] min-h-12 flex items-center font-bold">
                              {transaction.transactionNo || transaction.id.split("-")[0] + "..."}
                          </div>
                      </div>

                      <div className="flex flex-col col-span-6">
                          <span className="text-[10px] font-bold text-gray-500 mb-2 uppercase tracking-wider pl-1">Kategori</span>
                          <div className="bg-transparent border border-light-grey/40 rounded-lg px-4 py-3.5 text-sm text-[#0B1C30] min-h-12 flex items-center capitalize font-bold">
                              {transaction.category.replace(/_/g, " ")}
                          </div>
                      </div>
                      <div className="flex flex-col col-span-6">
                          <span className="text-[10px] font-bold text-gray-500 mb-2 uppercase tracking-wider pl-1">No Resit</span>
                          <div className="bg-transparent border border-light-grey/40 rounded-lg px-4 py-3.5 text-sm text-[#0B1C30] min-h-12 flex items-center font-bold">
                              {transaction.receiptNo || "Tiada"}
                          </div>
                      </div>

                      <div className="flex flex-col col-span-6">
                          <span className="text-[10px] font-bold text-gray-500 mb-2 uppercase tracking-wider pl-1">Debit (RM)</span>
                          <div className={`bg-transparent border border-light-grey/40 rounded-lg px-4 py-3.5 text-sm min-h-12 flex items-center ${Number(transaction.debitAmount) > 0 ? "text-[#DC2626] font-bold" : "text-[#0B1C30] font-bold"}`}>
                              {Number(transaction.debitAmount) > 0 ? formatRM(transaction.debitAmount) : "0.00"}
                          </div>
                      </div>
                      <div className="flex flex-col col-span-6">
                          <span className="text-[10px] font-bold text-gray-500 mb-2 uppercase tracking-wider pl-1">Kredit (RM)</span>
                          <div className={`bg-transparent border border-light-grey/40 rounded-lg px-4 py-3.5 text-sm min-h-12 flex items-center ${Number(transaction.creditAmount) > 0 ? "text-[#059669] font-bold" : "text-[#0B1C30] font-bold"}`}>
                              {Number(transaction.creditAmount) > 0 ? formatRM(transaction.creditAmount) : "0.00"}
                          </div>
                      </div>

                      <div className="flex flex-col col-span-12">
                          <span className="text-[10px] font-bold text-gray-500 mb-2 uppercase tracking-wider pl-1">Catatan</span>
                          <div className="bg-transparent border border-light-grey/40 rounded-lg px-4 py-3.5 text-sm text-[#0B1C30] min-h-12 flex items-center font-bold">
                              {transaction.description || "Tiada catatan"}
                          </div>
                      </div>
                  </div>
                </div>
            </div>
          )}

          {/* TAB 2: Berkaitan */}
          {activeTab === "berkaitan" && (
            <TransaksiViewRelated records={relatedRecords} transactionNo={transaction.transactionNo} />
          )}
        </main>

      </div>
    </div>
  );
}
