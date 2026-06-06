"use client";

import { useState, useEffect } from "react";
import Icon, { commonIcons } from "@/app/components/Icon/Icon";
import { InputField, Topic } from "@/app/components/InputField";

interface TransaksiReverseModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: any;
  onSuccess: () => void;
}

export default function TransaksiReverseModal({ isOpen, onClose, transaction, onSuccess }: TransaksiReverseModalProps) {
  const [remarks, setRemarks] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen && transaction) {
      setRemarks(`${transaction.description} (Pembalikan)`);
      setError("");
    }
  }, [isOpen, transaction]);

  if (!isOpen || !transaction) return null;

  const isDebit = Number(transaction.debitAmount) > 0;
  const originalAmount = isDebit ? Number(transaction.debitAmount) : Number(transaction.creditAmount);

  const formatRM = (amount: number) => {
    return amount.toLocaleString("ms-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatIcNumber = (value?: string | null) => {
    if (!value) {
      return "Tiada";
    }

    const digits = value.replace(/\D/g, "");

    if (digits.length !== 12) {
      return value;
    }

    return `${digits.slice(0, 6)}-${digits.slice(6, 8)}-${digits.slice(8)}`;
  };

  const handleSubmit = async () => {
    if (!remarks.trim()) {
      setError("Sila masukkan catatan untuk pembalikan ini.");
      return;
    }
    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/transactions/reverse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ originalTxId: transaction.id, remarks }),
      });
      const result = await response.json();
      if (result.ok) {
        onSuccess();
        onClose();
      } else {
        setError(result.message);
      }
    } catch {
      setError("Ralat rangkaian. Sila cuba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed bottom-0 left-55 right-0 top-0 z-50 flex items-start justify-center bg-black/40 p-12 backdrop-blur-md lg:p-12">
      <div
        className="flex max-h-full w-full flex-col overflow-hidden rounded-lg bg-light-blue shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label="Pembalikan Transaksi"
      >
        
        {/* Header */}
        <div className="flex items-center justify-between bg-dark-blue p-6 text-white">
          <div>
            <h2 className="text-lg font-bold uppercase tracking-wide">PEMBALIKAN TRANSAKSI</h2>
            <p className="text-xs font-extralight text-light-grey">SILA KEMASKINI BUTIRAN PEMBALIKAN DI BAWAH</p>
          </div>
          <button onClick={onClose} className="text-white transition-colors hover:opacity-80">
            <Icon icon="close" size={20} />
          </button>
        </div>

        <div className="custom-scrollbar space-y-8 overflow-y-auto p-6">
          
          {/* Section 1: Maklumat Transaksi */}
          <div className="flex flex-col gap-4">
            <Topic content="MAKLUMAT TRANSAKSI" />
            
            <div className="grid grid-cols-2 gap-4">
              <InputField
                label="NAMA PENGHUNI"
                value={transaction.resident?.fullName || "Tiada"}
                state="inactive"
                inactiveBackgroundClass="bg-[#EEF4FF]"
              />
              <InputField
                label="NO. KAD PENGENALAN"
                value={formatIcNumber(transaction.resident?.icNumber)}
                state="inactive"
                inactiveBackgroundClass="bg-[#EEF4FF]"
              />
            </div>

            <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center">
              <InputField
                label={`${isDebit ? "DEBIT" : "KREDIT"} ASAL (RM)`}
                value={formatRM(originalAmount)}
                state="inactive"
                inputTextClassName={isDebit ? "text-red font-bold" : "text-green font-bold"}
                inactiveBackgroundClass="bg-[#EEF4FF]"
              />
              <Icon icon="arrow_forward" size={20} className="text-gray-400 mt-5" />
              <InputField
                label={`${isDebit ? "DEBIT" : "KREDIT"} BARU (RM)`}
                value="0.00"
                state="inactive"
                inputTextClassName={isDebit ? "text-red font-bold" : "text-green font-bold"}
                inactiveBackgroundClass="bg-[#EEF4FF]"
              />
            </div>

            <InputField
              label="CATATAN BARU"
              value={remarks}
              state="active"
              onChange={setRemarks}
              error={Boolean(error)}
              errorMessage={error}
              activeBackgroundClass="bg-white"
            />
          </div>

          {/* Section 2: Pratonton (Preview) */}
          <div className="flex flex-col gap-4">
            <Topic content="PRATONTON TRANSAKSI BERKAITAN" />
            
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
                  {/* Original Row */}
                  <tr className="border-b border-light-grey/20 text-sm transition-colors">
                    <td className="w-min whitespace-nowrap p-3 text-dark-grey">{new Date(transaction.transactionDate).toLocaleDateString("en-GB")}</td>
                    <td className="w-min whitespace-nowrap p-3 font-bold">{transaction.transactionNo}</td>
                    <td className="w-min whitespace-nowrap p-3"><span className="rounded-[5px] bg-red px-2 py-0.5 text-[10px] font-bold uppercase text-white">Dibalikkan</span></td>
                    <td className="max-w-80 truncate p-3 text-grey">{transaction.description || "-"}</td>
                    <td className={`w-min whitespace-nowrap p-3 text-right ${isDebit ? "font-bold text-red" : "font-normal"}`}>
                      {isDebit ? formatRM(originalAmount) : "-"}
                    </td>
                    <td className={`w-min whitespace-nowrap p-3 text-right ${!isDebit ? "font-bold text-green" : "font-normal"}`}>
                      {!isDebit ? formatRM(originalAmount) : "-"}
                    </td>
                  </tr>
                  {/* Balancing Row (Current / New Transaksi) */}
                  <tr className="border-b border-light-grey/20 text-sm transition-colors">
                    <td className="w-min whitespace-nowrap border-l-4 border-dark-blue p-3 text-dark-grey">Hari Ini</td>
                    <td className="w-min whitespace-nowrap p-3 italic text-light-grey">Diberikan Nanti</td>
                    <td className="w-min whitespace-nowrap p-3"><span className="rounded-[5px] bg-red px-2 py-0.5 text-[10px] font-bold uppercase text-white">Pembalikan</span></td>
                    <td className="max-w-80 truncate p-3 text-grey">{remarks || "-"}</td>
                    <td className={`w-min whitespace-nowrap p-3 text-right ${!isDebit ? "font-bold text-red" : "font-normal"}`}>
                      {!isDebit ? formatRM(originalAmount) : "-"}
                    </td>
                    <td className={`w-min whitespace-nowrap p-3 text-right ${isDebit ? "font-bold text-green" : "font-normal"}`}>
                      {isDebit ? formatRM(originalAmount) : "-"}
                    </td>
                  </tr>
                  {/* Summary Row */}
                  <tr className="border-b border-light-grey/20 bg-background text-sm font-bold">
                    <td colSpan={4} className="p-3 text-left text-dark-blue">JUMLAH</td>
                    <td className="p-3 text-right text-red">{formatRM(originalAmount)}</td>
                    <td className="p-3 text-right text-green">{formatRM(originalAmount)}</td>
                  </tr>
                </tbody>
              </table>
              <div className="flex items-center justify-between bg-dark-blue px-4 py-3 text-white">
                <span className="text-[10px] font-bold uppercase tracking-widest text-light-grey">Amaun Bersih</span>
                <span className="text-sm font-bold">RM 0.00</span>
              </div>
            </div>
          </div>

          <footer className="flex items-center justify-between">
            <div className="flex flex-row items-center justify-center gap-1 text-grey/80">
              <Icon icon="edit" size={13} />
              <div className="text-xs">
                {isSubmitting ? "Sedang memproses rekod ini..." : "Sedia untuk simpan pembalikan rekod..."}
              </div>
            </div>
            <div className="flex w-xs gap-3">
              <button
                onClick={onClose}
                disabled={isSubmitting}
                className="flex flex-1 items-center justify-center gap-1 whitespace-nowrap rounded-md bg-red px-5 py-3 text-xs font-bold text-white hover:bg-red/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Icon icon={commonIcons.close} size={16} />
                Batal
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex flex-1 items-center justify-center gap-1 whitespace-nowrap rounded-md bg-green px-5 py-3 text-xs font-bold text-white hover:bg-green/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Icon icon={commonIcons.save} size={16} />
                {isSubmitting ? "Sedang Simpan..." : "Simpan Rekod"}
              </button>
            </div>
          </footer>
        </div>

      </div>
    </div>
  );
}
