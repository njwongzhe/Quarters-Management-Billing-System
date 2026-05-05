"use client";

import { useState, useEffect } from "react";
import Icon from "../../../components/Icon";

type ButiranTunggakanModalProps = {
  isOpen: boolean;
  onClose: () => void;
  residentId: string | null;
};

// Define the shape of the data we expect from the API
type ProfileData = {
  fullName: string; icNumber: string; age: number; kelas: string;
  unit: string; tarikhMasuk: string; tarikhKeluar: string; status: string;
  charges: { sewa: number; senggara: number; penalti: number; tambahan: number; rebat: number; total: number; };
};

type HistoryData = {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-[#F8FAFC] rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
        
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
        <div className="flex bg-white px-8 pt-2">
          <button 
            onClick={() => setActiveTab("maklumat")} 
            className={`px-6 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${activeTab === "maklumat" ? "border-dark-blue text-dark-blue" : "border-transparent text-grey hover:text-dark-blue"}`}
          >
            Maklumat Tunggakan
          </button>
          <button 
            onClick={() => setActiveTab("sejarah")} 
            className={`px-6 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${activeTab === "sejarah" ? "border-dark-blue text-dark-blue" : "border-transparent text-grey hover:text-dark-blue"}`}
          >
            Sejarah Tunggakan
          </button>
        </div>

        {/* Body */}
        <div className="p-8 overflow-y-auto flex-1 bg-[#F8FAFC] relative">
          
          {/* LOADING STATE */}
          {isLoading && (
            <div className="absolute inset-0 z-10 bg-[#F8FAFC]/80 backdrop-blur-sm flex flex-col items-center justify-center text-dark-blue">
              <Icon icon="search" size={32} className="animate-pulse mb-3" />
              <p className="text-sm font-bold animate-pulse uppercase tracking-widest">Menarik Rekod Penghuni...</p>
            </div>
          )}

          {/* TAB 1: MAKLUMAT TUNGGAKAN */}
          {activeTab === "maklumat" && data?.profile && (
            <div className={`space-y-8 transition-opacity duration-300 ${isLoading ? 'opacity-20' : 'opacity-100'}`}>
              
              <section>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-1 h-4 bg-dark-blue rounded-full"></div>
                    <h3 className="font-bold text-dark-blue text-xs uppercase tracking-wider">Maklumat Penghuni</h3>
                  </div>
                  <button className="text-[10px] font-bold text-dark-blue flex items-center gap-1 hover:underline">
                    PROFIL PENUH <Icon icon="chevronRight" size={16} />
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-5 pl-4">
                  <div>
                    <label className="block text-[10px] font-bold text-grey uppercase tracking-wider mb-1.5">Nama Penghuni</label>
                    <input type="text" readOnly value={data.profile.fullName} className="w-full bg-white border border-gray-100 rounded-md p-2.5 text-sm font-medium text-dark-grey shadow-sm" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-grey uppercase tracking-wider mb-1.5">No. Kad Pengenalan</label>
                    <input type="text" readOnly value={data.profile.icNumber} className="w-full bg-white border border-gray-100 rounded-md p-2.5 text-sm font-medium text-dark-grey shadow-sm" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-grey uppercase tracking-wider mb-1.5">Umur</label>
                    <input type="text" readOnly value={data.profile.age || "-"} className="w-full bg-white border border-gray-100 rounded-md p-2.5 text-sm font-medium text-dark-grey shadow-sm" />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-grey uppercase tracking-wider mb-1.5">Kelas</label>
                    <div className="relative">
                      <input type="text" readOnly value={data.profile.kelas} className="w-full bg-white border border-gray-100 rounded-md p-2.5 text-sm font-medium text-dark-grey shadow-sm pr-8" />
                      <Icon icon="externalLink" size={16} className="absolute right-3 top-2.5 text-light-grey" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-grey uppercase tracking-wider mb-1.5">Unit Kuarters</label>
                    <div className="relative">
                      <input type="text" readOnly value={data.profile.unit} className="w-full bg-white border border-gray-100 rounded-md p-2.5 text-sm font-medium text-dark-grey shadow-sm pr-8" />
                      <Icon icon="externalLink" size={16} className="absolute right-3 top-2.5 text-light-grey" />
                    </div>
                  </div>
                  <div></div>

                  <div>
                    <label className="block text-[10px] font-bold text-grey uppercase tracking-wider mb-1.5">Tarikh Masuk</label>
                    <input type="text" readOnly value={data.profile.tarikhMasuk} className="w-full bg-white border border-gray-100 rounded-md p-2.5 text-sm font-medium text-dark-grey shadow-sm" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-grey uppercase tracking-wider mb-1.5">Tarikh Keluar</label>
                    <input type="text" readOnly value={data.profile.tarikhKeluar} className="w-full bg-white border border-gray-100 rounded-md p-2.5 text-sm font-medium text-light-grey shadow-sm" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-grey uppercase tracking-wider mb-1.5">Status Penghuni</label>
                    <input type="text" readOnly value={data.profile.status} className="w-full bg-white border border-gray-100 rounded-md p-2.5 text-sm font-bold text-(--color-green) shadow-sm" />
                  </div>
                </div>
              </section>

              <section>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-1 h-4 bg-dark-blue rounded-full"></div>
                  <h3 className="font-bold text-dark-blue text-xs uppercase tracking-wider">Maklumat Tunggakan</h3>
                </div>

                <div className="grid grid-cols-5 gap-4 pl-4">
                  <div>
                    <label className="block text-[10px] font-bold text-grey uppercase tracking-wider mb-1.5">Sewa (RM)</label>
                    <input type="text" readOnly value={formatRM(data.profile.charges.sewa)} className="w-full bg-white border border-gray-100 rounded-md p-2.5 text-sm font-bold text-(--color-red) shadow-sm" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-grey uppercase tracking-wider mb-1.5">Senggara (RM)</label>
                    <input type="text" readOnly value={formatRM(data.profile.charges.senggara)} className="w-full bg-white border border-gray-100 rounded-md p-2.5 text-sm font-medium text-dark-grey shadow-sm" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-grey uppercase tracking-wider mb-1.5">Penalti (RM)</label>
                    <input type="text" readOnly value={formatRM(data.profile.charges.penalti)} className="w-full bg-white border border-gray-100 rounded-md p-2.5 text-sm font-bold text-(--color-red) shadow-sm" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-grey uppercase tracking-wider mb-1.5">Tambahan (RM)</label>
                    <input type="text" readOnly value={formatRM(data.profile.charges.tambahan)} className="w-full bg-white border border-gray-100 rounded-md p-2.5 text-sm font-bold text-(--color-red) shadow-sm" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-grey uppercase tracking-wider mb-1.5">Rebat (RM)</label>
                    <input type="text" readOnly value={formatRM(data.profile.charges.rebat)} className="w-full bg-white border border-gray-100 rounded-md p-2.5 text-sm font-bold text-(--color-green) shadow-sm" />
                  </div>
                </div>

                <div className="mt-6 ml-4 bg-dark-blue rounded-xl p-6 flex justify-between items-center text-white shadow-lg">
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
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-1 h-4 bg-dark-blue rounded-full"></div>
                  <h3 className="font-bold text-dark-blue text-xs uppercase tracking-wider">Sejarah Tunggakan</h3>
                </div>
                <div className="flex gap-4">
                  <button className="text-grey hover:text-dark-blue transition-colors"><Icon icon="download" size={20} /></button>
                  <button className="text-grey hover:text-dark-blue transition-colors"><Icon icon="filter" size={20} /></button>
                </div>
              </div>

              <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[#F8FAFC] border-b border-gray-100 text-grey text-[10px] uppercase font-bold tracking-wider">
                    <tr>
                      <th className="px-6 py-4">Tarikh</th>
                      <th className="px-6 py-4">ID Transaksi</th>
                      <th className="px-6 py-4">Kategori</th>
                      <th className="px-6 py-4">Catatan</th>
                      <th className="px-6 py-4 text-right">Debit (RM)</th>
                      <th className="px-6 py-4 text-right">Kredit (RM)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.history.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-sm text-grey">Tiada rekod transaksi dijumpai.</td>
                      </tr>
                    ) : (
                      data.history.map((row, idx) => (
                        <tr key={idx} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 font-bold text-dark-grey">{row.tarikh}</td>
                          <td className="px-6 py-4 text-xs text-light-grey">{row.id}</td>
                          <td className="px-6 py-4 font-medium text-dark-grey">{row.kategori}</td>
                          <td className="px-6 py-4 text-dark-grey">{row.catatan}</td>
                          <td className={`px-6 py-4 text-right font-bold ${row.debit > 0 ? "text-(--color-red)" : "text-dark-grey"}`}>{formatRM(row.debit)}</td>
                          <td className={`px-6 py-4 text-right font-bold ${row.kredit > 0 ? "text-(--color-green)" : "text-dark-grey"}`}>{formatRM(row.kredit)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              
              {data.history.length > 0 && (
                <div className="pt-4 flex items-center justify-between text-xs text-grey">
                  <div className="flex gap-1">
                    <button className="px-3 py-1.5 border border-gray-200 rounded hover:bg-gray-50">&lt;</button>
                    <button className="px-3 py-1.5 border border-dark-blue rounded bg-dark-blue text-white">1</button>
                    <button className="px-3 py-1.5 border border-gray-200 rounded hover:bg-gray-50 bg-white">&gt;</button>
                  </div>
                  <div>Menunjukkan <span className="font-bold text-dark-grey">{data.history.length}</span> Rekod</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}