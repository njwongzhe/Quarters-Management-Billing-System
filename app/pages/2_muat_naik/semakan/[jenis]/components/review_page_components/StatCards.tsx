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
    <div className="grid gap-4 md:grid-cols-3">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="min-h-29 rounded border border-[#E7EAF2] bg-white px-6 py-5 shadow-sm"
        >
          <p className="text-[10px] font-extrabold uppercase text-[#667085]">
            {stat.label}
          </p>
          {isLoading ? (
            <>
              <div className="mt-3 h-8 w-28 animate-pulse rounded bg-[#E7EAF2]" />
              <div className="mt-5 h-3 w-32 animate-pulse rounded bg-[#EEF1F7]" />
            </>
          ) : (
            <>
              <p className="mt-2 text-[30px] font-extrabold leading-none text-[#07162F]">
                {stat.value}
              </p>
              <div
                className={[
                  "mt-4 flex items-center gap-1 text-[10px] font-extrabold",
                  stat.tone === "green" ? "text-green" : "text-blue-500",
                ].join(" ")}
              >
                <Icon icon={stat.icon} size={12} weight={700} />
                {stat.helper}
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
