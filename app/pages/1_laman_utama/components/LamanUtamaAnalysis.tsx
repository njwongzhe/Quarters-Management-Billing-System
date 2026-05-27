"use client";

interface ArrearsClassItem {
  className: string;
  amount: string;
  settlementRate: number; // e.g. 15 for 15%
  opacity: number;       // e.g. 1 for 100%, 0.7 for 70%, 0.4 for 40%
}

interface LamanUtamaAnalysisProps {
  items?: ArrearsClassItem[];
}

const DEFAULT_ITEMS: ArrearsClassItem[] = [
  {
    className: "Jalan Ariffin",
    amount: "RM 8,450.00",
    settlementRate: 15,
    opacity: 1.0,
  },
  {
    className: "Taman Nusantara",
    amount: "RM 5,200.00",
    settlementRate: 40,
    opacity: 0.7,
  },
  {
    className: "Persiaran Tanjung",
    amount: "RM 3,100.00",
    settlementRate: 65,
    opacity: 0.4,
  },
];

export default function LamanUtamaAnalysis({
  items = DEFAULT_ITEMS,
}: LamanUtamaAnalysisProps) {
  return (
    <div className="flex flex-col items-start p-8 w-full bg-light-blue rounded-xl">
      {/* Title */}
      <h4 className="text-lg font-bold text-[#0B1C30] mb-6">
        Analisis Tunggakan Mengikut Kelas
      </h4>

      {/* List Container */}
      <div className="flex flex-col gap-8 w-full">
        {items.map((item, index) => {
          // Progress bar represents outstanding arrears = 100% - settlementRate
          const outstandingRate = 100 - item.settlementRate;

          return (
            <div key={index} className="flex flex-col gap-3 w-full">
              {/* Top row: Class Name and Amount */}
              <div className="flex flex-row justify-between items-center w-full">
                <span className="text-sm font-bold text-[#0B1C30]">
                  {item.className}
                </span>
                <span className="text-lg font-bold text-red">
                  {item.amount}
                </span>
              </div>

              {/* Progress bar container */}
              <div className="relative w-full h-4 bg-white rounded-full overflow-hidden">
                <div
                  className="absolute top-0 bottom-0 left-0 rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: `${outstandingRate}%`,
                    backgroundColor: `rgba(186, 26, 26, ${item.opacity})`,
                  }}
                />
              </div>

              {/* Label row */}
              <div className="w-full text-xs text-grey font-medium leading-4">
                Kadar Penyelesaian: {item.settlementRate}%
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
