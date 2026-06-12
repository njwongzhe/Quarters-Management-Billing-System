"use client";

import { useEffect, useState } from "react";
import Icon from "@/app/components/Icon/Icon";

type StatusState = "checking" | "online" | "offline";

export default function AiServiceStatus({ className }: { className?: string }) {
  const [status, setStatus] = useState<StatusState>("checking");
  const [isRefreshing, setIsRefreshing] = useState(false);

  async function checkStatus() {
    setIsRefreshing(true);
    try {
      const res = await fetch("/api/extract/ai-status");
      const data = await res.json().catch(() => null);
      if (data?.success && data?.online) {
        setStatus("online");
      } else {
        setStatus("offline");
      }
    } catch (error) {
      setStatus("offline");
    } finally {
      // Small timeout to give user feedback of checking
      setTimeout(() => {
        setIsRefreshing(false);
      }, 600);
    }
  }

  useEffect(() => {
    checkStatus();
  }, []);

  return (
    <div className={`flex items-center gap-2 ${className ?? ""}`}>
      <div
        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold shadow-sm transition-all duration-300 cursor-help ${
          status === "online"
            ? "border-green/20 bg-green/10 text-green dark:border-green/30 dark:bg-green/15"
            : status === "offline"
              ? "border-red/20 bg-red/10 text-red dark:border-red/30 dark:bg-red/15"
              : "border-grey/20 bg-grey/10 text-grey/80 dark:border-grey/30 dark:bg-grey/15"
        }`}
        title={
          status === "online"
            ? "AI untuk Mod Ketat sedang beroperasi."
            : status === "offline"
              ? "AI untuk Mod Ketat masih belum dimulakan. Mengambil masa kira-kira 1-5 minit. Sila hubungi pentadbir jika ia masih belum aktif selepas 5 minit."
              : "Menyemak status AI untuk Mod Ketat..."
        }
      >
        {/* Pulsing indicator dot */}
        <span className="relative flex h-2 w-2">
          {status === "online" && (
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green opacity-75"></span>
          )}
          {status === "offline" && (
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red opacity-75"></span>
          )}
          {status === "checking" && (
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-grey opacity-75"></span>
          )}
          <span
            className={`relative inline-flex h-2 w-2 rounded-full ${
              status === "online"
                ? "bg-green"
                : status === "offline"
                  ? "bg-red"
                  : "bg-grey"
            }`}
          ></span>
        </span>

        {/* Status Text */}
        <span className="tracking-wide">
          {status === "online"
            ? "AI Ekstraksi Aktif"
            : status === "offline"
              ? "AI Tidak Aktif"
              : "Menyemak status AI..."}
        </span>
      </div>

      {/* Refresh Button with Micro-animation */}
      <button
        type="button"
        onClick={checkStatus}
        disabled={isRefreshing}
        className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-surface text-grey hover:bg-surface-muted hover:text-content active:scale-95 disabled:opacity-50 transition-all duration-200 shadow-sm"
        title="Semak Semula Status AI"
      >
        <Icon
          icon="sync"
          size={14}
          className={`${isRefreshing ? "animate-spin" : ""}`}
        />
      </button>
    </div>
  );
}
