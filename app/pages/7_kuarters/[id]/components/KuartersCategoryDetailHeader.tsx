import Link from "next/link";

import Icon from "@/app/components/Icon";
import { formatMoney } from "@/app/pages/7_kuarters/components/kuartersHelpers";

import type { QuarterCategoryRates } from "./kuartersUnitHelpers";

type KuartersCategoryDetailHeaderProps = {
  categoryName: string;
  address: string | null;
  rates: QuarterCategoryRates;
};

// Used to display the rental, maintenance, and penalty rates for a quarter category in a visually distinct way.
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

export default function KuartersCategoryDetailHeader({
  categoryName,
  address,
  rates,
}: KuartersCategoryDetailHeaderProps) {
  const resolvedCategoryName = categoryName.trim() || "Maklumat kategori kuarters";
  const resolvedAddress = address?.trim() || "Alamat tidak tersedia";

  return (
    <section className="space-y-4 pt-1">
      <Link
        href="/pages/7_kuarters"
        className="fixed left-61 top-6 z-40 inline-flex min-h-10 items-center gap-2 rounded-xl border border-light-grey/25 bg-white px-4 py-2 text-sm font-extrabold text-grey shadow-[0_12px_30px_rgba(13,47,86,0.12)] transition-colors hover:border-dark-blue hover:text-dark-blue"
      >
        <Icon icon="arrow_back" size={18} />
        Kembali ke Senarai Kategori
      </Link>

      <div className="space-y-2">
        <h1 className="text-3xl font-extrabold tracking-[-0.03em] text-dark-grey md:text-[34px]">
          Kategori: {resolvedCategoryName}
        </h1>
        <p className="max-w-3xl text-sm font-semibold text-dark-grey md:text-base">
          Alamat: {resolvedAddress}
        </p>
        <p className="max-w-3xl text-sm text-grey md:text-base">
          Pengurusan unit, penghuni semasa dan kadar berkaitan bagi kategori kuarters ini.
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
