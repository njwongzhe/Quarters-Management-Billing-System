import type { ReviewContent, ReviewKind } from "./types";

export const reviewContent: Record<ReviewKind, ReviewContent> = {
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
  },
  kuarters: {
    fileName: "Penyata_Kuarters_Jan_2024.pdf",
    stats: [
      {
        label: "Total Kategori",
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
  },
};
