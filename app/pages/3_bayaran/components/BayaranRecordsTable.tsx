"use client";

import { useRef, useState } from "react";
import { PatternFormat } from "react-number-format";

import Calender from "@/app/components/Calender/Calender";
import Icon from "@/app/components/Icon/Icon";
import { loadingTableRows } from "@/app/components/Loading/LoadingTableRows";
import { rowBorder, rowText } from "@/lib/payments/bayaran-helpers";
import type { BayaranRow } from "@/lib/payments/bayaran-types";
import BayaranRowActions from "./BayaranRowActions";

// Text size constants for table display.
const mainTextSize = "text-[12px]";
const subTextSize = "text-[11px]";

export default function BayaranRecordsTable({
  errorMessage = "",
  isLoading = false,
  loadingColumnCount = 5,
  loadingRowCount = 1,
  onAddPayment,
  onNextPaymentMonth,
  onPaymentMonthSelect,
  onPreviousPaymentMonth,
  onViewPayment,
  paymentMonthKey,
  paymentMonthLabel,
  canGoNextPaymentMonth = true,
  rows,
}: {
  canGoNextPaymentMonth?: boolean;
  errorMessage?: string;
  isLoading?: boolean;
  loadingColumnCount?: number;
  loadingRowCount?: number;
  onAddPayment: (paymentId: string) => void;
  onNextPaymentMonth: () => void;
  onPaymentMonthSelect: (monthKey: string) => void;
  onPreviousPaymentMonth: () => void;
  onViewPayment: (paymentId: string) => void;
  paymentMonthKey: string;
  paymentMonthLabel: string;
  rows: BayaranRow[];
}) {
  // Month picker state for selecting payment month directly from the table header row.
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const monthPickerRef = useRef<HTMLDivElement | null>(null);
  const normalizedLoadingRowCount = Math.max(1, Math.floor(loadingRowCount));
  const normalizedLoadingColumnCount = Math.max(
    1,
    Math.floor(loadingColumnCount),
  );

  return (
    <div className="overflow-x-auto overflow-y-auto">
      <table className="w-full min-w-220 text-left">
      {/* Table Header */}
      <thead className="bg-background">
        <tr className="bg-background text-xs font-bold text-grey">
          <th className="w-min whitespace-nowrap p-3 text-left">Penghuni</th>
          <th className="w-min whitespace-nowrap p-3 text-left">Kuarters</th>
          <th className="w-min whitespace-nowrap p-3 text-right">Tunggakan (RM)</th>

          {/* Amaun Bayar & Time Picker */}
          <th className="w-min whitespace-nowrap py-3 pl-3 text-right">
            <span className="pr-3">Amaun Bayar (RM)</span>
            <div className="mt-1">
              <div className="flex items-center justify-end gap-1 text-[10px] font-semibold uppercase text-grey/80">
                <button
                  type="button"
                  className="grid w-5 place-items-center rounded text-dark-blue transition hover:bg-light-blue"
                  aria-label="Pilih bulan bayaran sebelumnya"
                  title="Bulan sebelumnya"
                  onClick={onPreviousPaymentMonth}
                >
                  <Icon icon="chevron_left" size={15} />
                </button>
                <div ref={monthPickerRef} className="relative min-w-20">
                  <button
                    type="button"
                    className="min-w-20 rounded px-1.5 text-center uppercase text-dark-blue transition hover:bg-light-blue"
                    aria-label={`Pilih bulan bayaran. Bulan semasa ${paymentMonthLabel}`}
                    title="Pilih bulan"
                    onClick={() => setIsMonthPickerOpen((isOpen) => !isOpen)}
                  >
                    {paymentMonthLabel}
                  </button>
                  <div className="absolute left-1/2 top-full z-50 w-64 -translate-x-1/2 normal-case">
                    <Calender
                      containerRef={monthPickerRef}
                      disableAbsolutePositioning
                      isOpen={isMonthPickerOpen}
                      value={`${paymentMonthKey}-01`}
                      maxDate={`${getCurrentMonthKey()}-01`}
                      monthOnly
                      onChange={(value) => {
                        onPaymentMonthSelect(value.slice(0, 7));
                      }}
                      onClose={() => setIsMonthPickerOpen(false)}
                      scale={0.88}
                    />
                  </div>
                </div>
                <button
                  type="button"
                  className="grid w-5 place-items-center rounded text-dark-blue transition hover:bg-light-blue disabled:cursor-not-allowed disabled:text-light-grey"
                  aria-label="Pilih bulan bayaran seterusnya"
                  title="Bulan seterusnya"
                  disabled={!canGoNextPaymentMonth}
                  onClick={onNextPaymentMonth}
                >
                  <Icon icon="chevron_right" size={15} />
                </button>
              </div>
            </div>
          </th>

          <th className="w-[0%] whitespace-nowrap p-3 text-center">Tindakan</th>
        </tr>
      </thead>

      {/* Table Body */}
      <tbody className="bg-white">
        {/* Loading State / Error */}
        {isLoading ? (
          loadingTableRows({ // During Loading
            mode: "loading",
            rowCount: normalizedLoadingRowCount,
            columnCount: normalizedLoadingColumnCount,
          })
        ) : errorMessage ? (
          loadingTableRows({ // Error
            mode: "message",
            rowCount: normalizedLoadingRowCount,
            columnCount: normalizedLoadingColumnCount,
            message: errorMessage,
          })
        ) : rows.length === 0 ? (
          loadingTableRows({ // Not Exist
            mode: "message",
            rowCount: normalizedLoadingRowCount,
            columnCount: normalizedLoadingColumnCount,
            message: "Tiada rekod bayaran lengkap ditemui.",
          })
        ) : (
          rows.map((row) => (
            <tr
              key={row.id}
              className={[
                "border-t border-light-grey/20 text-sm transition-colors hover:bg-background/60",
                rowBorder(row.tone),
              ].join(" ")}
            >
              {/* Penghuni Data */}
              <td className="w-min whitespace-nowrap px-3 py-2 text-left">
                <div className={`font-bold ${mainTextSize}`}>{row.name}</div>
                <div className={`font-extralight ${subTextSize} text-grey`}>{formatIcNumber(row.ic)}</div>
              </td>

              {/* Kuarters Data */}
              <td className="w-min whitespace-nowrap px-3 py-2 text-left">
                <div className={`font-bold ${mainTextSize}`}>{row.quarters}</div>
                <div className={`font-extralight ${subTextSize} text-grey`}>{row.unit}</div>
              </td>

              {/* Arrears Data */}
              <td
                className={[
                  `w-min whitespace-nowrap px-3 py-2 text-right font-bold ${mainTextSize}`,
                  rowText(row.tone),
                ].join(" ")}
              >
                {row.arrears}
              </td>

              {/* Amount Data */}
              <td
                className={`w-min whitespace-nowrap px-3 py-2 text-right font-bold text-dark-grey ${mainTextSize}`}
              >
                {row.amount}
              </td>

              {/* Tindakan */}
              <td className="w-min whitespace-nowrap px-3 py-2 text-center align-middle">
                <BayaranRowActions
                  paymentId={row.id}
                  onAddPayment={onAddPayment}
                  onViewPayment={onViewPayment}
                />
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
    </div>
  );
}

// Format IC number with standard Malaysian separator pattern.
function formatIcNumber(value: string) {
  const digits = value.replace(/\D/g, "");

  if (digits.length !== 12) {
    return value;
  }

  return (
    <PatternFormat
      value={digits}
      format="######-##-####"
      displayType="text"
      disabled
    />
  );
}

// Return current month key in YYYY-MM format for calendar maxDate.
function getCurrentMonthKey() {
  const today = new Date();

  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
}
