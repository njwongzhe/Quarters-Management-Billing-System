import Icon from "@/app/components/Icon/Icon";
import type { BayaranStatCard } from "@/lib/payments/bayaran-types";

export default function BayaranStatsCards({
  stats,
}: {
  stats: BayaranStatCard[];
}) {
  return (
    <div className="grid grid-cols-5 gap-5">
      {stats.map((stat) => (
        <article
          key={stat.label}
          className={[
            "min-h-26 rounded-lg border-l-4 bg-white px-5 py-4 shadow-[0_8px_18px_rgba(15,23,42,0.04)]",
            stat.accent,
          ].join(" ")}
        >
          <div className="flex items-center justify-between gap-3">
            <p className="text-[9px] font-extrabold uppercase text-[#667085]">
              {stat.label}
            </p>
            <Icon
              icon={stat.icon}
              size={13}
              weight={600}
              className="text-[#A7B0C0]"
            />
          </div>
          <p className="mt-1 text-[28px] font-extrabold leading-none text-[#07162F]">
            {stat.value}
          </p>
          <p
            className={[
              "mt-3 flex items-center gap-1 text-[9px] font-bold",
              stat.helperColor,
            ].join(" ")}
          >
            <span className={["h-1.5 w-1.5 rounded-full", stat.dot].join(" ")} />
            {stat.helper}
          </p>
        </article>
      ))}
    </div>
  );
}
