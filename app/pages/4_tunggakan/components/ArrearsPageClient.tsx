"use client";

import { useState, useEffect } from "react";
import Icon from "../../../components/Icon";
import type { TunggakanListItem, TunggakanSummary } from "@/lib/arrears"; // Make sure this path is correct!
import KemasKiniModal from "./KemasKiniModal";
import ButiranTunggakanModal from "./ButiranTunggakanModal";

export default function TunggakanPageClient() {
  // --- STATE MANAGEMENT ---
  const [data, setData] = useState<TunggakanListItem[]>([]);
  const [summary, setSummary] = useState<TunggakanSummary>({ jumlahRekod: 0, jumlahTunggakan: 0 });
  const [isLoading, setIsLoading] = useState(true);
  
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isKemasKiniModalOpen, setIsKemasKiniModalOpen] = useState(false);
  const [viewResidentId, setViewResidentId] = useState<string | null>(null);

  // --- DATA FETCHING ---
  const fetchTunggakanData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/arrear");
      const result = await response.json();

      if (result.ok) {
        setData(result.data);
        setSummary(result.summary);
      } else {
        console.error("API Error:", result.message);
        // You could add a toast error notification here later
      }
    } catch (error) {
      console.error("Failed to fetch tunggakan data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Run the fetch function exactly once when the page loads
  useEffect(() => {
    fetchTunggakanData();
  }, []);

  // --- HANDLERS ---
  const formatRM = (value: number) => {
    return new Intl.NumberFormat("en-MY", {
      style: "currency",
      currency: "MYR",
      minimumFractionDigits: 2,
    }).format(value).replace("MYR", "RM");
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(data.map((row) => row.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((rowId) => rowId !== id) : [...prev, id]
    );
  };

  return (
    <div className="flex flex-col gap-8 pb-20 relative">
      {/* --- HEADER SECTION --- */}
      <div>
        <h1 className="text-3xl font-bold text-dark-blue mb-2">
          Tunggakan
        </h1>
        <p className="text-grey">
          Halaman ini memaparkan ringkasan dan perincian tunggakan sewa serta caj tambahan bagi setiap penghuni kuarters.
        </p>
      </div>

      {/* --- SUMMARY CARDS --- */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <p className="text-sm text-grey font-medium mb-2">Jumlah Rekod</p>
          <h2 className="text-3xl font-bold text-dark-blue mb-4">
            {isLoading ? "RM 0.00" : formatRM(summary.jumlahRekod)}
          </h2>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-dark-blue"></span>
            <span className="text-xs font-bold text-dark-blue tracking-wider">TERKINI</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <p className="text-sm text-grey font-medium mb-2">Jumlah Tunggakan</p>
          <h2 className="text-3xl font-bold text-dark-blue mb-4">
            {isLoading ? "RM 0.00" : formatRM(summary.jumlahTunggakan)}
          </h2>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-(--color-red)"></span>
            <span className="text-xs font-bold text-(--color-red) tracking-wider">PERLU DIKUMPUL</span>
          </div>
        </div>
      </div>

      {/* --- DATA TABLE SECTION --- */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Table Header Controls */}
        <div className="p-6 flex justify-between items-center bg-[#F8FAFC]">
          <div>
            <h3 className="text-lg font-bold text-dark-blue">Senarai Tunggakan</h3>
            <p className="text-sm text-grey mt-1">Klik pada ikon kemaskini untuk mengubah maklumat unit.</p>
          </div>
          <div className="flex gap-4">
            <button className="p-2 hover:bg-gray-200 rounded text-grey transition-colors">
              <Icon icon="download" size={20} />
            </button>
            <button className="p-2 hover:bg-gray-200 rounded text-grey transition-colors">
              <Icon icon="filter" size={20} />
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-light-blue text-grey text-xs uppercase font-semibold">
              <tr>
                <th className="px-6 py-4 w-12">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-gray-300 text-dark-blue focus:ring-dark-blue"
                    onChange={handleSelectAll}
                    checked={selectedIds.length === data.length && data.length > 0 && !isLoading}
                    disabled={isLoading || data.length === 0}
                  />
                </th>
                <th className="px-6 py-4">PENGHUNI</th>
                <th className="px-6 py-4">KUARTERS</th>
                <th className="px-6 py-4 text-right">SEWA (RM)</th>
                <th className="px-6 py-4 text-right">SENGGARA (RM)</th>
                <th className="px-6 py-4 text-right">PENALTI (RM)</th>
                <th className="px-6 py-4 text-right">TAMBAHAN (RM)</th>
                <th className="px-6 py-4 text-right">REBAT (RM)</th>
                <th className="px-6 py-4 text-right">TUNGGAKAN (RM)</th>
                <th className="px-6 py-4 text-center">TINDAKAN</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center text-grey">
                    <div className="flex flex-col items-center gap-2">
                      <Icon icon="search" size={32} className="animate-pulse text-light-grey" />
                      <span>Sedang memuatkan maklumat tunggakan...</span>
                    </div>
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center text-grey">
                    Tiada rekod tunggakan ditemui.
                  </td>
                </tr>
              ) : (
                data.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-gray-300 text-dark-blue focus:ring-dark-blue"
                        checked={selectedIds.includes(row.id)}
                        onChange={() => handleSelectRow(row.id)}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-dark-grey">{row.fullName}</div>
                      <div className="text-xs text-light-grey mt-1">{row.icNumber}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-dark-grey">{row.quarterClass}</div>
                      <div className="text-xs text-light-grey mt-1">{row.unitCode}</div>
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-dark-grey">
                      {row.sewa.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-dark-grey">
                      {row.senggara.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-dark-grey">
                      {row.penalti.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-dark-grey">
                      {row.tambahan.toFixed(2)}
                    </td>
                    <td className={`px-6 py-4 text-right font-bold ${row.rebat > 0 ? "text-(--color-green)" : "text-dark-grey"}`}>
                      {row.rebat.toFixed(2)}
                    </td>
                    <td className={`px-6 py-4 text-right font-bold ${row.jumlahTunggakan > 0 ? "text-(--color-red)" : "text-dark-grey"}`}>
                      {row.jumlahTunggakan.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button 
                        onClick={() => setViewResidentId(row.id)}
                        className="text-dark-blue hover:bg-blue-50 p-2 rounded-full transition-colors"
                      >
                        <Icon icon="eye" size={20} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 border-t border-gray-100 flex items-center justify-between text-sm text-grey">
          <div className="flex gap-1">
            <button className="px-3 py-1 border rounded hover:bg-gray-50">&lt;</button>
            <button className="px-3 py-1 border rounded bg-dark-blue text-white">1</button>
            <button className="px-3 py-1 border rounded hover:bg-gray-50">2</button>
            <button className="px-3 py-1 border rounded hover:bg-gray-50">3</button>
            <span className="px-3 py-1">...</span>
            <button className="px-3 py-1 border rounded hover:bg-gray-50">125</button>
            <button className="px-3 py-1 border rounded hover:bg-gray-50">&gt;</button>
          </div>
          <div>
            Menunjukkan <span className="font-bold">1-{Math.min(10, data.length)}</span> Daripada <span className="font-bold">{data.length}</span> Rekod
          </div>
        </div>
      </div>

      {/* --- FLOATING 'KEMAS KINI' BUTTON --- */}
      <div className={`fixed bottom-8 right-8 transition-opacity duration-200 ${selectedIds.length > 0 ? 'opacity-100 z-40' : 'opacity-0 pointer-events-none'}`}>
        <button 
          onClick={() => setIsKemasKiniModalOpen(true)}
          className="flex items-center gap-2 bg-dark-blue text-white px-6 py-3 rounded-lg shadow-lg font-bold hover:bg-opacity-90 transition-all"
        >
          <Icon icon="edit" size={20} />
          KEMAS KINI {selectedIds.length > 0 && `(${selectedIds.length})`}
        </button>
      </div>

      {/* --- KEMAS KINI MODAL --- */}
      <KemasKiniModal 
        isOpen={isKemasKiniModalOpen} 
        onClose={() => {
          setIsKemasKiniModalOpen(false);
          // Optional: You can call fetchTunggakanData() here so the table refreshes after they save!
        }} 
        selectedCount={selectedIds.length} 
      />

      {/* --- BUTIRAN TUNGGAKAN MODAL --- */}
      <ButiranTunggakanModal 
        isOpen={viewResidentId !== null} 
        onClose={() => setViewResidentId(null)} 
        residentId={viewResidentId} 
      />
    </div>
  );
}