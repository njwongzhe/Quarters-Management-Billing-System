"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Icon from "@/app/components/Icon/Icon";

type HeaderBackButtonProps = {
  onBack: () => void;
};

export default function HeaderBackButton({ onBack }: HeaderBackButtonProps) {
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const target = document.getElementById("header-back-portal");
    setPortalTarget(target);
  }, []);

  if (!portalTarget) {
    return null;
  }

  return createPortal(
    <button
      type="button"
      onClick={onBack}
      className="flex h-8 w-8 items-center justify-center rounded-full border border-light-grey/20 bg-surface text-grey hover:bg-surface-muted hover:text-dark-blue active:scale-95 transition-all shadow-sm cursor-pointer"
      title="Kembali"
    >
      <Icon icon="arrow_back" size={16} weight={700} />
    </button>,
    portalTarget
  );
}
