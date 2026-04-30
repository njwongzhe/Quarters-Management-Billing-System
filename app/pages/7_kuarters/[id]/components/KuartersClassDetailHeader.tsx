import Link from "next/link";

import Icon from "@/app/components/Icon";
import { formatMoney } from "@/app/pages/7_kuarters/components/kuartersHelpers";

import type { QuarterClassRates } from "./kuartersUnitHelpers";

type KuartersClassDetailHeaderProps = {
  className: string;
  rates: QuarterClassRates;
};

// Used to display the rental, maintenance, and penalty rates for a quarter class in a visually distinct way. Each rate is shown in a "pill" style container with a label and the corresponding value formatted as currency. If a rate value is null, it displays "--" instead.
function RatePill({
  label,
  value,
}: {
  label: string;
  value: number | null;
}) {
  return (
    <div className="rounded-2xl border border-light-grey/20 bg-white px-4 py-3 shadow-sm">
      <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-grey">
        {label}
      </p>
      <p className="mt-2 text-lg font-extrabold tracking-[-0.03em] text-dark-grey">
        {value === null ? "--" : `RM ${formatMoney(value)}`}
      </p>
    </div>
  );
}

export default function KuartersClassDetailHeader({
  className,
  rates,
}: KuartersClassDetailHeaderProps) {
  const resolvedClassName = className.trim() || "Maklumat Kelas Kuarters";

  return (
    <section className="space-y-4">
      <Link
        href="/pages/7_kuarters"
        className="inline-flex items-center gap-2 text-sm font-semibold text-grey transition-colors hover:text-dark-blue"
      >
        <Icon icon="arrow_back" size={18} />
        Kembali ke senarai kelas
      </Link>

      <div className="space-y-2">
        <h1 className="text-3xl font-extrabold tracking-[-0.03em] text-dark-grey md:text-[34px]">
          Kelas: {resolvedClassName}
        </h1>
        <p className="max-w-3xl text-sm text-grey md:text-base">
          Pengurusan unit, penghuni semasa dan kadar berkaitan bagi kelas kuarters ini.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <RatePill label="Sewa" value={rates.rentalPrice} />
        <RatePill label="Senggara" value={rates.maintenancePrice} />
        <RatePill label="Penalti" value={rates.penaltyPrice} />
      </div>
    </section>
  );
}
