"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Icon from "@/app/components/Icon/Icon";
import ButiranTunggakanHistory from "./ButiranTunggakanHistory";

type ButiranTunggakanModalProps = {
  isOpen: boolean;
  onClose: () => void;
  residentId: string | null;
};

// Define the shape of the data we expect from the API
export type ProfileData = {
  fullName: string; icNumber: string; age: number; kelas: string;
  unit: string; tarikhMasuk: string; tarikhKeluar: string; status: string;
  charges: { sewa: number; senggara: number; penalti: number; tambahan: number; rebat: number; total: number; };
};

export type HistoryData = {
  tarikh: string; id: string; kategori: string; catatan: string; debit: number; kredit: number;
};

export default function ButiranTunggakanModal({ isOpen, onClose, residentId }: ButiranTunggakanModalProps) {
  const [activeTab, setActiveTab] = useState<"maklumat" | "sejarah">("maklumat");
  
  // New States for API Data
  const [data, setData] = useState<{ profile: ProfileData; history: HistoryData[] } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const formatRM = (value: number) => value.toFixed(2);

  // Fetch the data whenever the modal opens with a valid residentId
  useEffect(() => {
    const fetchResidentDetails = async () => {
      if (!residentId) return;
      
      setIsLoading(true);
      try {
        const response = await fetch(`/api/arrear/${residentId}`);
        if (!response.ok) {
          console.error(`[HTTP ${response.status}] API Failed.`);
          return;
        }
        
        const result = await response.json();
        if (result.ok) {
          setData(result.data);
        } else {
          console.error("API Error:", result.message);
        }
      } catch (error) {
        console.error("Failed to fetch resident details:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (isOpen && residentId) {
      fetchResidentDetails();
    } else {
      // Reset state when modal closes so old data doesn't flash next time
      setData(null);
      setActiveTab("maklumat"); 
    }
  }, [isOpen, residentId]);

  if (!isOpen) return null;

  return (
    <div className="fixed top-0 left-55 right-0 bottom-0 z-50 bg-black/40 backdrop-blur-sm p-12 flex items-start justify-center">
      <div className="bg-light-blue rounded-lg shadow-2xl w-full overflow-hidden flex flex-col max-h-full">
        
        {/* Header */}
        <div className="bg-dark-blue px-8 py-5 flex justify-between items-start text-white">
          <div>
            <h2 className="text-[1.1rem] font-bold uppercase tracking-wide">Butiran Tunggakan</h2>
            <p className="text-[10px] font-semibold text-blue-200 mt-1 uppercase tracking-widest">
              Maklumat Terperinci Pembayaran & Baki
            </p>
          </div>
          <button onClick={onClose} className="hover:bg-white/10 p-1 rounded transition-colors">
            <Icon icon="close" size={20} />
          </button>
        </div>

        {/* Tabs */}
        <nav className="flex items-center justify-center gap-8 bg-white border-b border-light-grey/20">
          <button 
            onClick={() => setActiveTab("maklumat")} 
            className={`py-4 text-xs font-bold uppercase tracking-widest border-b-4 transition-colors duration-200 ${activeTab === "maklumat" ? "border-dark-blue text-dark-blue" : "border-transparent text-light-grey hover:text-dark-blue"}`}
          >
            Maklumat Tunggakan
          </button>
          <button 
            onClick={() => setActiveTab("sejarah")} 
            className={`py-4 text-xs font-bold uppercase tracking-widest border-b-4 transition-colors duration-200 ${activeTab === "sejarah" ? "border-dark-blue text-dark-blue" : "border-transparent text-light-grey hover:text-dark-blue"}`}
          >
            Sejarah Tunggakan
          </button>
        </nav>

        {/* Body */}
        <div className="p-8 overflow-y-auto flex-1 bg-light-blue relative min-h-75">
          
          {/* LOADING STATE */}
          {isLoading && (
            <div className="absolute inset-0 z-10 bg-light-blue/80 backdrop-blur-sm flex flex-col items-center justify-center text-dark-blue">
              <Icon
                icon="progress_activity"
                size={48}
                className="animate-spin text-dark-blue mb-3"
              />
              <p className="text-sm font-bold text-dark-blue uppercase tracking-widest animate-pulse">
                Menarik Rekod Penghuni...
              </p>
              <p className="text-xs text-light-grey mt-1">Sila tunggu sebentar</p>
            </div>
          )}

          {/* TAB 1: MAKLUMAT TUNGGAKAN */}
          {activeTab === "maklumat" && data?.profile && (
            <div className={`space-y-8 transition-opacity duration-300 ${isLoading ? 'opacity-20' : 'opacity-100'}`}>
              
              <section className="flex flex-col gap-4">
                <div className="flex items-center justify-between mb-4">
                  <span className="border-l-4 border-dark-blue pl-3 py-0.5 text-xs text-dark-blue font-bold tracking-widest">
                    MAKLUMAT PENGHUNI
                  </span>
                  {residentId && (
                    <Link
                      href={`/pages/6_penghuni?targetId=${residentId}`}
                      className="text-[10px] font-bold text-dark-blue flex items-center gap-1 hover:underline uppercase tracking-wider"
                    >
                      PROFIL PENUH <Icon icon="chevronRight" size={16} />
                    </Link>
                  )}
                </div>

                <div className="grid grid-cols-12 gap-5">
                  <div className="col-span-6 flex flex-col gap-2 tracking-widest">
                    <label className="font-bold text-gray-500 pl-1 text-[10px] uppercase">Nama Penghuni</label>
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        readOnly
                        value={data.profile.fullName}
                        className="w-full rounded-md text-sm min-h-12 border border-light-grey/40 outline-none pl-3 pr-3 py-3 bg-transparent font-bold text-dark-blue"
                      />
                    </div>
                  </div>
                  <div className="col-span-4 flex flex-col gap-2 tracking-widest">
                    <label className="font-bold text-gray-500 pl-1 text-[10px] uppercase">No. Kad Pengenalan</label>
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        readOnly
                        value={data.profile.icNumber}
                        className="w-full rounded-md text-sm min-h-12 border border-light-grey/40 outline-none pl-3 pr-3 py-3 bg-transparent font-bold text-dark-blue"
                      />
                    </div>
                  </div>
                  <div className="col-span-2 flex flex-col gap-2 tracking-widest">
                    <label className="font-bold text-gray-500 pl-1 text-[10px] uppercase">Umur</label>
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        readOnly
                        value={data.profile.age || "-"}
                        className="w-full rounded-md text-sm min-h-12 border border-light-grey/40 outline-none pl-3 pr-3 py-3 bg-transparent font-bold text-dark-blue"
                      />
                    </div>
                  </div>

                  <div className="col-span-6 flex flex-col gap-2 tracking-widest">
                    <label className="font-bold text-gray-500 pl-1 text-[10px] uppercase">Kelas</label>
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        readOnly
                        value={data.profile.kelas}
                        className="w-full rounded-md text-sm min-h-12 border border-light-grey/40 outline-none pl-3 pr-10 py-3 bg-transparent font-bold text-dark-blue"
                      />
                      <Icon icon="externalLink" size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-light-grey" />
                    </div>
                  </div>
                  <div className="col-span-6 flex flex-col gap-2 tracking-widest">
                    <label className="font-bold text-gray-500 pl-1 text-[10px] uppercase">Unit Kuarters</label>
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        readOnly
                        value={data.profile.unit}
                        className="w-full rounded-md text-sm min-h-12 border border-light-grey/40 outline-none pl-3 pr-10 py-3 bg-transparent font-bold text-dark-blue"
                      />
                      <Icon icon="externalLink" size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-light-grey" />
                    </div>
                  </div>

                  <div className="col-span-3 flex flex-col gap-2 tracking-widest">
                    <label className="font-bold text-gray-500 pl-1 text-[10px] uppercase">Tarikh Masuk</label>
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        readOnly
                        value={data.profile.tarikhMasuk}
                        className="w-full rounded-md text-sm min-h-12 border border-light-grey/40 outline-none pl-3 pr-3 py-3 bg-transparent font-bold text-dark-blue"
                      />
                    </div>
                  </div>
                  <div className="col-span-3 flex flex-col gap-2 tracking-widest">
                    <label className="font-bold text-gray-500 pl-1 text-[10px] uppercase">Tarikh Keluar</label>
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        readOnly
                        value={data.profile.tarikhKeluar}
                        className="w-full rounded-md text-sm min-h-12 border border-light-grey/40 outline-none pl-3 pr-3 py-3 bg-transparent font-bold text-light-grey"
                      />
                    </div>
                  </div>
                  <div className="col-span-6 flex flex-col gap-2 tracking-widest">
                    <label className="font-bold text-gray-500 pl-1 text-[10px] uppercase">Status Penghuni</label>
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        readOnly
                        value={data.profile.status}
                        className="w-full rounded-md text-sm min-h-12 border border-light-grey/40 outline-none pl-3 pr-3 py-3 bg-transparent font-bold text-green"
                      />
                    </div>
                  </div>
                </div>
              </section>

              <section className="flex flex-col gap-4">
                <span className="border-l-4 border-dark-blue pl-3 py-0.5 text-xs text-dark-blue font-bold tracking-widest">
                  MAKLUMAT TUNGGAKAN
                </span>

                <div className="grid grid-cols-5 gap-5">
                  <div className="flex flex-col gap-2 tracking-widest">
                    <label className="font-bold text-gray-500 pl-1 text-[10px] uppercase">Sewa (RM)</label>
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        readOnly
                        value={formatRM(data.profile.charges.sewa)}
                        className="w-full rounded-md text-sm min-h-12 border border-light-grey/40 outline-none pl-3 pr-3 py-3 bg-transparent font-bold text-red"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 tracking-widest">
                    <label className="font-bold text-gray-500 pl-1 text-[10px] uppercase">Senggara (RM)</label>
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        readOnly
                        value={formatRM(data.profile.charges.senggara)}
                        className="w-full rounded-md text-sm min-h-12 border border-light-grey/40 outline-none pl-3 pr-3 py-3 bg-transparent font-bold text-dark-blue"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 tracking-widest">
                    <label className="font-bold text-gray-500 pl-1 text-[10px] uppercase">Penalti (RM)</label>
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        readOnly
                        value={formatRM(data.profile.charges.penalti)}
                        className="w-full rounded-md text-sm min-h-12 border border-light-grey/40 outline-none pl-3 pr-3 py-3 bg-transparent font-bold text-red"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 tracking-widest">
                    <label className="font-bold text-gray-500 pl-1 text-[10px] uppercase">Tambahan (RM)</label>
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        readOnly
                        value={formatRM(data.profile.charges.tambahan)}
                        className="w-full rounded-md text-sm min-h-12 border border-light-grey/40 outline-none pl-3 pr-3 py-3 bg-transparent font-bold text-red"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 tracking-widest">
                    <label className="font-bold text-gray-500 pl-1 text-[10px] uppercase">Rebat (RM)</label>
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        readOnly
                        value={formatRM(data.profile.charges.rebat)}
                        className="w-full rounded-md text-sm min-h-12 border border-light-grey/40 outline-none pl-3 pr-3 py-3 bg-transparent font-bold text-green"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-6 bg-dark-blue rounded-xl p-6 flex justify-between items-center text-white shadow-lg">
                  <div>
                    <p className="text-[10px] font-bold text-blue-200 uppercase tracking-widest mb-1">Jumlah Tunggakan Terkumpul</p>
                    <h2 className="text-3xl font-bold">RM {formatRM(data.profile.charges.total)}</h2>
                  </div>
                  <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center">
                    <span className="text-2xl font-bold">!</span>
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* TAB 2: SEJARAH TUNGGAKAN */}
          {activeTab === "sejarah" && data?.history && (
            <div className={`transition-opacity duration-300 ${isLoading ? 'opacity-20' : 'opacity-100'}`}>
              <ButiranTunggakanHistory history={data.history} residentId={residentId} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
