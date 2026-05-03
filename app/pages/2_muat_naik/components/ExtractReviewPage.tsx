"use client";

import { useEffect, useMemo, useState } from "react";
import Icon from "../../../components/Icon";

export type ReviewKind = "bayaran" | "tunggakan" | "penghuni" | "kuarters";

type StatCard = {
  label: string;
  value: string;
  helper: string;
  icon: string;
  tone: "blue" | "green";
};

type ExtractedPenghuniRecord = {
  nama: string;
  noKadPengenalan: string;
  kuarters: string;
  unit: string;
  alamatKuarters: string;
  perhubungan: string;
  pekerjaan: string;
  jabatan: string;
  sourceSheet: string;
  sourceRow: number;
};

type PenghuniExtractResult = {
  documentType: "penghuni";
  recordCount: number;
  records: ExtractedPenghuniRecord[];
};

const residents = [
  {
    name: "Ahmad Azam bin Sulaiman",
    ic: "850412-81-5543",
    date: "12 Julai 2024",
    receipt: "RES-2024-001",
    amount: "450.00",
    quarters: "Kelas C\nUnit 12-A, Blok B",
    contact: "012-3456789\nazam.sul@gmail.com",
    job: "Penolong Jurutera\nJA29\nJKR Daerah Johor Bahru",
  },
  {
    name: "Siti Yasmin binti Abdullah",
    ic: "920115-81-6622",
    date: "12 Julai 2024",
    receipt: "RES-2024-002",
    amount: "320.00",
    quarters: "Kelas D\nUnit 05-C, Blok E",
    contact: "019-8765432\nyasmin.abd@moe.gov.my",
    job: "Guru Siswazah DG41\nSK Taman Universiti",
  },
  {
    name: "Mohd Khairul bin Idris",
    ic: "780922-81-4431",
    date: "12 Julai 2024",
    receipt: "RES-2024-003",
    amount: "150.00",
    quarters: "Kelas B\nNo. 22, Jalan Perdana 4",
    contact: "017-1122334\nkhairul.idris@health.gov.my",
    job: "Pegawai Perubatan\nUD48\nHospital Sultanah Aminah",
  },
];

const reviewContent: Record<
  ReviewKind,
  {
    fileName: string;
    stats: StatCard[];
    addLabel: string;
  }
> = {
  bayaran: {
    fileName: "Penyata_Gaji_Jan_2024.pdf",
    stats: [
      {
        label: "Tarikh Bayaran",
        value: "Julai 2024",
        helper: "Data Bulanan",
        icon: "calendar_month",
        tone: "blue",
      },
      {
        label: "Jumlah Rekod",
        value: "45",
        helper: "Perlu Disemak",
        icon: "fact_check",
        tone: "green",
      },
      {
        label: "Jumlah Bayaran (RM)",
        value: "RM 15,450.00",
        helper: "Telah Dikumpul",
        icon: "payments",
        tone: "green",
      },
    ],
    addLabel: "Tambah Bayaran",
  },
  tunggakan: {
    fileName: "Penyata_Tunggakan_Jan_2024.pdf",
    stats: [
      {
        label: "Tarikh Tunggakan",
        value: "12 Januari 2024",
        helper: "Data Bulanan",
        icon: "calendar_month",
        tone: "blue",
      },
      {
        label: "Jumlah Rekod",
        value: "45",
        helper: "Perlu Disemak",
        icon: "fact_check",
        tone: "green",
      },
      {
        label: "Jumlah Tunggakan (RM)",
        value: "RM 15,450.00",
        helper: "Telah Tertunggak",
        icon: "payments",
        tone: "green",
      },
    ],
    addLabel: "Tambah Tunggakan",
  },
  penghuni: {
    fileName: "Penyata_Penghuni_Jan_2024.pdf",
    stats: [
      {
        label: "Jumlah Rekod",
        value: "45",
        helper: "Perlu Disemak",
        icon: "fact_check",
        tone: "green",
      },
    ],
    addLabel: "Tambah Penghuni",
  },
  kuarters: {
    fileName: "Penyata_Kuarters_Jan_2024.pdf",
    stats: [
      {
        label: "Jumlah Rekod",
        value: "158",
        helper: "Perlu Disemak",
        icon: "fact_check",
        tone: "green",
      },
      {
        label: "Total Kelas",
        value: "12",
        helper: "Kategori Aktif",
        icon: "category",
        tone: "blue",
      },
      {
        label: "Total Unit",
        value: "146",
        helper: "Unit Berdaftar",
        icon: "apartment",
        tone: "blue",
      },
    ],
    addLabel: "Tambah Kelas",
  },
};

