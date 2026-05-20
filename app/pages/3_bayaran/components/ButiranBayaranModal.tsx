"use client";

import { useEffect, useState } from "react";

import Icon from "@/app/components/Icon/Icon";
import ToolbarButton from "@/app/components/ToolbarIconButton";
import Link from "next/link";

import type { BayaranDetailData, BayaranDetailResponse } from "./types";

type ButiranBayaranModalProps = {
  isOpen: boolean;
  paymentId: string;
  onClose: () => void;
};

export default function ButiranBayaranModal({
  isOpen,
  paymentId,
  onClose,
}: ButiranBayaranModalProps) {
  const [activeTab, setActiveTab] = useState<"maklumat" | "sejarah">("maklumat");
  const [data, setData] = useState<BayaranDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    let ignore = false;

    async function fetchDetail() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const response = await fetch(`/api/payments/${paymentId}`);
        const result = (await response.json()) as BayaranDetailResponse;

        if (ignore) {
          return;
        }

        if (!response.ok || !result.ok || !result.data) {
          setErrorMessage(result.message ?? "Gagal mengambil butiran bayaran.");
          return;
        }

        setData(result.data);
      } catch {
        if (!ignore) {
          setErrorMessage("Ralat rangkaian semasa mengambil butiran bayaran.");
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    fetchDetail();

    return () => {
      ignore = true;
    };
  }, [isOpen, paymentId]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-light-blue shadow-2xl">
        <div className="flex items-start justify-between bg-dark-blue px-8 py-5 text-white">
          <div>
            <h2 className="text-[1.1rem] font-extrabold uppercase tracking-wide">
              Butiran Bayaran
            </h2>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-blue-200">
              Maklumat terperinci pembayaran semasa
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 transition-colors hover:bg-white/10"
            aria-label="Tutup butiran bayaran"
          >
            <Icon icon="close" size={20} />
          </button>
        </div>

        <div className="flex bg-white px-8 pt-2">
          <TabButton
            isActive={activeTab === "maklumat"}
            onClick={() => setActiveTab("maklumat")}
          >
            Maklumat Bayaran
          </TabButton>
          <TabButton
            isActive={activeTab === "sejarah"}
            onClick={() => setActiveTab("sejarah")}
          >
            Sejarah Pembayaran
          </TabButton>
        </div>

        <div className="relative min-h-75 flex-1 overflow-y-auto bg-light-blue p-8">
          {isLoading ? (
            <LoadingState label="Memuat butiran bayaran..." />
          ) : errorMessage ? (
            <EmptyState message={errorMessage} />
          ) : activeTab === "maklumat" && data ? (
            <MaklumatBayaranTab data={data} />
          ) : activeTab === "sejarah" && data ? (
            <SejarahPembayaranTab records={data.uploadedHistory} />
          ) : (
            <EmptyState message="Tiada butiran bayaran ditemui." />
          )}
        </div>
      </div>
    </div>
  );
}

