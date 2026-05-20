"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import Icon from "@/app/components/Icon/Icon";

import ButiranBayaranModal from "./ButiranBayaranModal";
import TambahBayaranModal from "./TambahBayaranModal";

type BayaranRowActionsProps = {
  paymentId: string;
};

export default function BayaranRowActions({ paymentId }: BayaranRowActionsProps) {
  const router = useRouter();
  const [activeModal, setActiveModal] = useState<"detail" | "manual" | null>(null);

  const closeModal = () => setActiveModal(null);

  return (
    <>
      <div className="flex items-center justify-center gap-6 text-dark-blue">
        <button
          type="button"
          aria-label="Lihat butiran bayaran"
          title="Lihat butiran bayaran"
          onClick={() => setActiveModal("detail")}
        >
          <Icon icon="visibility" size={16} weight={600} />
        </button>
        <button
          type="button"
          aria-label="Tambah bayaran manual"
          title="Tambah bayaran manual"
          onClick={() => setActiveModal("manual")}
        >
          <Icon icon="add" size={18} weight={700} />
        </button>
      </div>

      <ButiranBayaranModal
        key={activeModal === "detail" ? `detail-${paymentId}` : "detail-closed"}
        isOpen={activeModal === "detail"}
        paymentId={paymentId}
        onClose={closeModal}
      />
      <TambahBayaranModal
        key={activeModal === "manual" ? `manual-${paymentId}` : "manual-closed"}
        isOpen={activeModal === "manual"}
        paymentId={paymentId}
        onClose={closeModal}
        onSaved={() => router.refresh()}
      />
    </>
  );
}
