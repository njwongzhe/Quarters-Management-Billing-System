"use client";

import Icon, { commonIcons } from "@/app/components/Icon/Icon";

type BayaranRowActionsProps = {
  onAddPayment: (paymentId: string) => void;
  onViewPayment: (paymentId: string) => void;
  paymentId: string;
};

function ActionButton({
  icon,
  label,
  onClick,
  textClass,
}: {
  icon: string;
  label: string;
  onClick?: () => void;
  textClass: string;
}) {
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center rounded-lg p-2 transition-colors hover:bg-background ${textClass}`}
      aria-label={label}
      title={label}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
    >
      <Icon icon={icon} size={18} />
    </button>
  );
}

export default function BayaranRowActions({
  onAddPayment,
  onViewPayment,
  paymentId,
}: BayaranRowActionsProps) {
  return (
    <div
      className="flex items-center justify-center gap-1"
      data-payment-id={paymentId}
    >
      <ActionButton
        icon={commonIcons.eye}
        label="Lihat butiran bayaran"
        onClick={() => onViewPayment(paymentId)}
        textClass="text-dark-blue"
      />
      <ActionButton
        icon="add"
        label="Tambah bayaran manual"
        onClick={() => onAddPayment(paymentId)}
        textClass="text-grey"
      />
    </div>
  );
}
