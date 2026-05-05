"use client";

import { useState } from "react";
import Icon from "../../../components/Icon";
import type { TunggakanListItem, TunggakanSummary } from "@/lib/arrears";
import KemasKiniModal from "./KemasKiniModal";
import ButiranTunggakanModal from "./ButiranTunggakanModal";

// --- MOCK DATA (Matches your Figma Screenshot exactly) ---
const mockSummary: TunggakanSummary = {
  jumlahRekod: 24500.0,
  jumlahTunggakan: 1200.0,
};

const mockData: TunggakanListItem[] = [
  { id: "1", fullName: "Ahmad Ali bin Razak", icNumber: "858412-01-5543", quarterClass: "PPR Kempas", unitCode: "Blok B-04-12", sewa: 150.0, senggara: 0.0, penalti: 0.0, tambahan: 0.0, rebat: 0.0, jumlahTunggakan: 0.0 },
  { id: "2", fullName: "Siti Aminah binti Kassim", icNumber: "920101-01-6622", quarterClass: "Kuarters Desa Bakti", unitCode: "Blok C-10-05", sewa: 150.0, senggara: 0.0, penalti: 0.0, tambahan: 0.0, rebat: 0.0, jumlahTunggakan: 150.0 },
  { id: "3", fullName: "Tan Ah Kow", icNumber: "780514-01-3311", quarterClass: "Flat Larkin", unitCode: "Blok A-02-01", sewa: 150.0, senggara: 100.0, penalti: 50.0, tambahan: 0.0, rebat: 50.0, jumlahTunggakan: 300.0 },
  { id: "4", fullName: "Ramasamy a/l Muniandy", icNumber: "661028-01-9987", quarterClass: "Kuarters Uda Utama", unitCode: "Blok D-01-15", sewa: 150.0, senggara: 250.0, penalti: 50.0, tambahan: 50.0, rebat: 0.0, jumlahTunggakan: 450.0 },
];

export default function TunggakanPageClient() {
  // HOOKS MUST BE INSIDE THE COMPONENT
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewResidentId, setViewResidentId] = useState<string | null>(null);

  // Helper to format currency accurately to RM
  const formatRM = (value: number) => {
    return new Intl.NumberFormat("en-MY", {
      style: "currency",
      currency: "MYR",
      minimumFractionDigits: 2,
    }).format(value).replace("MYR", "RM");
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(mockData.map((row) => row.id));
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
            {formatRM(mockSummary.jumlahRekod)}
          </h2>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-dark-blue"></span>
            <span className="text-xs font-bold text-dark-blue tracking-wider">TERKINI</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <p className="text-sm text-grey font-medium mb-2">Jumlah Tunggakan</p>
          <h2 className="text-3xl font-bold text-dark-blue mb-4">
            {formatRM(mockSummary.jumlahTunggakan)}
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
            <button className="p-2 hover:bg-gray-200 rounded text-grey">
              <Icon icon="download" size={20} />
            </button>
            <button className="p-2 hover:bg-gray-200 rounded text-grey">
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
                    checked={selectedIds.length === mockData.length && mockData.length > 0}
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
              {mockData.map((row) => (
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
              ))}
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
            Menunjukkan <span className="font-bold">1-10</span> Daripada <span className="font-bold">1,248</span> Rekod
          </div>
        </div>
      </div>

      {/* --- FLOATING 'KEMAS KINI' BUTTON (Active when rows are selected) --- */}
      <div className={`fixed bottom-8 right-8 transition-opacity duration-200 ${selectedIds.length > 0 ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-dark-blue text-white px-6 py-3 rounded-lg shadow-lg font-bold hover:bg-opacity-90 transition-all"
        >
          <Icon icon="edit" size={20} />
          KEMAS KINI {selectedIds.length > 0 && `(${selectedIds.length})`}
        </button>
      </div>

      {/* --- KEMAS KINI MODAL --- */}
      <KemasKiniModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        selectedCount={selectedIds.length} 
      />
      
      <ButiranTunggakanModal
        isOpen={viewResidentId !== null}
        onClose={() => setViewResidentId(null)}
        residentId={viewResidentId}
      />
    </div>
  );
}