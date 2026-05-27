"use client";

import type { TunggakanSummary } from "@/lib/arrears/arrears";

type TunggakanSummaryCardsProps = {
  isLoading: boolean;
  summary: TunggakanSummary;
  formatRM: (value: number) => string;
};

export default function TunggakanSummaryCards({
  isLoading,
  summary,
  formatRM,
}: TunggakanSummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <p className="text-sm text-grey font-medium mb-2">Jumlah Rekod</p>
        <h2 className="text-3xl font-bold mb-4">
          {isLoading ? "RM 0.00" : formatRM(summary.jumlahRekod)}
        </h2>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-dark-blue"></span>
          <span className="text-xs font-bold text-dark-blue tracking-wider">TERKINI</span>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <p className="text-sm text-grey font-medium mb-2">Jumlah Tunggakan</p>
        <h2 className="text-3xl font-bold mb-4">
          {isLoading ? "RM 0.00" : formatRM(summary.jumlahTunggakan)}
        </h2>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red"></span>
          <span className="text-xs font-bold text-red tracking-wider">PERLU DIKUMPUL</span>
        </div>
      </div>
    </div>
  );
}
