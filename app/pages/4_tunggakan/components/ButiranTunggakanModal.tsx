"use client";

import { useState } from "react";
import Icon from "../../../components/Icon";

type ButiranTunggakanModalProps = {
  isOpen: boolean;
  onClose: () => void;
  residentId: string | null;
};

// --- MOCK DATA (Matches Figma Images 3 & 4) ---
const mockProfile = {
  fullName: "Ahmad Zaki Bin Rahim",
  icNumber: "850214-01-5543",
  age: 39,
  kelas: "Kelas C",
  unit: "Blok B-04-12",
  tarikhMasuk: "15/06/2021",
  tarikhKeluar: "N/A",
  status: "Aktif",
  charges: {
    sewa: 400.0,
    senggara: 0.0,
    penalti: 20.0,
    tambahan: 25.0,
    rebat: 150.0,
    total: 1240.0,
  }
};

const mockHistory = [
  { tarikh: "30/04/2026", id: "30042026-44222211", kategori: "Caj Sewa", catatan: "Tunggakan Sewa", debit: 1120.0, kredit: 0.0 },
  { tarikh: "25/03/2026", id: "25032026-11223344", kategori: "Caj Penyelenggaraan", catatan: "Kos Perapian Taman", debit: 150.0, kredit: 0.0 },
  { tarikh: "25/03/2026", id: "25032026-11223345", kategori: "Caj Penalti", catatan: "Denda Lewat Mac", debit: 450.0, kredit: 0.0 },
  { tarikh: "15/03/2026", id: "15032026-99887766", kategori: "Caj Tambahan", catatan: "Kunci Pendua", debit: 50.0, kredit: 0.0 },
  { tarikh: "10/03/2026", id: "10032026-55443322", kategori: "Rebat", catatan: "Rebat Kesetiaan", debit: 0.0, kredit: 100.0 },
];

