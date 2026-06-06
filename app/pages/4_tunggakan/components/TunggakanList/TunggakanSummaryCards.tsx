"use client";

import Icon from "@/app/components/Icon";
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
    <section className="grid gap-3 md:grid-cols-3">
      <article className="flex flex-col gap-1 rounded-lg border-l-4 border-l-dark-blue bg-white p-4 shadow">
        <p className="text-xs font-semibold text-grey/70">JUMLAH REKOD</p>
        <p className="text-3xl font-bold text-dark-grey">
          {isLoading ? "0" : summary.jumlahRekod}
        </p>
        <div className="flex items-center gap-1">
          <Icon icon="fact_check" size={16} className="text-dark-blue" />
          <p className="text-xs font-bold text-dark-blue">Terkini</p>
        </div>
      </article>

      <article className="flex flex-col gap-1 rounded-lg border-l-4 border-l-green bg-white p-4 shadow">
        <p className="text-xs font-semibold text-grey/70">JUMLAH KUTIPAN</p>
        <p className="text-3xl font-bold text-dark-grey">
          {isLoading ? "RM 0.00" : formatRM(summary.jumlahKutipan)}
        </p>
        <div className="flex items-center gap-1">
          <Icon icon="trending_up" size={16} className="text-green" />
          <p className="text-xs font-bold text-green">Sudah Dikutip</p>
        </div>
      </article>

      <article className="flex flex-col gap-1 rounded-lg border-l-4 border-l-red bg-white p-4 shadow">
        <p className="text-xs font-semibold text-grey/70">JUMLAH TUNGGAKAN</p>
        <p className="text-3xl font-bold text-dark-grey">
          {isLoading ? "RM 0.00" : formatRM(summary.jumlahTunggakan)}
        </p>
        <div className="flex items-center gap-1">
          <Icon icon="trending_down" size={16} className="text-red" />
          <p className="text-xs font-bold text-red">Perlu Dikutip</p>
        </div>
      </article>
    </section>
  );
}
