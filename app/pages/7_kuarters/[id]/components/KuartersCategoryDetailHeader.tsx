import { useRouter } from "next/navigation";

import Icon from "@/app/components/Icon/Icon";
import HeaderBackButton from "@/app/components/Layout/HeaderBackButton";
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
    <div className="rounded-lg border border-light-grey/20 bg-surface px-4 py-3 shadow-sm">
      <p className="text-xs font-bold uppercase text-grey/70">
        {label}
      </p>
      <p className="mt-2 text-lg font-extrabold text-content">
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
  const router = useRouter();
  const resolvedCategoryName = categoryName.trim() || "Maklumat kategori kuarters";
  const resolvedAddress = address?.trim() || "Alamat tidak tersedia";

  const handleBack = () => {
    router.push("/pages/7_kuarters");
  };

  return (
    <section className="flex flex-col gap-4">
      <HeaderBackButton onBack={handleBack} />

      <div>
        <h1 className="text-2xl font-extrabold tracking-[-0.03em] text-content">
          Kategori: {resolvedCategoryName}
        </h1>
        <p className="max-w-3xl text-sm font-semibold text-content">
          Alamat: {resolvedAddress}
        </p>
        <p className="max-w-3xl text-sm font-extralight text-grey/70">
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
