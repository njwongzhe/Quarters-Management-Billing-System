"use client";

import { useEffect, useState } from "react";

import Icon from "@/app/components/Icon/Icon";
import { Topic } from "@/app/components/InputField";
import SearchingDetailDataOverlay from "@/app/components/Loading/SearchingDetailDataOverlay";
import PenghuniCompleteWithKuartersDetail from "@/app/components/RecordNavigation/PenghuniCompleteWithKuartersDetail";
import { InputField } from "@/app/components/InputField";

import ButiranTunggakanHistory from "./ButiranTunggakanHistory";

type ButiranTunggakanModalProps = {
  isOpen: boolean;
  onClose: () => void;
  residentId: string | null;
};

export type ProfileData = {
  fullName: string;
  icNumber: string;
  age: number;
  kelas: string | null;
  unit: string | null;
  tarikhMasuk: string | null;
  tarikhKeluar: string | null;
  status: string;
  quarterAddress: string | null;
  charges: {
    sewa: number;
    senggara: number;
    penalti: number;
    tambahan: number;
    rebat: number;
    total: number;
  };
};

export type HistoryData = {
  tarikh: string;
  id: string;
  kategori: string;
  catatan: string;
  debit: number;
  kredit: number;
};

type ArrearDetailResponse = {
  ok: boolean;
  message?: string;
  data?: {
    profile: ProfileData;
    history: HistoryData[];
  };
};

type ActiveTab = "maklumat" | "sejarah";

