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

  const formatShortTransactionId = (value?: string | null) => {
    if (!value) {
      return "N/A";
    }

    return value.includes("-") ? `${value.split("-")[0]}...` : value;
  };

  const formatDisplayDate = (value: string | Date | null | undefined) => {
    if (!value) {
      return "N/A";
    }

    const parsedDate = new Date(value);
    if (Number.isNaN(parsedDate.getTime())) {
      return "N/A";
    }

    return parsedDate.toLocaleDateString("en-GB");
  };

  const formatStatusLabel = (status: string | null | undefined) => {
    const normalizedStatus = status?.trim().toUpperCase();
    if (!normalizedStatus) {
      return "N/A";
    }

    return normalizedStatus === "DIBALIKAN" ? "DIBALIKKAN" : normalizedStatus;
  };

  const getStatusBadge = (status: string | null | undefined) => {
    const baseClass = "rounded-[5px] px-2 py-0.5 text-[10px] font-bold uppercase";
    const displayStatus = formatStatusLabel(status);
    
    switch (displayStatus) {
      case "NORMAL":
        return <span className={`bg-normal text-[#0E7490] ${baseClass}`}>Normal</span>;
      case "DIBALIKAN":
        return <span className={`bg-red text-white ${baseClass}`}>Dibalikkan</span>;
      case "DILARASKAN":
        return <span className={`bg-[#FEF3C7] text-[#92400E] ${baseClass}`}>Dilaraskan</span>;
      case "PEMBALIKAN":
        return <span className={`bg-red text-white ${baseClass}`}>Pembalikan</span>;
      case "PELARASAN":
        return <span className={`bg-[#FEF3C7] text-[#92400E] ${baseClass}`}>Pelarasan</span>;
      default:
        return <span className={`bg-light-blue text-grey ${baseClass}`}>{displayStatus}</span>;
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
      <div className="overflow-x-auto overflow-y-auto rounded-lg border border-light-grey/20 bg-white">
        <table className="w-full min-w-220 text-left">
          <thead className="bg-background text-xs font-bold text-grey">
            <tr>
              <th className="w-min whitespace-nowrap p-3 text-left">Tarikh</th>
              <th className="w-min whitespace-nowrap p-3 text-left">ID Transaksi</th>
              <th className="w-min whitespace-nowrap p-3 text-left">Status</th>
              <th className="w-full p-3 text-left">Catatan</th>
              <th className="w-min whitespace-nowrap p-3 text-right">Debit (RM)</th>
              <th className="w-min whitespace-nowrap p-3 text-right">Kredit (RM)</th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {filteredRecords.length === 0 ? (
              <tr className="border-b border-light-grey/20 text-sm">
                <td className="p-4 text-center font-medium text-grey" colSpan={6}>
                  Tiada rekod transaksi berkaitan dijumpai.
                </td>
              </tr>
            ) : (
              filteredRecords.map((row) => {
                const formattedDate = formatDisplayDate(row.transactionDate);
                
                const debitVal = Number(row.debitAmount || 0);
                const creditVal = Number(row.creditAmount || 0);

                const isCurrentRecord = Boolean(transactionNo && row.transactionNo === transactionNo);

                return (
                  <tr key={row.id} className="border-b border-light-grey/20 text-sm transition-colors">
                    <td className={`w-min whitespace-nowrap p-3 text-dark-grey ${
                      isCurrentRecord 
                        ? "border-l-4 border-dark-blue" // Highlight untuk rekod semasa
                        : null
                    }`}>
                      {formattedDate}
                    </td>

                    <td className="w-min whitespace-nowrap p-3 font-bold">
                      {row.transactionNo || formatShortTransactionId(row.id)}
                    </td>
                    <td className="w-min whitespace-nowrap p-3">{getStatusBadge(row.status)}</td>
                    <td className="max-w-80 truncate p-3 text-grey" title={row.description ?? undefined}>
                      {row.description?.trim() || "-"}
                    </td>
                    <td className={`w-min whitespace-nowrap p-3 text-right ${debitVal > 0 ? "font-bold text-red" : "font-normal"}`}>
                      {debitVal > 0 ? formatCurrency(debitVal) : "-"}
                    </td>
                    <td className={`w-min whitespace-nowrap p-3 text-right ${creditVal > 0 ? "font-bold text-green" : "font-normal"}`}>
                      {creditVal > 0 ? formatCurrency(creditVal) : "-"}
                    </td>
                  </tr>
                );
              })
            )}
            
            {/* Total Row */}
            {filteredRecords.length > 0 && (
              <tr className="border-b border-light-grey/20 bg-background text-sm font-bold">
                <td className="p-3 text-left text-dark-blue" colSpan={4}>
                  JUMLAH
                </td>
                <td className="p-3 text-right text-red">
                  {formatCurrency(totalDebit)}
                </td>
                <td className="p-3 text-right text-green">
                  {formatCurrency(totalCredit)}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Footer Amaun Bersih */}
        <div className="flex items-center justify-between bg-dark-blue px-4 py-3 text-white">
          <span className="text-[10px] font-bold uppercase tracking-widest text-light-grey">
            Amaun Bersih
          </span>
          <span className="text-sm font-bold">
            RM {formatCurrency(netAmount)}
          </span>
        </div>
      </div>
    </div>
  );
}