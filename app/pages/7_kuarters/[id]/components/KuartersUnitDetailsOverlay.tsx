"use client";

import { useEffect, useState } from "react";

import Icon from "@/app/components/Icon/Icon";
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
      className={`py-4 text-sm font-medium -mb-px transition-colors ${
        isActive
          ? "border-b-4 border-dark-blue text-dark-blue"
          : "text-gray-500 hover:text-dark-blue"
      }`}
      onClick={onClick}
    >
      <span className="font-bold">{children}</span>
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
      className="fixed top-0 left-55 right-0 bottom-0 z-50 bg-black/40 backdrop-blur-sm p-12 flex items-start justify-center"
      onClick={onClose}
    >
      <section
        className="relative w-full rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-full"
        role="dialog"
        aria-modal="true"
        aria-labelledby="unit-details-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="bg-dark-blue p-6 flex items-center justify-between">
          <div>
            <h3
              id="unit-details-title"
              className="font-bold text-lg text-white"
            >
              MAKLUMAT PENGHUNI UNIT
            </h3>
            <p className="font-extralight text-xs text-light-grey">
              REKOD PENGHUNIAN UNIT
            </p>
          </div>
          <button
            type="button"
            className="hover:scale-96 active:scale-92 text-white"
            aria-label="Tutup maklumat unit"
            onClick={onClose}
          >
            <Icon icon="close" size={20} />
          </button>
        </header>

        <nav
          className="flex items-center justify-center gap-6 bg-white"
          aria-label="Unit occupancy tabs"
        >
          <TabButton
            isActive={activeTab === "unit"}
            onClick={() => setActiveTab("unit")}
          >
            MAKLUMAT UNIT
          </TabButton>
          <TabButton
            isActive={activeTab === "history"}
            onClick={() => setActiveTab("history")}
          >
            SEJARAH PENGHUNIAN
          </TabButton>
        </nav>

        <div className="p-6 bg-light-blue overflow-y-auto">
          {isLoading ? (
            <div className="flex min-h-108 items-center justify-center">
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
            <div className="flex min-h-108 items-center justify-center">
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
        </div>
      </section>
    </div>
  );
}