function TabButton({
  children,
  isActive,
  onClick,
}: {
  children: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`-mb-px py-4 text-sm font-bold transition-colors ${
        isActive
          ? "border-b-4 border-dark-blue text-dark-blue"
          : "text-gray-500 hover:text-dark-blue"
      }`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function parseDisplayDateToIso(value: string | null) {
  if (!value || value === "N/A") {
    return null;
  }

  const dateParts = value.split("/");
  if (dateParts.length !== 3) {
    return null;
  }

  const [day, month, year] = dateParts;
  return `${year}-${month}-${day}`;
}

function formatMoney(value: number) {
  return value.toLocaleString("ms-MY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function ButiranInfoTab({
  profile,
  residentId,
}: {
  profile: ProfileData;
  residentId: string | null;
}) {
  const currentOccupancy = {
    occupantId: residentId ?? "",
    occupantName: profile.fullName,
    occupantIcNumber: profile.icNumber,
    occupantAge: profile.age,
    quarterClass: profile.kelas,
    quarterUnit: profile.unit,
    quarterAddress: profile.quarterAddress,
    moveInDate: parseDisplayDateToIso(profile.tarikhMasuk),
    moveOutDate: parseDisplayDateToIso(profile.tarikhKeluar),
    occupantStatus: profile.status,
  };

  return (
    <div className="flex flex-col gap-8">
      <PenghuniCompleteWithKuartersDetail
        currentOccupancy={currentOccupancy}
        actionButton={{
          type: "profile",
          residentId,
          label: "Profil Penuh",
        }}
      />

      <section className="flex flex-col gap-4">
        <Topic content="MAKLUMAT TUNGGAKAN" />

        <div className="grid items-start gap-4 md:grid-cols-5">
          <InputField
            label="SEWA (RM)"
            value={formatMoney(profile.charges.sewa)}
            state="inactive"
            inactiveBackgroundClass="bg-[#EEF4FF] text-red"
          />
          <InputField
            label="SENGGARA (RM)"
            value={formatMoney(profile.charges.senggara)}
            state="inactive"
            inactiveBackgroundClass="bg-[#EEF4FF] text-red"
          />
          <InputField
            label="PENALTI (RM)"
            value={formatMoney(profile.charges.penalti)}
            state="inactive"
            inactiveBackgroundClass="bg-[#EEF4FF] text-red"
          />
          <InputField
            label="TAMBAHAN (RM)"
            value={formatMoney(profile.charges.tambahan)}
            state="inactive"
            inactiveBackgroundClass="bg-[#EEF4FF] text-red"
          />
          <InputField
            label="REBAT (RM)"
            value={formatMoney(profile.charges.rebat)}
            state="inactive"
            inactiveBackgroundClass="bg-[#EEF4FF] text-green"
          />
        </div>

        <div className="flex flex-col gap-3 overflow-hidden rounded-lg bg-dark-blue p-4 text-white shadow-[0_24px_40px_rgba(23,31,111,0.18)]">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <div className="text-xs font-bold uppercase text-light-grey">TUNGGAKAN</div>
              <div className={`text-2xl font-bold ${profile.charges.total > 0 ? "text-red" : "text-green"}`}>RM {formatMoney(profile.charges.total)}</div>
              <span className="text-xs font-extralight text-light-grey">{profile.charges.total > 0 ? "Belum Dikutip" : "Sudah Dikutip"}</span>
            </div>

            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white/10">
              <Icon
                icon={profile.charges.total > 0 ? "priority_high" : "check_circle"}
                size={40}
                filled
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function ButiranTunggakanModal({
  isOpen,
  onClose,
  residentId,
}: ButiranTunggakanModalProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>("maklumat");
  const [data, setData] = useState<{ profile: ProfileData; history: HistoryData[] } | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleEscapeKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleEscapeKey);

    return () => {
      document.removeEventListener("keydown", handleEscapeKey);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen || !residentId) {
      setData(null);
      setErrorMessage(null);
      setActiveTab("maklumat");
      return;
    }

    const controller = new AbortController();

    async function fetchResidentDetails() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const response = await fetch(`/api/arrear/${residentId}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const payload = (await response.json().catch(() => null)) as
          | ArrearDetailResponse
          | null;

        if (!response.ok || !payload?.ok || !payload.data) {
          throw new Error(payload?.message ?? "Gagal mendapatkan butiran tunggakan.");
        }

        setData(payload.data);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        setData(null);
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Gagal mendapatkan butiran tunggakan.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void fetchResidentDetails();

    return () => {
      controller.abort();
    };
  }, [isOpen, residentId, reloadToken]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed bottom-0 left-55 right-0 top-0 z-50 flex items-start justify-center bg-black/45 p-12 backdrop-blur-sm"
      onClick={onClose}
    >
      <section
        className="flex max-h-full w-full flex-col overflow-hidden rounded-lg bg-light-blue shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="arrear-details-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-center justify-between bg-dark-blue p-6 text-white">
          <div>
            <h2 id="arrear-details-title" className="text-lg font-bold">
              BUTIRAN TUNGGAKAN
            </h2>
            <p className="text-xs font-extralight text-light-grey">
              MAKLUMAT TERPERINCI TUNGGAKAN PENGHUNI
            </p>
          </div>
          <button
            type="button"
            className="hover:scale-96 active:scale-92 text-white"
            aria-label="Tutup butiran tunggakan"
            onClick={onClose}
          >
            <Icon icon="close" size={20} />
          </button>
        </header>

        <nav
          className="flex items-center justify-center gap-8 border-b border-light-grey/20 bg-white"
          aria-label="Tab butiran tunggakan"
        >
          <TabButton
            isActive={activeTab === "maklumat"}
            onClick={() => setActiveTab("maklumat")}
          >
            MAKLUMAT TUNGGAKAN
          </TabButton>
          <TabButton
            isActive={activeTab === "sejarah"}
            onClick={() => setActiveTab("sejarah")}
          >
            SEJARAH TUNGGAKAN
          </TabButton>
        </nav>

        {errorMessage ? (
          <div className="h-full">
            <SearchingDetailDataOverlay
              mode="warning"
              title="Butiran Tidak Dapat Dipaparkan"
              message={errorMessage}
              onRetry={() => setReloadToken((value) => value + 1)}
              retryLabel="Cuba Lagi"
            />
          </div>
        ) : isLoading ? (
          <div className="h-full">
            <SearchingDetailDataOverlay
              mode="loading"
              loadingMessage="Sedang mendapatkan butiran tunggakan..."
            />
          </div>
        ) : activeTab === "maklumat" && data?.profile ? (
          <div className="overflow-y-auto bg-light-blue p-6">
            <ButiranInfoTab profile={data.profile} residentId={residentId} />
          </div>
        ) : activeTab === "sejarah" ? (
          <div className="overflow-y-auto bg-light-blue p-6">
            <ButiranTunggakanHistory
              history={data?.history ?? []}
              residentId={residentId}
              isLoading={isLoading}
            />
          </div>
        ) : null}
      </section>
    </div>
  );
}