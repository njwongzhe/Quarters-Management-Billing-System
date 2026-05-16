"use client";

interface TransaksiSummaryCardsProps {
  totalCount: number;
  totalDebit: number;
  totalCredit: number;
  isLoading: boolean;
}

export default function TransaksiSummaryCards({ totalCount, totalDebit, totalCredit, isLoading }: TransaksiSummaryCardsProps) {
  
  // Formatter for RM currency
  const formatRM = (amount: number) => {
    return new Intl.NumberFormat("ms-MY", {
      style: "currency",
      currency: "MYR",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  if (isLoading) {
    return <div className="h-32 bg-gray-100 animate-pulse rounded-xl mb-8"></div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {/* Card 1: Jumlah Transaksi */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-center">
        <p className="text-sm font-semibold text-gray-500 mb-2 uppercase tracking-wider">Jumlah Transaksi</p>
        <h2 className="text-4xl font-bold text-dark-blue">{totalCount.toLocaleString()}</h2>
        <div className="flex items-center gap-2 mt-3">
          <div className="w-2 h-2 rounded-full bg-dark-blue"></div>
          <span className="text-xs font-bold text-dark-blue uppercase tracking-widest">Terkini</span>
        </div>
      </div>

      {/* Card 2: Amaun Debit (Keluar) */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-center">
        <p className="text-sm font-semibold text-gray-500 mb-2 uppercase tracking-wider">Amaun Debit (RM)</p>
        <h2 className="text-4xl font-bold text-dark-blue">{formatRM(totalDebit).replace('RM', 'RM ')}</h2>
        <div className="flex items-center gap-2 mt-3">
          <div className="w-2 h-2 rounded-full bg-(--color-red)"></div>
          <span className="text-xs font-bold text-(--color-red) uppercase tracking-widest">Keluar</span>
        </div>
      </div>

      {/* Card 3: Amaun Kredit (Masuk) */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-center">
        <p className="text-sm font-semibold text-gray-500 mb-2 uppercase tracking-wider">Amaun Kredit (RM)</p>
        <h2 className="text-4xl font-bold text-dark-blue">{formatRM(totalCredit).replace('RM', 'RM ')}</h2>
        <div className="flex items-center gap-2 mt-3">
          <div className="w-2 h-2 rounded-full bg-(--color-green)"></div>
          <span className="text-xs font-bold text-(--color-green) uppercase tracking-widest">Masuk</span>
        </div>
      </div>
    </div>
  );
}