function MaklumatBayaranTab({ data }: { data: BayaranDetailData }) {
  const currentPayment = data.currentPayment;

  return (
    <div className="space-y-8">
      <section>
        <div className="mb-4 flex items-center justify-between">
          <SectionTitle>Maklumat Penghuni</SectionTitle>
          <Link
            href={`/pages/6_penghuni?targetId=${encodeURIComponent(data.profile.residentId)}`}
            className="flex items-center gap-1 text-[10px] font-extrabold uppercase text-dark-blue hover:underline"
            aria-label={`Buka profil penuh ${data.profile.fullName}`}
          >
            Profil Penuh <Icon icon="chevronRight" size={16} />
          </Link>
        </div>

        <div className="grid grid-cols-3 gap-5 pl-4">
          <ReadOnlyField label="Nama Penghuni" value={data.profile.fullName} />
          <ReadOnlyField label="No. Kad Pengenalan" value={data.profile.icNumber} />
          <ReadOnlyField label="Umur" value={data.profile.age || "-"} />
          <ReadOnlyField label="Kelas" value={data.profile.kelas} hasLinkIcon />
          <ReadOnlyField label="Unit Kuarters" value={data.profile.unit} hasLinkIcon />
          <span />
          <ReadOnlyField
            label="Tarikh Masuk"
            value={formatDate(data.profile.moveInDate)}
          />
          <ReadOnlyField
            label="Tarikh Keluar"
            value={formatDate(data.profile.moveOutDate)}
            muted
          />
          <ReadOnlyField
            label="Status Penghuni"
            value={data.profile.status}
            valueClassName="font-bold text-green"
          />
        </div>
      </section>

      <section>
        <div className="mb-4">
          <SectionTitle>Maklumat Bayaran</SectionTitle>
        </div>
        <div className="ml-4 rounded-xl bg-dark-blue p-5 text-white shadow-lg">
          <div className="mb-3 flex items-start justify-between gap-4">
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-blue-200">
              Amaun Bayar Bulan Kini
            </p>
            <p className="text-sm font-extrabold">RM {formatRM(currentPayment.amount)}</p>
          </div>
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-blue-200">
                Baki Tunggakan
              </p>
              <h3
                className={[
                  "mt-1 text-3xl font-extrabold",
                  currentPayment.currentArrears > 0
                    ? "text-red-300"
                    : currentPayment.currentArrears < 0
                      ? "text-blue-300"
                      : "text-green-200",
                ].join(" ")}
              >
                RM {formatRM(currentPayment.currentArrears)}
              </h3>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white/10">
              <span className="text-3xl font-extrabold">!</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function SejarahPembayaranTab({
  records,
}: {
  records: BayaranDetailData["uploadedHistory"];
}) {
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <SectionTitle>Sejarah Pembayaran</SectionTitle>
        <div className="flex gap-3">
          <ToolbarButton icon="download" label="Muat turun sejarah pembayaran" />
          <ToolbarButton icon="filter" label="Tapis sejarah pembayaran" />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-100 bg-[#F8FAFC] text-[10px] font-extrabold uppercase tracking-wider text-grey">
            <tr>
              <th className="px-6 py-4">Tarikh</th>
              <th className="px-6 py-4">ID</th>
              <th className="px-6 py-4">No. Resit</th>
              <th className="px-6 py-4">Catatan</th>
              <th className="px-6 py-4 text-right">Amaun (RM)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {records.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center text-sm text-grey">
                  Tiada sejarah pembayaran daripada muat naik ditemui.
                </td>
              </tr>
            ) : (
              records.map((record) => (
                <tr key={record.id} className="transition-colors hover:bg-gray-50">
                  <td className="px-6 py-4 font-bold text-dark-grey">
                    {formatDate(record.paymentDate)}
                  </td>
                  <td className="px-6 py-4 text-xs font-semibold text-light-grey">
                    {record.paymentNo}
                  </td>
                  <td className="px-6 py-4 font-medium text-dark-grey">
                    {record.receiptNo}
                  </td>
                  <td className="px-6 py-4 text-dark-grey">{record.description}</td>
                  <td className="px-6 py-4 text-right font-extrabold text-green">
                    {formatRM(record.amount)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {records.length > 0 ? (
        <div className="flex items-center justify-between pt-4 text-xs font-semibold text-grey">
          <div className="flex gap-1">
            <button className="rounded border border-gray-200 px-3 py-1.5 hover:bg-gray-50">
              &lt;
            </button>
            <button className="rounded border border-dark-blue bg-dark-blue px-3 py-1.5 text-white">
              1
            </button>
            <button className="rounded border border-gray-200 bg-white px-3 py-1.5 hover:bg-gray-50">
              &gt;
            </button>
          </div>
          <p>
            Menunjukkan 1-{records.length} Daripada {records.length} Rekod
          </p>
        </div>
      ) : null}
    </div>
  );
}

function TabButton({
  isActive,
  onClick,
  children,
}: {
  isActive: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "border-b-2 px-6 py-3 text-xs font-extrabold uppercase tracking-wider transition-colors",
        isActive
          ? "border-dark-blue text-dark-blue"
          : "border-transparent text-grey hover:text-dark-blue",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="h-4 w-1 rounded-full bg-dark-blue" />
      <h3 className="text-xs font-extrabold uppercase tracking-wider text-dark-blue">
        {children}
      </h3>
    </div>
  );
}

function ReadOnlyField({
  label,
  value,
  muted = false,
  hasLinkIcon = false,
  valueClassName = "font-medium text-dark-grey",
}: {
  label: string;
  value: string;
  muted?: boolean;
  hasLinkIcon?: boolean;
  valueClassName?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-wider text-grey">
        {label}
      </span>
      <span className="relative block">
        <input
          type="text"
          readOnly
          value={value || "N/A"}
          className={[
            "w-full rounded-md border border-gray-100 bg-white p-2.5 text-sm shadow-sm outline-none",
            muted ? "text-light-grey" : valueClassName,
            hasLinkIcon ? "pr-9" : "",
          ].join(" ")}
        />
        {hasLinkIcon ? (
          <Icon
            icon="externalLink"
            size={16}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-light-grey"
          />
        ) : null}
      </span>
    </label>
  );
}

function LoadingState({ label }: { label: string }) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center text-dark-blue">
      <Icon icon="progress_activity" size={44} className="mb-3 animate-spin" />
      <p className="text-sm font-extrabold uppercase tracking-widest">{label}</p>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex min-h-64 items-center justify-center rounded-xl bg-white text-sm font-semibold text-grey">
      {message}
    </div>
  );
}

function formatDate(value: string | null) {
  if (!value) {
    return "N/A";
  }

  return new Date(value).toLocaleDateString("en-GB");
}

function formatRM(value: number) {
  return Number(value).toLocaleString("ms-MY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
