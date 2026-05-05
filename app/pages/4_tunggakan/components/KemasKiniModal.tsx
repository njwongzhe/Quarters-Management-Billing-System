"use client";

import { useState } from "react";
import Icon from "../../../components/Icon";

type RowItem = {
  id: string; // Unique ID for React rendering
  tarikh: string;
  catatan: string;
  amaun: string;
};

type KemasKiniModalProps = {
  isOpen: boolean;
  onClose: () => void;
  selectedCount: number;
};

export default function KemasKiniModal({ isOpen, onClose, selectedCount }: KemasKiniModalProps) {
  const [cajSenggaraEnabled, setCajSenggaraEnabled] = useState(false);
  const [cajTambahan, setCajTambahan] = useState<RowItem[]>([]);
  const [rebat, setRebat] = useState<RowItem[]>([]);

  if (!isOpen) return null;

  // --- HANDLERS ---
  const handleAddTambahan = () => {
    setCajTambahan([...cajTambahan, { id: crypto.randomUUID(), tarikh: "", catatan: "", amaun: "" }]);
  };

  const handleRemoveTambahan = (id: string) => {
    setCajTambahan(cajTambahan.filter(item => item.id !== id));
  };

  const handleAddRebat = () => {
    setRebat([...rebat, { id: crypto.randomUUID(), tarikh: "", catatan: "", amaun: "" }]);
  };

  const handleRemoveRebat = (id: string) => {
    setRebat(rebat.filter(item => item.id !== id));
  };

  const handleUpdateRow = (
    setState: React.Dispatch<React.SetStateAction<RowItem[]>>,
    id: string,
    field: keyof RowItem,
    value: string
  ) => {
    setState(prev => prev.map(item => (item.id === id ? { ...item, [field]: value } : item)));
  };

  const handleSave = async () => {
    try {
      const response = await fetch("/api/tunggakan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          residentIds: [], // <-- You will need to pass the actual selectedIds down as a prop to this Modal!
          cajSenggaraEnabled,
          cajTambahan,
          rebat
        }),
      });

      const data = await response.json();

      if (!data.ok) {
        alert(data.message); // You can replace this with a nice toast notification component later
        return;
      }

      alert(data.message); // Success!
      onClose(); // Close the modal
      
      // In a real app, you would now trigger a refresh of the main table data here.

    } catch (error) {
      alert("Ralat tidak dijangka berlaku. Sila cuba lagi.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      {/* Modal Container */}
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* --- MODAL HEADER --- */}
        <div className="bg-dark-blue px-8 py-6 flex justify-between items-start text-white">
          <div>
            <h2 className="text-xl font-bold uppercase tracking-wide">Kemas Kini Tunggakan</h2>
            <p className="text-xs font-semibold text-blue-200 mt-1 uppercase tracking-widest">
              Sedang Menyunting {selectedCount} Rekod
            </p>
          </div>
          <button onClick={onClose} className="hover:bg-white/10 p-1 rounded transition-colors">
            <Icon icon="close" size={24} />
          </button>
        </div>

        {/* --- MODAL BODY --- */}
        <div className="p-6 overflow-y-auto flex-1 space-y-10">
          
          {/* Perincian Kewangan */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-1 h-5 bg-dark-blue rounded-full"></div>
              <h3 className="font-bold text-dark-blue text-sm uppercase tracking-wider">Perincian Kewangan</h3>
            </div>
            <div className="flex items-center gap-4 pl-4">
              <button 
                type="button"
                onClick={() => setCajSenggaraEnabled(!cajSenggaraEnabled)}
                className={`w-12 h-6 rounded-full transition-colors relative ${cajSenggaraEnabled ? 'bg-dark-blue' : 'bg-gray-300'}`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${cajSenggaraEnabled ? 'left-7' : 'left-1'}`}></div>
              </button>
              <span className="text-sm font-bold text-dark-grey uppercase">Caj Penyelenggaraan</span>
            </div>
          </section>

          {/* Caj Tambahan */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-1 h-5 bg-dark-blue rounded-full"></div>
                <h3 className="font-bold text-dark-blue text-sm uppercase tracking-wider">Caj Tambahan</h3>
              </div>
              <button 
                onClick={handleAddTambahan}
                className="flex items-center gap-2 bg-light-blue text-dark-blue px-4 py-2 rounded font-bold text-xs uppercase hover:bg-blue-100 transition-colors"
              >
                <span>+</span> Tambah Caj Baru
              </button>
            </div>
            
            <div className="pl-4">
              {cajTambahan.length > 0 && (
                <div className="grid grid-cols-[1fr_2fr_1fr_auto] gap-4 mb-2 text-xs font-bold text-grey uppercase px-2">
                  <div>Tarikh</div>
                  <div>Catatan / Perincian</div>
                  <div>Amaun (RM)</div>
                  <div className="w-8"></div>
                </div>
              )}
              <div className="space-y-3">
                {cajTambahan.map((row) => (
                  <div key={row.id} className="grid grid-cols-[1fr_2fr_1fr_auto] gap-4 items-center bg-gray-50 p-2 rounded-lg border border-gray-100">
                    <input 
                      type="date" 
                      value={row.tarikh}
                      onChange={(e) => handleUpdateRow(setCajTambahan, row.id, "tarikh", e.target.value)}
                      className="border border-gray-300 rounded p-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-dark-blue"
                    />
                    <input 
                      type="text" 
                      placeholder="Contoh: Kerosakan Pintu Utama" 
                      value={row.catatan}
                      onChange={(e) => handleUpdateRow(setCajTambahan, row.id, "catatan", e.target.value)}
                      className="border border-gray-300 rounded p-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-dark-blue"
                    />
                    <input 
                      type="number" 
                      placeholder="0.00" 
                      value={row.amaun}
                      onChange={(e) => handleUpdateRow(setCajTambahan, row.id, "amaun", e.target.value)}
                      className="border border-gray-300 rounded p-2.5 text-sm text-right focus:outline-none focus:ring-1 focus:ring-dark-blue"
                    />
                    <button 
                      onClick={() => handleRemoveTambahan(row.id)}
                      className="text-(--color-red) hover:bg-red-50 p-2 rounded transition-colors"
                    >
                      <Icon icon="delete" size={20} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Rebat */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-1 h-5 bg-dark-blue rounded-full"></div>
                <h3 className="font-bold text-dark-blue text-sm uppercase tracking-wider">Rebat</h3>
              </div>
              <button 
                onClick={handleAddRebat}
                className="flex items-center gap-2 bg-light-blue text-dark-blue px-4 py-2 rounded font-bold text-xs uppercase hover:bg-blue-100 transition-colors"
              >
                <span>+</span> Tambah Rebat Baru
              </button>
            </div>

            <div className="pl-4">
              {rebat.length > 0 && (
                <div className="grid grid-cols-[1fr_2fr_1fr_auto] gap-4 mb-2 text-xs font-bold text-grey uppercase px-2">
                  <div>Tarikh</div>
                  <div>Catatan / Perincian</div>
                  <div>Amaun (RM)</div>
                  <div className="w-8"></div>
                </div>
              )}
              <div className="space-y-3">
                {rebat.map((row) => (
                  <div key={row.id} className="grid grid-cols-[1fr_2fr_1fr_auto] gap-4 items-center bg-gray-50 p-2 rounded-lg border border-gray-100">
                    <input 
                      type="date" 
                      value={row.tarikh}
                      onChange={(e) => handleUpdateRow(setRebat, row.id, "tarikh", e.target.value)}
                      className="border border-gray-300 rounded p-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-dark-blue"
                    />
                    <input 
                      type="text" 
                      placeholder="Contoh: Insentif Pembayaran Awal" 
                      value={row.catatan}
                      onChange={(e) => handleUpdateRow(setRebat, row.id, "catatan", e.target.value)}
                      className="border border-gray-300 rounded p-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-dark-blue"
                    />
                    <input 
                      type="number" 
                      placeholder="0.00" 
                      value={row.amaun}
                      onChange={(e) => handleUpdateRow(setRebat, row.id, "amaun", e.target.value)}
                      className="border border-gray-300 rounded p-2.5 text-sm text-right focus:outline-none focus:ring-1 focus:ring-dark-blue"
                    />
                    <button 
                      onClick={() => handleRemoveRebat(row.id)}
                      className="text-(--color-red) hover:bg-red-50 p-2 rounded transition-colors"
                    >
                      <Icon icon="delete" size={20} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </section>

        </div>

        {/* --- MODAL FOOTER --- */}
        <div className="bg-[#F8FAFC] border-t border-gray-200 px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2 text-grey text-sm">
            <Icon icon="edit" size={16} />
            <span>Sedang menyunting rekod ini...</span>
          </div>
          <div className="flex gap-4">
            <button 
              onClick={onClose}
              className="flex items-center gap-2 bg-(--color-red) hover:bg-red-800 text-white px-6 py-2.5 rounded shadow-sm font-bold transition-colors"
            >
              <Icon icon="close" size={20} />
              Batal
            </button>
            <button 
              onClick={handleSave}
              className="flex items-center gap-2 bg-(--color-green) hover:bg-green-800 text-white px-6 py-2.5 rounded shadow-sm font-bold transition-colors"
            >
              <Icon icon="save" size={20} />
              Simpan Rekod
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}