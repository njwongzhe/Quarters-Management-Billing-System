"use client";

import { ChangeEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "../../components/Icon";
import { ROUTES } from "../../constants/routes";

const categories = ["Bayaran", "Tunggakan", "Penghuni", "Kuarters"] as const;

type Category = (typeof categories)[number];

const reviewRoutes: Record<Category, string> = {
  Bayaran: "bayaran",
  Tunggakan: "tunggakan",
  Penghuni: "penghuni",
  Kuarters: "kuarters",
};

const processingRows: Record<
  Category,
  {
    name: string;
    uploader: string;
    time: string;
    tone: "red" | "green";
    icon: string;
  }[]
> = {
  Bayaran: [
    {
      name: "Penyata_Gaji_Jan_2024.pdf",
      uploader: "Ahmad Zaki",
      time: "12 Julai 2024, 10:30 AM",
      tone: "red",
      icon: "picture_as_pdf",
    },
    {
      name: "Resit_Bayaran_Julai.xlsx",
      uploader: "Siti Nurhaliza",
      time: "12 Julai 2024, 09:15 AM",
      tone: "green",
      icon: "table",
    },
    {
      name: "Ringkasan_Bayaran_Kulai.pdf",
      uploader: "Admin JKR",
      time: "11 Julai 2024, 04:45 PM",
      tone: "red",
      icon: "picture_as_pdf",
    },
  ],
  Tunggakan: [
    {
      name: "Senarai_Tunggakan_Julai.xlsx",
      uploader: "Admin JKR",
      time: "12 Julai 2024, 11:05 AM",
      tone: "green",
      icon: "table",
    },
    {
      name: "Notis_Tunggakan_Blok_B.pdf",
      uploader: "Ahmad Zaki",
      time: "11 Julai 2024, 03:20 PM",
      tone: "red",
      icon: "picture_as_pdf",
    },
  ],
  Penghuni: [
    {
      name: "Data_Penghuni_Blok_A.xlsx",
      uploader: "Siti Nurhaliza",
      time: "12 Julai 2024, 09:15 AM",
      tone: "green",
      icon: "table",
    },
    {
      name: "Borang_Penghuni_Baharu.pdf",
      uploader: "Admin JKR",
      time: "10 Julai 2024, 02:10 PM",
      tone: "red",
      icon: "picture_as_pdf",
    },
  ],
  Kuarters: [
    {
      name: "Laporan_Kuarters_Kulai.pdf",
      uploader: "Admin JKR",
      time: "11 Julai 2024, 04:45 PM",
      tone: "red",
      icon: "picture_as_pdf",
    },
    {
      name: "Inventori_Unit_Kuarters.xlsx",
      uploader: "Siti Nurhaliza",
      time: "09 Julai 2024, 08:40 AM",
      tone: "green",
      icon: "table",
    },
  ],
};

export default function MuatNaikPage() {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState<Category>("Bayaran");
  const [selectedFileName, setSelectedFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeRows = processingRows[activeCategory];

  function handleChooseFile() {
    fileInputRef.current?.click();
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setSelectedFileName(file?.name ?? "");
  }

  function handleUploadAction() {
    if (!selectedFileName) {
      handleChooseFile();
      return;
    }

    router.push(`${ROUTES.muatNaik}/semakan/${reviewRoutes[activeCategory]}`);
  }

  return (
    <section className="min-h-full bg-[#F8F9FF]">
      <div className="flex w-full flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-[30px] font-extrabold leading-tight text-[#07162F]">
            Muat Naik Document
          </h1>
          <p className="text-[15px] font-medium text-[#667085]">
            Sila muat naik fail untuk pemprosesan maklumat sistem.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 pt-3">
          <div className="grid h-12 w-full max-w-[530px] grid-cols-4 rounded-xl bg-[#EFF4FF] p-1.5 shadow-[inset_0_0_0_1px_rgba(219,226,242,0.45)]">
            {categories.map((category) => {
              const isActive = activeCategory === category;

              return (
                <button
                  key={category}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => setActiveCategory(category)}
                  className={[
                    "rounded-lg text-xs font-extrabold transition-colors",
                    isActive
                      ? "bg-white text-dark-blue shadow-[0_2px_8px_rgba(15,23,42,0.08)]"
                      : "text-[#43506B] hover:bg-white/60 hover:text-dark-blue",
                  ].join(" ")}
                >
                  {category}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#DCE2F1] bg-white px-5 text-xs font-extrabold text-dark-blue shadow-sm transition hover:border-[#C8D2EA] hover:bg-[#FBFCFF]"
          >
            <Icon icon="download" size={17} weight={600} />
            Demo Document
          </button>
        </div>

        <div className="flex min-h-[330px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#C6CDDD] bg-white px-6 text-center">
          <div className="mb-6 flex h-[72px] w-[72px] items-center justify-center rounded-xl bg-[#EFF4FF] text-dark-blue">
            <Icon icon="cloud_upload" size={38} weight={700} />
          </div>
          <h2 className="text-[22px] font-extrabold leading-tight text-[#07162F]">
            Seret & Lepas Fail Di Sini
          </h2>
          <p className="mt-3 text-sm font-medium leading-6 text-[#667085]">
            Pastikan fail dalam format PDF atau Excel (.xlsx) sahaja.
            <br />
            Saiz fail maksimum adalah 25MB.
          </p>
          <button
            type="button"
            onClick={handleUploadAction}
            className="mt-6 inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-dark-blue px-8 text-sm font-extrabold text-white shadow-[0_14px_24px_rgba(21,30,102,0.22)] transition hover:bg-[#202A78]"
          >
            <Icon
              icon={selectedFileName ? "fact_check" : "add"}
              size={18}
              weight={700}
            />
            {selectedFileName
              ? "Kenal Pasti Untuk Proses"
              : "Pilih Fail Dari Komputer"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.xlsx,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="hidden"
            onChange={handleFileChange}
          />
          {selectedFileName ? (
            <p className="mt-3 max-w-full truncate text-xs font-bold text-[#43506B]">
              Fail dipilih: {selectedFileName}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-[#07162F]">
              Barisan Pemprosesan
            </h2>
            <span className="rounded-full bg-[#DDE8FF] px-3 py-1 text-[11px] font-extrabold text-[#2D4A9A]">
              {activeRows.length} Fail {activeCategory} Sedang Menunggu
            </span>
          </div>

          <div className="overflow-hidden rounded-xl border border-[#DCE2F1] bg-white shadow-sm">
            <table className="w-full table-fixed border-collapse text-left">
              <thead className="bg-[#EFF4FF] text-[10px] font-extrabold uppercase tracking-wide text-[#4B5567]">
                <tr>
                  <th className="w-[38%] px-6 py-4">Nama Dokumen</th>
                  <th className="w-[20%] px-5 py-4">Pemuat Naik</th>
                  <th className="w-[28%] px-5 py-4">Tarikh & Masa</th>
                  <th className="w-[14%] px-5 py-4 text-center">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EEF1F7] text-xs">
                {activeRows.map((row) => (
                  <tr key={row.name} className="h-[58px]">
                    <td className="px-6 py-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span
                          className={[
                            "flex h-7 w-7 shrink-0 items-center justify-center rounded",
                            row.tone === "green"
                              ? "bg-[#EAF8EF] text-green"
                              : "bg-[#FFF0F0] text-red",
                          ].join(" ")}
                        >
                          <Icon icon={row.icon} size={16} filled weight={600} />
                        </span>
                        <span className="truncate font-extrabold text-[#172033]">
                          {row.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4 font-medium text-[#3B465A]">
                      {row.uploader}
                    </td>
                    <td className="px-5 py-4 font-medium text-[#3B465A]">
                      {row.time}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-center gap-5">
                        <button
                          type="button"
                          className="text-dark-blue transition hover:text-[#2D367D]"
                          title="Lihat"
                        >
                          <Icon icon="visibility" size={18} weight={600} />
                        </button>
                        <button
                          type="button"
                          className="text-red transition hover:text-[#8F1111]"
                          title="Padam"
                        >
                          <Icon icon="delete" size={18} weight={600} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