export default function ButiranTunggakanModal({ isOpen, onClose, residentId }: ButiranTunggakanModalProps) {
  const [activeTab, setActiveTab] = useState<"maklumat" | "sejarah">("maklumat");

  if (!isOpen) return null;

  const formatRM = (value: number) => value.toFixed(2);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* --- MODAL HEADER --- */}
        <div className="bg-dark-blue px-8 py-6 flex justify-between items-start text-white">
          <div>
            <h2 className="text-xl font-bold uppercase tracking-wide">Butiran Tunggakan</h2>
            <p className="text-xs font-semibold text-blue-200 mt-1 uppercase tracking-widest">
              Maklumat Terperinci Pembayaran & Baki
            </p>
          </div>
          <button onClick={onClose} className="hover:bg-white/10 p-1 rounded transition-colors">
            <Icon icon="close" size={24} />
          </button>
        </div>

        {/* --- TABS --- */}
        <div className="flex border-b border-gray-200 px-8 pt-4">
          <button 
            onClick={() => setActiveTab("maklumat")}
            className={`px-8 py-3 text-sm font-bold uppercase tracking-wider border-b-2 transition-colors ${
              activeTab === "maklumat" ? "border-dark-blue text-dark-blue" : "border-transparent text-grey hover:text-dark-blue"
            }`}
          >
            Maklumat Tunggakan
          </button>
          <button 
            onClick={() => setActiveTab("sejarah")}
            className={`px-8 py-3 text-sm font-bold uppercase tracking-wider border-b-2 transition-colors ${
              activeTab === "sejarah" ? "border-dark-blue text-dark-blue" : "border-transparent text-grey hover:text-dark-blue"
            }`}
          >
            Sejarah Tunggakan
          </button>
        </div>

        {/* --- MODAL BODY --- */}
        <div className="p-8 overflow-y-auto flex-1">
          
          {/* TAB 1: MAKLUMAT TUNGGAKAN */}
          {activeTab === "maklumat" && (
            <div className="space-y-8">
              
              {/* Maklumat Penghuni Section */}
              <section>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-1 h-5 bg-dark-blue rounded-full"></div>
                    <h3 className="font-bold text-dark-blue text-sm uppercase tracking-wider">Maklumat Penghuni</h3>
                  </div>
                  <button className="text-xs font-bold text-dark-blue flex items-center gap-1 hover:underline">
                    PROFIL PENUH <Icon icon="chevronRight" size={16} />
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-4 pl-4">
                  <div>
                    <label className="block text-xs font-bold text-grey uppercase mb-1.5">Nama Penghuni</label>
                    <input type="text" readOnly value={mockProfile.fullName} className="w-full bg-gray-50 border border-gray-200 rounded p-2.5 text-sm font-medium text-dark-grey" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-grey uppercase mb-1.5">No. Kad Pengenalan</label>
                    <input type="text" readOnly value={mockProfile.icNumber} className="w-full bg-gray-50 border border-gray-200 rounded p-2.5 text-sm font-medium text-dark-grey" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-grey uppercase mb-1.5">Umur</label>
                    <input type="text" readOnly value={mockProfile.age} className="w-full bg-gray-50 border border-gray-200 rounded p-2.5 text-sm font-medium text-dark-grey" />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-grey uppercase mb-1.5">Kelas</label>
                    <div className="relative">
                      <input type="text" readOnly value={mockProfile.kelas} className="w-full bg-gray-50 border border-gray-200 rounded p-2.5 text-sm font-medium text-dark-grey pr-8" />
                      <Icon icon="externalLink" size={16} className="absolute right-3 top-3 text-light-grey" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-grey uppercase mb-1.5">Unit Kuarters</label>
                    <div className="relative">
                      <input type="text" readOnly value={mockProfile.unit} className="w-full bg-gray-50 border border-gray-200 rounded p-2.5 text-sm font-medium text-dark-grey pr-8" />
                      <Icon icon="externalLink" size={16} className="absolute right-3 top-3 text-light-grey" />
                    </div>
                  </div>
                  <div></div> {/* Empty column for spacing */}

                  <div>
                    <label className="block text-xs font-bold text-grey uppercase mb-1.5">Tarikh Masuk</label>
                    <input type="text" readOnly value={mockProfile.tarikhMasuk} className="w-full bg-gray-50 border border-gray-200 rounded p-2.5 text-sm font-medium text-dark-grey" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-grey uppercase mb-1.5">Tarikh Keluar</label>
                    <input type="text" readOnly value={mockProfile.tarikhKeluar} className="w-full bg-gray-50 border border-gray-200 rounded p-2.5 text-sm font-medium text-light-grey" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-grey uppercase mb-1.5">Status Penghuni</label>
                    <input type="text" readOnly value={mockProfile.status} className="w-full bg-gray-50 border border-gray-200 rounded p-2.5 text-sm font-bold text-(--color-green)" />
                  </div>
                </div>
              </section>

              {/* Maklumat Tunggakan Section */}
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-1 h-5 bg-dark-blue rounded-full"></div>
                  <h3 className="font-bold text-dark-blue text-sm uppercase tracking-wider">Maklumat Tunggakan</h3>
                </div>

                <div className="grid grid-cols-5 gap-4 pl-4">
                  <div>
                    <label className="block text-xs font-bold text-grey uppercase mb-1.5">Sewa (RM)</label>
                    <input type="text" readOnly value={formatRM(mockProfile.charges.sewa)} className="w-full bg-gray-50 border border-gray-200 rounded p-2.5 text-sm font-bold text-(--color-red)" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-grey uppercase mb-1.5">Senggara (RM)</label>
                    <input type="text" readOnly value={formatRM(mockProfile.charges.senggara)} className="w-full bg-gray-50 border border-gray-200 rounded p-2.5 text-sm font-medium text-dark-grey" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-grey uppercase mb-1.5">Penalti (RM)</label>
                    <input type="text" readOnly value={formatRM(mockProfile.charges.penalti)} className="w-full bg-gray-50 border border-gray-200 rounded p-2.5 text-sm font-bold text-(--color-red)" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-grey uppercase mb-1.5">Tambahan (RM)</label>
                    <input type="text" readOnly value={formatRM(mockProfile.charges.tambahan)} className="w-full bg-gray-50 border border-gray-200 rounded p-2.5 text-sm font-bold text-(--color-red)" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-grey uppercase mb-1.5">Rebat (RM)</label>
                    <input type="text" readOnly value={formatRM(mockProfile.charges.rebat)} className="w-full bg-gray-50 border border-gray-200 rounded p-2.5 text-sm font-bold text-(--color-green)" />
                  </div>
                </div>

                {/* Warning Total Box */}
                <div className="mt-6 ml-4 bg-dark-blue rounded-xl p-6 flex justify-between items-center text-white shadow-lg">
                  <div>
                    <p className="text-xs font-bold text-blue-200 uppercase tracking-widest mb-1">Jumlah Tunggakan Terkumpul</p>
                    <h2 className="text-4xl font-bold">RM {formatRM(mockProfile.charges.total)}</h2>
                  </div>
                  <div className="w-12 h-12 rounded bg-white/10 flex items-center justify-center">
                    <span className="text-3xl font-bold">!</span>
                  </div>
                </div>
              </section>

            </div>
          )}

          {/* TAB 2: SEJARAH TUNGGAKAN */}
          {activeTab === "sejarah" && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-1 h-5 bg-dark-blue rounded-full"></div>
                  <h3 className="font-bold text-dark-blue text-sm uppercase tracking-wider">Sejarah Tunggakan</h3>
                </div>
                <div className="flex gap-4">
                  <button className="text-grey hover:text-dark-blue transition-colors">
                    <Icon icon="download" size={20} />
                  </button>
                  <button className="text-grey hover:text-dark-blue transition-colors">
                    <Icon icon="filter" size={20} />
                  </button>
                </div>
              </div>

              <div className="border border-gray-100 rounded-lg overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-grey text-xs uppercase font-semibold">
                    <tr>
                      <th className="px-6 py-4">Tarikh</th>
                      <th className="px-6 py-4">ID</th>
                      <th className="px-6 py-4">Kategori</th>
                      <th className="px-6 py-4">Catatan</th>
                      <th className="px-6 py-4 text-right">Debit (RM)</th>
                      <th className="px-6 py-4 text-right">Kredit (RM)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {mockHistory.map((row, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-6 py-4 font-medium text-dark-grey">{row.tarikh}</td>
                        <td className="px-6 py-4 text-xs text-light-grey">{row.id}</td>
                        <td className="px-6 py-4 text-dark-grey">{row.kategori}</td>
                        <td className="px-6 py-4 text-dark-grey">{row.catatan}</td>
                        <td className={`px-6 py-4 text-right font-bold ${row.debit > 0 ? "text-(--color-red)" : "text-dark-grey"}`}>
                          {formatRM(row.debit)}
                        </td>
                        <td className={`px-6 py-4 text-right font-bold ${row.kredit > 0 ? "text-(--color-green)" : "text-dark-grey"}`}>
                          {formatRM(row.kredit)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination */}
              <div className="pt-4 flex items-center justify-between text-sm text-grey">
                <div className="flex gap-1">
                  <button className="px-3 py-1 border rounded hover:bg-gray-50">&lt;</button>
                  <button className="px-3 py-1 border rounded bg-dark-blue text-white">1</button>
                  <button className="px-3 py-1 border rounded hover:bg-gray-50">2</button>
                  <span className="px-3 py-1">...</span>
                  <button className="px-3 py-1 border rounded hover:bg-gray-50">129</button>
                  <button className="px-3 py-1 border rounded hover:bg-gray-50">&gt;</button>
                </div>
                <div>
                  Menunjukkan <span className="font-bold">1-5</span> Daripada <span className="font-bold">5</span> Rekod
                </div>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}