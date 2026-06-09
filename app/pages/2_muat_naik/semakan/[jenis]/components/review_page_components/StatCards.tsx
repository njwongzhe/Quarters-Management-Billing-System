import Icon from "../../../../../../components/Icon/Icon";
import type { StatCard } from "./types";

export default function StatCards({
  stats,
  isLoading = false,
}: {
  stats: StatCard[];
  isLoading?: boolean;
}) {
  return (
    <section className="flex flex-col gap-3 md:flex-row">
      {stats.map((stat) => {
        const isDate =
          stat.label.toLowerCase().includes("tarikh") ||
          stat.icon === "calendar_month";
        const isCurrency = stat.label.toLowerCase().includes("rm");

        let displayValue = stat.value;
        if (isLoading) {
          if (isDate) {
            displayValue = "N/A";
          } else if (isCurrency) {
            displayValue = "RM 0.00";
          } else {
            displayValue = "0";
          }
        }

        return (
          <article
            key={stat.label}
            className={[
              "flex flex-col flex-1 gap-1 rounded-lg border-l-4 bg-white p-4 shadow",
              stat.tone === "green" ? "border-l-green" : "border-l-dark-blue",
            ].join(" ")}
          >
            <p className="text-xs font-semibold text-grey/70">
              {stat.label}
            </p>
            <p
              className={[
                "text-3xl font-bold text-dark-grey",
              ].join(" ")}
            >
              {displayValue}
            </p>
            <div
              className={[
                "flex items-center gap-1 text-xs font-bold",
                stat.tone === "green" ? "text-green" : "text-dark-blue",
              ].join(" ")}
            >
              <Icon
                icon={stat.icon}
                size={16}
                className={stat.tone === "green" ? "text-green" : "text-dark-blue"}
              />
              {stat.helper}
            </div>
          </article>
        );
      })}
    </section>
  );
}
