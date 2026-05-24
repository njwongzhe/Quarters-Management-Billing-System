import { PatternFormat } from "react-number-format";

import Icon from "@/app/components/Icon/Icon";
import { rowBorder, rowText } from "@/lib/payments/bayaran-helpers";
import type { BayaranRow } from "@/lib/payments/bayaran-types";
import BayaranRowActions from "./BayaranRowActions";

const mainTextSize = "text-sm";
const subTextSize = "text-xs";

export default function BayaranRecordsTable({
  isLoading = false,
  onAddPayment,
  onNextPaymentMonth,
  onPreviousPaymentMonth,
  onViewPayment,
  paymentMonthLabel,
  canGoNextPaymentMonth = true,
  rows,
}: {
  canGoNextPaymentMonth?: boolean;
  isLoading?: boolean;
  onAddPayment: (paymentId: string) => void;
  onNextPaymentMonth: () => void;
  onPreviousPaymentMonth: () => void;
  onViewPayment: (paymentId: string) => void;
  paymentMonthLabel: string;
  rows: BayaranRow[];
}) {
  return (
    <table className="w-full">
      <thead>
        <tr className="bg-background text-xs font-bold text-grey">
          <th className="w-min whitespace-nowrap p-3 text-left">Penghuni</th>
          <th className="w-min whitespace-nowrap p-3 text-left">Kuarters</th>
          <th className="w-min whitespace-nowrap p-3 text-right">
            Tunggakan (RM)
          </th>
          <th className="w-min whitespace-nowrap p-3 text-right">
            <div className="flex flex-col items-end leading-tight">
              <span>Amaun Bayar (RM)</span>
              <div className="mt-1 flex items-center gap-1 text-[10px] font-semibold uppercase text-grey/80">
                <button
                  type="button"
                  className="grid h-5 w-5 place-items-center rounded text-dark-blue transition hover:bg-light-blue"
                  aria-label="Pilih bulan bayaran sebelumnya"
                  title="Bulan sebelumnya"
                  onClick={onPreviousPaymentMonth}
                >
                  <Icon icon="chevron_left" size={15} />
                </button>
                <span className="min-w-16 text-center">
                  {paymentMonthLabel}
                </span>
                <button
                  type="button"
                  className="grid h-5 w-5 place-items-center rounded text-dark-blue transition hover:bg-light-blue disabled:cursor-not-allowed disabled:text-light-grey"
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
          <th className="w-[0%] whitespace-nowrap p-3 text-center">
            Tindakan
          </th>
        </tr>
      </thead>
      <tbody className="bg-white">
        {isLoading ? (
          <LoadingRows />
        ) : rows.length === 0 ? (
          <tr>
            <td
              colSpan={5}
              className="px-8 py-12 text-center text-sm font-semibold text-[#667085]"
            >
              Tiada rekod bayaran lengkap ditemui.
            </td>
          </tr>
        ) : (
          rows.map((row) => (
            <tr
              key={row.id}
              className={[
                "border-b border-b-light-grey/20 text-sm",
                rowBorder(row.tone),
              ].join(" ")}
            >
              <td className="w-min whitespace-nowrap px-3 py-2 text-left">
                <div className={`font-bold ${mainTextSize}`}>
                  {row.name}
                </div>
                <div className={`font-extralight ${subTextSize} text-grey`}>
                  {formatIcNumber(row.ic)}
                </div>
              </td>
              <td className="w-min whitespace-nowrap px-3 py-2 text-left">
                <div className={`font-bold ${mainTextSize}`}>
                  {row.quarters}
                </div>
                <div className={`font-extralight ${subTextSize} text-grey`}>
                  {row.unit}
                </div>
              </td>
              <td
                className={[
                  `w-min whitespace-nowrap px-3 py-2 text-right font-bold ${mainTextSize}`,
                  rowText(row.tone),
                ].join(" ")}
              >
                {row.arrears}
              </td>
              <td
                className={`w-min whitespace-nowrap px-3 py-2 text-right font-bold ${mainTextSize}`}
              >
                {row.amount}
              </td>
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
  );
}
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

function LoadingRows() {
  return (
    <>
      {Array.from({ length: 5 }, (_, rowIndex) => (
        <tr
          key={rowIndex}
          className="border-b border-b-light-grey/20 border-l-4 border-l-light-grey/30 text-sm"
        >
          {Array.from({ length: 5 }, (_, cellIndex) => (
            <td key={cellIndex} className="px-3 py-3">
              <div className="h-4 w-full max-w-36 animate-pulse rounded bg-light-blue" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
