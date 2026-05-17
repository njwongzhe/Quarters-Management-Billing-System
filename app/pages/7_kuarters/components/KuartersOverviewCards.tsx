import type { KuartersSummaryCard } from "./kuartersHelpers";

type KuartersOverviewCardsProps = {
  cards: KuartersSummaryCard[];
};

const accentClasses = [
  "border-l-4 border-l-dark-blue",
  "border-l-4 border-l-aktif",
  "border-l-4 border-l-pencen-datang",
  "border-l-4 border-l-x-lengkap",
];

function KuartersStatCard({
  card,
  accentClass,
}: {
  card: KuartersSummaryCard;
  accentClass: string;
}) {
  return (
    <article
      className={`flex flex-col flex-1 gap-1 rounded-lg border-l-4 bg-white p-4 shadow ${accentClass}`}
    >
      <p className="text-xs font-semibold text-grey/70">{card.label}</p>
      <p className="text-3xl font-bold text-dark-grey">
        {card.value}
      </p>
    </article>
  );
}

export default function KuartersOverviewCards({
  cards,
}: KuartersOverviewCardsProps) {
  return (
    <section className="flex flex-col gap-3 md:flex-row">
      {cards.map((card, index) => (
        <KuartersStatCard
          key={card.label}
          card={card}
          accentClass={accentClasses[index] ?? accentClasses[0]}
        />
      ))}
    </section>
  );
}
