import type { KuartersSummaryCard } from "./kuartersHelpers";

type KuartersOverviewCardsProps = {
  cards: KuartersSummaryCard[];
};

const accentClasses = [
  "border-l-4 border-l-darkblue",
  "border-l-4 border-l-aktif",
  "border-l-4 border-l-pencenDatang",
  "border-l-4 border-l-xLengkap",
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
      className={`rounded-xl border border-lightGrey/20 bg-white px-5 py-5 shadow-sm ${accentClass}`}
    >
      <p className="text-sm font-medium text-grey md:text-base">{card.label}</p>
      <p className="mt-3 text-4xl font-extrabold leading-none tracking-[-0.05em] text-darkGrey md:text-5xl">
        {card.value}
      </p>
    </article>
  );
}

export default function KuartersOverviewCards({
  cards,
}: KuartersOverviewCardsProps) {
  return (
    <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
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
