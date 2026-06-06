"use client";

export default function LamanUtamaHeader() {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 w-full">
      <div className="flex flex-col">
        <h2 className="text-2xl font-extrabold leading-9 tracking-tight text-[#0B1C30]">
          Ringkasan Eksekutif
        </h2>
        <p className="text-sm font-extralight text-grey/70">
          Paparan statistik terkini bagi pengurusan kuarters Johor.
        </p>
      </div>
    </div>
  );
}
