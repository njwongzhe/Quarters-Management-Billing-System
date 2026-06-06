"use client";

import Icon from "@/app/components/Icon/Icon";

interface TransaksiSummaryCardsProps {
  totalCount: number;
  totalDebit: number;
  totalCredit: number;
  isLoading: boolean;
}

export default function TransaksiSummaryCards({ totalCount, totalDebit, totalCredit, isLoading }: TransaksiSummaryCardsProps) {
  const formatRM = (amount: number) => {
    return new Intl.NumberFormat("ms-MY", {
      style: "currency",
      currency: "MYR",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <section className="grid gap-3 md:grid-cols-3">
      <article className="flex flex-col gap-1 rounded-lg border-l-4 border-l-dark-blue bg-white p-4 shadow">
        <p className="text-xs font-semibold text-grey/70">JUMLAH TRANSAKSI</p>
        <p className="text-3xl font-bold text-dark-grey">
          {isLoading ? "0" : totalCount.toLocaleString("ms-MY")}
        </p>
        <div className="flex items-center gap-1">
          <Icon icon="fact_check" size={16} className="text-dark-blue" />
          <p className="text-xs font-bold text-dark-blue">Terkini</p>
        </div>
      </article>

      <article className="flex flex-col gap-1 rounded-lg border-l-4 border-l-red bg-white p-4 shadow">
        <p className="text-xs font-semibold text-grey/70">AMAUN DEBIT</p>
        <p className="text-3xl font-bold text-dark-grey">
          {isLoading ? "RM 0.00" : formatRM(totalDebit).replace("RM", "RM")}
        </p>
        <div className="flex items-center gap-1">
          <Icon icon="trending_down" size={16} className="text-red" />
          <p className="text-xs font-bold text-red">Keluar</p>
        </div>
      </article>

      <article className="flex flex-col gap-1 rounded-lg border-l-4 border-l-green bg-white p-4 shadow">
        <p className="text-xs font-semibold text-grey/70">AMAUN KREDIT</p>
        <p className="text-3xl font-bold text-dark-grey">
          {isLoading ? "RM 0.00" : formatRM(totalCredit).replace("RM", "RM")}
        </p>
        <div className="flex items-center gap-1">
          <Icon icon="trending_up" size={16} className="text-green" />
          <p className="text-xs font-bold text-green">Masuk</p>
        </div>
      </article>
    </section>
  );
}