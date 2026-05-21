"use client";

import Icon from "@/app/components/Icon/Icon";
import type { ReactNode } from "react";
import { useState } from "react";

type BayaranFilterShellProps = {
  filterForm: ReactNode;
  children: ReactNode;
  downloadButton: ReactNode;
};

export default function BayaranFilterShell({
  filterForm,
  children,
  downloadButton,
}: BayaranFilterShellProps) {
  const [isFilterOpen, setIsFilterOpen] = useState(true);

  return (
    <div className="rounded-xl bg-light-blue p-5 shadow-[0_8px_22px_rgba(15,23,42,0.04)]">
      <div className="mb-5 flex items-start justify-between">
        <div>
          <h2 className="text-lg font-extrabold leading-tight text-[#07162F]">
            Senarai Rekod Bayaran
          </h2>
          <p className="text-xs font-medium text-[#344054]">
            Rekod bayaran terkini.
          </p>
        </div>
        <div className="flex items-center gap-4">
          {downloadButton}
          <button
            type="button"
            onClick={() => setIsFilterOpen((value) => !value)}
            aria-label={isFilterOpen ? "Tutup tapisan rekod bayaran" : "Buka tapisan rekod bayaran"}
            aria-expanded={isFilterOpen}
            className={[
              "relative inline-flex h-10 w-10 items-center justify-center rounded-lg border p-2 transition-colors",
              isFilterOpen
                ? "border-dark-blue bg-dark-blue text-white hover:bg-[#101966]"
                : "border-light-grey/20 bg-white text-dark-blue hover:border-dark-blue",
            ].join(" ")}
            title={isFilterOpen ? "Tutup tapisan rekod bayaran" : "Buka tapisan rekod bayaran"}
          >
            <Icon icon="filter" size={20} />
          </button>
        </div>
      </div>

      {isFilterOpen ? filterForm : null}

      <div
        className={[
          "overflow-hidden bg-white shadow-sm",
          isFilterOpen ? "rounded-b-xl" : "rounded-xl",
        ].join(" ")}
      >
        {children}
      </div>
    </div>
  );
}
