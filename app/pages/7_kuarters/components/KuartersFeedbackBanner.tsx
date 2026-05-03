"use client";

import { useEffect, useRef } from "react";

import Icon from "@/app/components/Icon";

import type { KuartersNotice, NoticeTone } from "./kuartersHelpers";

type KuartersFeedbackBannerProps = {
  notice: KuartersNotice | null;
  onDismiss: () => void;
};

const toneStyles: Record<
  NoticeTone,
  { containerClass: string; iconClass: string; icon: string }
> = {
  success: {
    containerClass: "border-green/25 bg-green/10",
    iconClass: "text-green",
    icon: "check_circle",
  },
  error: {
    containerClass: "border-red/20 bg-red/10",
    iconClass: "text-red",
    icon: "error",
  },
  info: {
    containerClass: "border-dark-blue/15 bg-light-blue/10",
    iconClass: "text-dark-blue",
    icon: "info",
  },
};

export default function KuartersFeedbackBanner({
  notice,
  onDismiss,
}: KuartersFeedbackBannerProps) {
  const onDismissRef = useRef(onDismiss);

  useEffect(() => {
    onDismissRef.current = onDismiss;
  }, [onDismiss]);

  useEffect(() => {
    if (!notice) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      onDismissRef.current();
    }, 5000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [notice]);

  if (!notice) {
    return null;
  }

  const tone = toneStyles[notice.tone];

  return (
    <div
      className={`fixed bottom-24 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 items-start justify-between gap-3 rounded-2xl border px-4 py-3 shadow-[0_18px_45px_rgba(13,47,86,0.18)] backdrop-blur sm:bottom-8 ${tone.containerClass}`}
      role={notice.tone === "error" ? "alert" : "status"}
    >
      <div className="flex items-start gap-3">
        <Icon icon={tone.icon} size={20} className={tone.iconClass} />
        <p className="text-sm font-medium text-dark-grey">{notice.message}</p>
      </div>

      <button
        type="button"
        className="inline-flex items-center justify-center rounded-md p-1 text-grey transition-colors hover:bg-white/60 hover:text-dark-grey"
        aria-label="Tutup mesej"
        onClick={onDismiss}
      >
        <Icon icon="close" size={18} />
      </button>
    </div>
  );
}
