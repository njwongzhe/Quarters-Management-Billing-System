"use client";

import { useEffect, useState } from "react";

import type { QuarterUnitDetails } from "@/lib/quarter-units";

import KuartersUnitDetailsHistoryTab from "./KuartersUnitDetailsHistoryTab";
import KuartersUnitDetailsUnitTab from "./KuartersUnitDetailsUnitTab";

type KuartersUnitDetailsOverlayProps = {
  categoryId: string;
  unitId: string;
  onClose: () => void;
  onAssignOccupant: (unitId: string) => void;
};
type UnitDetailsResponse = {
  success: boolean;
  message: string;
  data?: {
    unit?: QuarterUnitDetails;
  };
};

type ActiveTab = "unit" | "history";

function TabButton({
  isActive,
  children,
  onClick,
}: {
  isActive: boolean;
  children: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`min-h-13 min-w-40 border-b-2 px-7 text-xs font-extrabold uppercase tracking-[0.14em] transition-colors ${
        isActive
          ? "border-dark-blue text-dark-blue"
          : "border-transparent text-grey hover:text-dark-blue"
      }`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export default function KuartersUnitDetailsOverlay({
  categoryId,
  unitId,
  onClose,
  onAssignOccupant,
}: KuartersUnitDetailsOverlayProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>("unit");
  const [unitDetails, setUnitDetails] = useState<QuarterUnitDetails | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    function handleEscapeKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleEscapeKey);

    return () => {
      document.removeEventListener("keydown", handleEscapeKey);
    };
  }, [onClose]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadUnitDetails() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const response = await fetch(
          `/api/quarter-categories/${categoryId}/units/${unitId}`,
          {
            signal: controller.signal,
          },
        );
        const payload = (await response.json().catch(() => null)) as
          | UnitDetailsResponse
          | null;

        if (!response.ok || !payload?.success || !payload.data?.unit) {
          throw new Error(
            payload?.message ?? "Gagal mendapatkan maklumat unit kuarters.",
          );
        }

        setUnitDetails(payload.data.unit);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        setUnitDetails(null);
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Gagal mendapatkan maklumat unit kuarters.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void loadUnitDetails();

    return () => {
      controller.abort();
    };
  }, [categoryId, unitId, reloadToken]);

  return (
    <div
      className="fixed bottom-0 left-55 right-0 top-0 z-50 flex items-center justify-center bg-black/70 p-6"
      onClick={onClose}
    >
      <section
        className="max-h-[calc(100vh-4rem)] w-full max-w-336 overflow-hidden rounded-2xl bg-light-blue shadow-[0_18px_45px_rgba(0,0,0,0.35)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="unit-details-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex min-h-23 items-center justify-between gap-4 bg-dark-blue px-6 text-white sm:px-8">
          <div className="min-w-0 space-y-1">
            <h3
              id="unit-details-title"
              className="truncate text-[21px] font-extrabold uppercase tracking-[-0.02em]"
            >
              Maklumat Penghunian Unit
            </h3>
            <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-white/70">
              Rekod Penghunian Unit
            </p>
          </div>
          <button
            type="button"
            className="inline-flex text-[34px] leading-none text-white transition hover:scale-95 hover:opacity-80"
            aria-label="Tutup maklumat unit"
            onClick={onClose}
          >
            &times;
          </button>
        </header>

        <nav
          className="flex min-h-13 items-stretch justify-center overflow-x-auto border-b border-[#C6C5D2]/25 bg-white"
          aria-label="Unit occupancy tabs"
        >
          <TabButton
            isActive={activeTab === "unit"}
            onClick={() => setActiveTab("unit")}
          >
            Maklumat Unit
          </TabButton>
          <TabButton
            isActive={activeTab === "history"}
            onClick={() => setActiveTab("history")}
          >
            Sejarah Penghunian
          </TabButton>
        </nav>

        {isLoading ? (
          <div className="flex min-h-108 items-center justify-center px-5 py-7 sm:px-8 sm:py-8">
            <div className="text-center">
              <div
                className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-dark-blue/20 border-t-dark-blue"
                aria-hidden="true"
              />
              <p className="mt-4 text-sm font-semibold text-grey">
                Mendapatkan maklumat unit kuarters...
              </p>
            </div>
          </div>
        ) : errorMessage ? (
          <div className="flex min-h-108 items-center justify-center px-5 py-7 sm:px-8 sm:py-8">
            <div className="w-full max-w-md rounded-xl border border-red/20 bg-white p-6 text-center">
              <h4 className="text-lg font-extrabold text-dark-grey">
                Maklumat Tidak Dapat Dipaparkan
              </h4>
              <p className="mt-2 text-sm leading-6 text-grey">{errorMessage}</p>
              <button
                type="button"
                className="mt-5 inline-flex min-h-10 items-center rounded-xl bg-dark-blue px-4 py-2 text-sm font-extrabold text-white transition-opacity hover:opacity-90"
                onClick={() => setReloadToken((currentValue) => currentValue + 1)}
              >
                Cuba Lagi
              </button>
            </div>
          </div>
        ) : activeTab === "unit" && unitDetails ? (
          <KuartersUnitDetailsUnitTab
            unitDetails={unitDetails}
            onAssignOccupant={() => onAssignOccupant(unitDetails.id)}
          />
        ) : unitDetails ? (
          <KuartersUnitDetailsHistoryTab unitDetails={unitDetails} />
        ) : null}
      </section>
    </div>
  );
}
