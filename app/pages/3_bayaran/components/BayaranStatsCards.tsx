import Icon from "@/app/components/Icon/Icon";
import type { BayaranStatCard } from "@/lib/payments/bayaran-types";

export default function BayaranStatsCards({
  stats,
}: {
  stats: BayaranStatCard[];
}) {
  return (
    <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
      {stats.map((stat) => (
        <article
          key={stat.label}
          className={[
            "flex flex-col gap-1 rounded-lg border-l-4 bg-white p-4 shadow",
            stat.accent,
          ].join(" ")}
        >
          <p className="text-xs font-semibold text-grey/70">
            {stat.label}
          </p>
          <p className="text-3xl font-bold text-dark-grey">
            {stat.value}
          </p>
          <p
            className={[
              "text-xs font-bold",
              stat.helperColor,
            ].join(" ")}
          >
            <div className="flex items-center gap-1">
              <Icon
                icon={stat.icon}
                size={12}
                weight={600}
                className={stat.helperColor}
              />
              {stat.helper}
            </div>
            
          </p>
        </article>
      ))}
    </section>
  );
}
