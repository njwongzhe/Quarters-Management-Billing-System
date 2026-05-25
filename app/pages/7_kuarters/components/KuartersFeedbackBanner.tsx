"use client";

import GlobalFixedMessage from "@/app/components/Message/GlobalFixedMessage";

import type { KuartersNotice } from "./kuartersHelpers";

type KuartersFeedbackBannerProps = {
  notice: KuartersNotice | null;
  onDismiss: () => void;
};

export default function KuartersFeedbackBanner({
  notice,
  onDismiss,
}: KuartersFeedbackBannerProps) {
  return (
    <GlobalFixedMessage
      notice={notice}
      onDismiss={onDismiss}
    />
  );
}
