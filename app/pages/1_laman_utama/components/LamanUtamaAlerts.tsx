"use client";

import Link from "next/link";
import Icon from "@/app/components/Icon/Icon";
import { ROUTES } from "@/app/constants/routes";

interface LamanUtamaAlertsProps {
  arrearsAmount?: string;
  arrearsCount?: number;
  pendingCount?: number;
  pendingUploadsToday?: number;
}

export default function LamanUtamaAlerts({
  arrearsAmount = "RM 0.00",
  arrearsCount = 0,
  pendingCount = 0,
  pendingUploadsToday = 0,
}: LamanUtamaAlertsProps) {
  return (
    <div className="flex flex-col gap-6 w-full h-[332px]">
      {/* 1. Tunggakan Card */}
      <div className="flex flex-col justify-between p-6 bg-white border border-[#EFF4FF] rounded-xl shadow-[0px_1px_2px_rgba(0,0,0,0.05)] flex-1">
        {/* Upper section */}
        <div className="flex flex-row gap-4 items-start">
          {/* Warning Icon Container */}
          <div className="flex items-center justify-center w-12 h-12 bg-[#BA1A1A]/10 text-red rounded-xl shrink-0">
            <Icon icon="warning" size={24} className="text-red font-bold" />
          </div>

          {/* Details */}
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-grey leading-5">
              Tunggakan Belum Bayar
            </span>
            <span className="text-[24px] font-bold text-red leading-8 mt-0.5">
              {arrearsAmount}
            </span>
            <span className="text-xs text-grey mt-0.5">
              {arrearsCount} Penghuni Terlibat
            </span>
          </div>
        </div>

        {/* Action Link Row */}
        <div className="flex justify-end items-center mt-3">
          <Link
            href={ROUTES.tunggakan}
            className="flex flex-row items-center gap-1.5 text-sm font-bold text-red hover:underline hover:scale-[0.98] active:scale-[0.96] transition-all cursor-pointer"
          >
            <span>Lihat Senarai</span>
            <Icon icon="chevronRight" size={14} className="text-red" />
          </Link>
        </div>
      </div>

      {/* 2. Semakan Card */}
      <div className="flex flex-col justify-between p-6 bg-white border border-[#EFF4FF] rounded-xl shadow-[0px_1px_2px_rgba(0,0,0,0.05)] flex-1">
        {/* Upper section */}
        <div className="flex flex-row gap-4 items-start">
          {/* Clock/Checklist Icon Container */}
          <div className="flex items-center justify-center w-12 h-12 bg-[#FEC652]/20 text-[#735200] rounded-xl shrink-0">
            <Icon icon="pending_actions" size={24} className="text-[#735200]" />
          </div>

          {/* Details */}
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-grey leading-5">
              Semakan Menunggu
            </span>
            <span className="text-[24px] font-bold text-[#0B1C30] leading-8 mt-0.5">
              {pendingCount} Rekod
            </span>
            <span className="text-xs text-grey mt-0.5">
              {pendingUploadsToday} Fail Dimuat Naik Hari Ini
            </span>
          </div>
        </div>

        {/* Action Link Row */}
        <div className="flex justify-end items-center mt-3">
          <Link
            href={ROUTES.bayaran}
            className="flex flex-row items-center gap-1.5 text-sm font-bold text-[#0B1C30] hover:underline hover:scale-[0.98] active:scale-[0.96] transition-all cursor-pointer"
          >
            <span>Proses Sekarang</span>
            <Icon icon="chevronRight" size={14} className="text-[#0B1C30]" />
          </Link>
        </div>
      </div>
    </div>
  );
}
