"use client";

import { useTransaksiViewRelatedFilter } from "./TransaksiViewRelatedFilter";
import TransaksiViewRelatedDownload from "./TransaksiViewRelatedDownload";

type RelatedRecord = {
  id: string;
  transactionNo?: string | null;
  transactionDate: string | Date;
  status: string;
  description?: string | null;
  debitAmount: number | string;
  creditAmount: number | string;
};

type TransaksiViewRelatedProps = {
  records: RelatedRecord[];
  transactionNo?: string | null;
};

function formatCurrency(value: number) {
  return value.toLocaleString("ms-MY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function TransaksiViewRelated({ records, transactionNo }: TransaksiViewRelatedProps) {
  const { filteredRecords, FilterButton } = useTransaksiViewRelatedFilter(records);

  const getStatusBadge = (status: string) => {
    const baseClass = "text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider text-center inline-block";
    const displayStatus = status === "DIBALIKAN" ? "DIBALIKKAN" : status;
    
    switch (status) {
      case "NORMAL":
        return <span className={`bg-normal text-[#0E7490] ${baseClass}`}>NORMAL</span>;
      case "DIBALIKAN":
      case "PEMBALIKAN":
        return <span className={`bg-[#DC2626] text-white ${baseClass}`}>{displayStatus}</span>;
      case "DILARASKAN":
      case "PELARASAN":
        return <span className={`bg-[#FEF3C7] text-[#92400E] ${baseClass}`}>{displayStatus}</span>;
      default:
        return <span className={`bg-gray-500 text-white ${baseClass}`}>{displayStatus}</span>;
    }
  };

  // Calculate sums
  const totalDebit = filteredRecords.reduce((sum, rec) => sum + Number(rec.debitAmount || 0), 0);
  const totalCredit = filteredRecords.reduce((sum, rec) => sum + Number(rec.creditAmount || 0), 0);
  const netAmount = Math.abs(totalDebit - totalCredit);

  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-200">
      {/* Header bar */}
      <div className="flex flex-row items-center justify-between">
        <span className="border-l-4 border-dark-blue pl-3 py-0.5 text-xs text-dark-blue font-bold tracking-widest">
          TRANSAKSI BERKAITAN
        </span>
        <div className="flex flex-row gap-4 items-center">
          {FilterButton}
          <TransaksiViewRelatedDownload records={filteredRecords} transactionNo={transactionNo} />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg overflow-hidden border border-light-grey/20 bg-white">
        <table className="w-full border-collapse">
          <thead>
            <tr className="font-bold text-xs text-grey bg-light-blue border-b border-light-grey/20">
              <th className="text-left px-4 py-3 uppercase tracking-wider">Tarikh</th>
              <th className="text-left px-4 py-3 uppercase tracking-wider">ID</th>
              <th className="text-left px-4 py-3 uppercase tracking-wider">Status</th>
              <th className="text-left px-4 py-3 uppercase tracking-wider">Catatan</th>
              <th className="text-right px-4 py-3 uppercase tracking-wider text-red">Debit (RM)</th>
              <th className="text-right px-4 py-3 uppercase tracking-wider text-green">Kredit (RM)</th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {filteredRecords.length === 0 ? (
              <tr className="text-sm">
                <td className="px-4 py-8 text-center text-grey" colSpan={6}>
                  Tiada rekod transaksi berkaitan dijumpai.
                </td>
              </tr>
            ) : (
              filteredRecords.map((row) => {
                const d = new Date(row.transactionDate);
                const formattedDate = isNaN(d.getTime())
                  ? String(row.transactionDate)
                  : d.toLocaleDateString("en-GB");
                
                const debitVal = Number(row.debitAmount || 0);
                const creditVal = Number(row.creditAmount || 0);

                return (
                  <tr key={row.id} className="text-sm border-b border-light-grey/20 transition-colors hover:bg-gray-50">
                    <td className="px-4 py-3 text-left text-slate-700">{formattedDate}</td>
                    <td className="px-4 py-3 text-left font-bold text-dark-blue">{row.transactionNo || row.id}</td>
                    <td className="px-4 py-3 text-left">{getStatusBadge(row.status)}</td>
                    <td className="px-4 py-3 text-left text-slate-600">{row.description || "-"}</td>
                    <td className={`px-4 py-3 text-right ${debitVal > 0 ? "font-bold text-[#BA1A1A]" : "text-slate-400"}`}>
                      {debitVal > 0 ? formatCurrency(debitVal) : "0.00"}
                    </td>
                    <td className={`px-4 py-3 text-right ${creditVal > 0 ? "font-bold text-[#15803D]" : "text-slate-400"}`}>
                      {creditVal > 0 ? formatCurrency(creditVal) : "0.00"}
                    </td>
                  </tr>
                );
              })
            )}
            
            {/* Total Row */}
            {filteredRecords.length > 0 && (
              <tr className="text-sm font-bold bg-[#F9FBFF] border-b border-light-grey/20">
                <td className="px-4 py-3 text-left text-dark-blue" colSpan={4}>
                  JUMLAH
                </td>
                <td className="px-4 py-3 text-right text-[#BA1A1A]">
                  {formatCurrency(totalDebit)}
                </td>
                <td className="px-4 py-3 text-right text-[#15803D]">
                  {formatCurrency(totalCredit)}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Clean Footer Amaun Bersih Bar */}
        <div className="bg-dark-blue px-6 py-4 flex justify-between items-center text-white">
          <span className="text-[10px] font-bold tracking-widest uppercase text-slate-300">
            Amaun Bersih
          </span>
          <span className="text-sm font-mono font-bold">
            RM {formatCurrency(netAmount)}
          </span>
        </div>
      </div>
    </div>
  );
}