function StatCards({ stats }: { stats: StatCard[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="min-h-[116px] rounded border border-[#E7EAF2] bg-white px-6 py-5 shadow-sm"
        >
          <p className="text-[10px] font-extrabold uppercase text-[#667085]">
            {stat.label}
          </p>
          <p className="mt-2 text-[30px] font-extrabold leading-none text-[#07162F]">
            {stat.value}
          </p>
          <div
            className={[
              "mt-4 flex items-center gap-1 text-[10px] font-extrabold",
              stat.tone === "green" ? "text-green" : "text-blue-500",
            ].join(" ")}
          >
            <Icon icon={stat.icon} size={12} weight={700} />
            {stat.helper}
          </div>
        </div>
      ))}
    </div>
  );
}

function Pagination({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-between border-t border-[#EEF1F7] px-5 py-3 text-[11px] text-[#4B5567]">
      <div className="flex items-center gap-1">
        <button className="h-7 w-7 rounded bg-dark-blue text-white">1</button>
        <button className="h-7 w-7 rounded text-[#344054]">2</button>
        <button className="h-7 w-7 rounded text-[#344054]">3</button>
        <span className="px-2">...</span>
        <button className="h-7 w-7 rounded text-[#344054]">15</button>
        <button className="h-7 w-7 rounded text-[#344054]">
          <Icon icon="chevron_right" size={14} />
        </button>
      </div>
      <span>{label}</span>
    </div>
  );
}

function RowActions({ showDelete = true }: { showDelete?: boolean }) {
  return (
    <div className="flex items-center justify-center gap-4">
      <Icon icon="save" size={16} weight={700} className="text-green" />
      {showDelete ? (
        <Icon icon="delete" size={16} weight={700} className="text-red" />
      ) : (
        <Icon icon="edit" size={16} weight={700} className="text-dark-blue" />
      )}
    </div>
  );
}

function PaymentTable({ kind }: { kind: "bayaran" | "tunggakan" }) {
  const isPayment = kind === "bayaran";

  return (
    <div className="overflow-hidden rounded-lg border border-[#DCE2F1] bg-white">
      <table className="w-full table-fixed text-left text-xs">
        <thead className="bg-[#F7F9FF] text-[10px] font-extrabold uppercase text-[#667085]">
          <tr>
            <th className="w-10 px-5 py-4">
              <input type="checkbox" className="h-4 w-4" />
            </th>
            <th className="px-4 py-4">Penghuni</th>
            {isPayment ? <th className="w-[14%] px-4 py-4">Tarikh</th> : null}
            {isPayment ? (
              <th className="w-[16%] px-4 py-4">No. Resit</th>
            ) : null}
            {isPayment ? <th className="w-[18%] px-4 py-4">Catatan</th> : null}
            <th className="w-[18%] px-4 py-4 text-right">
              {isPayment ? "Amaun Bayar (RM)" : "Jumlah Tunggakan (RM)"}
            </th>
            <th className="w-[16%] px-4 py-4 text-center">Tindakan</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#EEF1F7]">
          {residents.map((resident, index) => (
            <tr key={resident.ic}>
              <td className="px-5 py-4">
                <input
                  type="checkbox"
                  defaultChecked={index === 0}
                  className="h-4 w-4 accent-dark-blue"
                />
              </td>
              <td className="px-4 py-4">
                <p className="font-extrabold text-[#172033]">{resident.name}</p>
                <p className="text-[10px] font-semibold text-[#667085]">
                  {resident.ic}
                </p>
              </td>
              {isPayment ? <td className="px-4 py-4">{resident.date}</td> : null}
              {isPayment ? <td className="px-4 py-4">{resident.receipt}</td> : null}
              {isPayment ? (
                <td className="px-4 py-4">
                  {index === 0 ? (
                    <input
                      className="h-10 w-full rounded-lg border border-[#E6EAF2] px-3 text-xs"
                      placeholder="Tambah catatan..."
                    />
                  ) : (
                    "N/A"
                  )}
                </td>
              ) : null}
              <td className="px-4 py-4 text-right">
                <input
                  className="h-10 w-[92px] rounded-lg border border-[#E6EAF2] px-3 text-right font-extrabold"
                  defaultValue={resident.amount}
                  readOnly={index !== 0}
                />
              </td>
              <td className="px-4 py-4">
                <RowActions showDelete={index === 0} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <Pagination label="Memaparkan 1-3 Daripada 45 Rekod" />
    </div>
  );
}

function ResidentTable({ records }: { records: ExtractedPenghuniRecord[] }) {
  const displayRecords =
    records.length > 0
      ? records
      : residents.map((resident, index) => ({
          nama: resident.name,
          noKadPengenalan: resident.ic,
          kuarters: resident.quarters.split("\n")[0],
          unit: resident.quarters.split("\n")[1] ?? "",
          alamatKuarters: "",
          perhubungan: resident.contact,
          pekerjaan: resident.job.split("\n").slice(0, 2).join(" "),
          jabatan: resident.job.split("\n").slice(2).join(" "),
          sourceSheet: "Contoh",
          sourceRow: index + 1,
        }));

  return (
    <div className="overflow-hidden rounded-lg border border-[#DCE2F1] bg-white">
      <table className="w-full table-fixed text-left text-xs">
        <thead className="bg-[#F7F9FF] text-[10px] font-extrabold uppercase text-[#667085]">
          <tr>
            <th className="w-10 px-5 py-4">
              <input type="checkbox" className="h-4 w-4" />
            </th>
            <th className="px-4 py-4">Penghuni</th>
            <th className="px-4 py-4">Kuarters</th>
            <th className="px-4 py-4">Perhubungan</th>
            <th className="px-4 py-4">Pekerjaan</th>
            <th className="w-[12%] px-4 py-4 text-center">Tindakan</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#EEF1F7]">
          {displayRecords.map((resident) => (
            <tr key={`${resident.sourceSheet}-${resident.sourceRow}`}>
              <td className="px-5 py-4">
                <input type="checkbox" className="h-4 w-4" />
              </td>
              <td className="px-4 py-4">
                <p className="font-extrabold text-[#172033]">{resident.nama}</p>
                <p className="text-[10px] font-semibold text-[#667085]">
                  {resident.noKadPengenalan}
                </p>
              </td>
              <td className="whitespace-pre-line px-4 py-4">
                {[resident.kuarters, resident.unit, resident.alamatKuarters]
                  .filter(Boolean)
                  .join("\n")}
              </td>
              <td className="whitespace-pre-line px-4 py-4">
                {resident.perhubungan || "-"}
              </td>
              <td className="whitespace-pre-line px-4 py-4">
                {[resident.pekerjaan, resident.jabatan].filter(Boolean).join("\n")}
              </td>
              <td className="px-4 py-4 text-center">
                <Icon
                  icon="visibility"
                  size={17}
                  weight={700}
                  className="text-dark-blue"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <Pagination
        label={`Memaparkan 1-${displayRecords.length} Daripada ${displayRecords.length} Rekod`}
      />
    </div>
  );
}

function QuartersTable() {
  const classes = [
    ["C", "450.00", "50.00", "0.00"],
    ["F", "320.00", "30.00", "10.00"],
    ["E", "150.00", "20.00", "0.00"],
    ["G", "120.00", "15.00", "0.00"],
  ];
  const units = ["JB-K01-A-04", "JH-K01-A-05", "JB-K01-B-02", "JB-K01-B-03"];

  return (
    <div className="grid overflow-hidden rounded-lg border border-[#DCE2F1] bg-white lg:grid-cols-[1fr_240px]">
      <div className="overflow-x-auto">
        <table className="w-full table-fixed text-left text-xs">
          <thead className="bg-[#F7F9FF] text-[10px] font-extrabold uppercase text-[#667085]">
            <tr>
              <th className="w-10 px-5 py-4">
                <input type="checkbox" className="h-4 w-4" />
              </th>
              <th className="px-4 py-4">Kelas</th>
              <th className="px-4 py-4 text-right">Sewa (RM)</th>
              <th className="px-4 py-4 text-right">Senggara (RM)</th>
              <th className="px-4 py-4 text-right">Penalti (RM)</th>
              <th className="px-4 py-4 text-center">Tindakan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EEF1F7]">
            {classes.map(([name, rent, maintenance, penalty], index) => (
              <tr key={name}>
                <td className="px-5 py-4">
                  <input
                    type="checkbox"
                    defaultChecked={index === 0}
                    className="h-4 w-4 accent-dark-blue"
                  />
                </td>
                <td className="px-4 py-4 font-extrabold text-[#172033]">
                  {name}
                </td>
                {[rent, maintenance, penalty].map((value) => (
                  <td key={value} className="px-4 py-4 text-right">
                    <input
                      className="h-9 w-[88px] rounded border border-[#E6EAF2] px-3 text-right font-extrabold"
                      defaultValue={value}
                      readOnly={index !== 0}
                    />
                  </td>
                ))}
                <td className="px-4 py-4">
                  <RowActions showDelete={index === 0} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination label="Memaparkan 1-4 daripada 12 Kelas" />
      </div>

      <div className="border-t border-[#DCE2F1] lg:border-l lg:border-t-0">
        <div className="flex items-center justify-between bg-[#F7F9FF] px-5 py-4 text-[10px] font-extrabold uppercase text-dark-blue">
          Senarai Unit
          <Icon icon="add_circle" size={15} weight={700} />
        </div>
        <div className="grid grid-cols-[1fr_64px] border-b border-[#EEF1F7] px-5 py-3 text-[10px] font-extrabold uppercase text-[#667085]">
          <span>ID Unit</span>
          <span className="text-center">Tindakan</span>
        </div>
        {units.map((unit, index) => (
          <div
            key={unit}
            className="grid grid-cols-[1fr_64px] items-center px-5 py-4 text-xs"
          >
            <span
              className={
                index === 0
                  ? "rounded border border-[#E6EAF2] px-3 py-2 font-extrabold"
                  : "font-extrabold"
              }
            >
              {unit}
            </span>
            <span className="flex justify-center gap-3">
              {index === 0 ? (
                <>
                  <Icon icon="save" size={15} weight={700} className="text-green" />
                  <Icon icon="delete" size={15} weight={700} className="text-red" />
                </>
              ) : (
                <Icon icon="edit" size={15} weight={700} className="text-dark-blue" />
              )}
            </span>
          </div>
        ))}
        <div className="flex justify-center border-t border-[#EEF1F7] px-5 py-3">
          <button className="h-7 w-7 rounded bg-dark-blue text-xs text-white">1</button>
        </div>
      </div>
    </div>
  );
}

function ReviewTable({
  kind,
  penghuniRecords,
}: {
  kind: ReviewKind;
  penghuniRecords: ExtractedPenghuniRecord[];
}) {
  if (kind === "bayaran" || kind === "tunggakan") {
    return <PaymentTable kind={kind} />;
  }

  if (kind === "penghuni") {
    return <ResidentTable records={penghuniRecords} />;
  }

  return <QuartersTable />;
}

export default function ExtractReviewPage({ kind }: { kind: ReviewKind }) {
  const [penghuniExtract, setPenghuniExtract] =
    useState<PenghuniExtractResult | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState("");

  useEffect(() => {
    if (kind !== "penghuni") {
      return;
    }

    const storedExtract = sessionStorage.getItem("penghuniExtractResult");
    const storedFileName = sessionStorage.getItem("penghuniExtractFileName");

    if (storedExtract) {
      setPenghuniExtract(JSON.parse(storedExtract));
    }

    if (storedFileName) {
      setUploadedFileName(storedFileName);
    }
  }, [kind]);

  const content = useMemo(() => {
    const baseContent = reviewContent[kind];

    if (kind !== "penghuni" || !penghuniExtract) {
      return baseContent;
    }

    return {
      ...baseContent,
      fileName: uploadedFileName || baseContent.fileName,
      stats: baseContent.stats.map((stat) =>
        stat.label === "Jumlah Rekod"
          ? {
              ...stat,
              value: String(penghuniExtract.recordCount),
            }
          : stat,
      ),
    };
  }, [kind, penghuniExtract, uploadedFileName]);

  return (
    <section className="min-h-full bg-[#F8F9FF]">
      <div className="flex w-full flex-col gap-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-4">
            <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded bg-[#FFEAEA] text-red">
              <Icon icon="picture_as_pdf" size={22} filled weight={700} />
            </span>
            <div className="min-w-0">
              <h1 className="truncate text-[26px] font-extrabold leading-tight text-[#07162F]">
                {content.fileName}
              </h1>
              <p className="mt-1 text-sm font-medium text-[#667085]">
                Sila sahkan ketepatan data yang telah diekstrak secara automatik.
              </p>
            </div>
          </div>

          <button className="inline-flex h-11 items-center justify-center gap-2 rounded border border-[#E1E5EF] bg-white px-6 text-xs font-extrabold text-[#344054] shadow-sm">
            <Icon icon="history" size={16} weight={600} />
            Semak Nanti
          </button>
        </div>

        <StatCards stats={content.stats} />

        <div className="overflow-hidden rounded-xl border border-[#DCE7FF] bg-[#EFF4FF] shadow-sm">
          <div className="flex items-start justify-between px-5 py-5">
            <div>
              <h2 className="text-lg font-extrabold text-[#07162F]">
                Pratinjau Data Ekstrak
              </h2>
              <p className="text-xs font-medium text-[#344054]">
                Sila semak maklumat sebelum pengesahan.
              </p>
            </div>
            <Icon icon="filter_alt" size={22} weight={500} className="text-[#667085]" />
          </div>
          <div className="px-2 pb-2">
            <ReviewTable
              kind={kind}
              penghuniRecords={penghuniExtract?.records ?? []}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <button className="inline-flex h-11 items-center justify-center gap-2 rounded bg-dark-blue px-6 text-xs font-extrabold text-white shadow-sm">
            <Icon icon="add" size={16} weight={700} />
            {content.addLabel}
          </button>

          <div className="flex flex-wrap gap-3">
            <button className="inline-flex h-11 items-center justify-center gap-2 rounded bg-dark-blue px-7 text-xs font-extrabold text-white shadow-sm">
              <Icon icon="settings_backup_restore" size={15} weight={700} />
              Sahkan Data
            </button>
            <button className="inline-flex h-11 items-center justify-center gap-2 rounded bg-green px-7 text-xs font-extrabold text-white shadow-sm">
              <Icon icon="done_all" size={15} weight={700} />
              Sahkan Semua Data
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
