"use client";

import { useMemo, useState } from "react";

import Icon, { commonIcons } from "@/app/components/Icon/Icon";
import { DateField, InputField, Topic } from "@/app/components/InputField";
import type {
  BayaranDetail,
  ManualPaymentMutationResult,
} from "@/lib/payments/bayaran-types";

type AddPaymentOverlayProps = {
  paymentDetails: BayaranDetail;
  paymentMonthKey: string;
  onClose: () => void;
  onSaved: (result: ManualPaymentMutationResult) => void;
};

type PaymentDraft = {
  id: string;
  paymentDate: string;
  receiptNo: string;
  description: string;
  amount: string;
};

type ManualPaymentResponse = {
  success: boolean;
  message?: string;
  data?: {
    result?: ManualPaymentMutationResult;
  };
};

function createEmptyPaymentDraft(): PaymentDraft {
  return {
    id: createClientId(),
    paymentDate: "",
    receiptNo: "",
    description: "",
    amount: "",
  };
}

export default function AddPaymentOverlay({
  paymentDetails,
  paymentMonthKey,
  onClose,
  onSaved,
}: AddPaymentOverlayProps) {
  const [drafts, setDrafts] = useState<PaymentDraft[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const currentArrears = paymentDetails.payment.arrearsAmount ?? 0;
  const totalPaid = useMemo(
    () =>
      drafts.reduce((total, draft) => total + (parseAmount(draft.amount) ?? 0), 0),
    [drafts],
  );
  const remainingBalance = currentArrears - totalPaid;

  function handleDraftChange(
    draftId: string,
    field: keyof Omit<PaymentDraft, "id">,
    value: string,
  ) {
    setDrafts((currentDrafts) =>
      currentDrafts.map((draft) =>
        draft.id === draftId ? { ...draft, [field]: value } : draft,
      ),
    );
    setErrorMessage(null);
  }

  function handleAddDraft() {
    setDrafts((currentDrafts) => [...currentDrafts, createEmptyPaymentDraft()]);
    setErrorMessage(null);
  }

  function handleDeleteDraft(draftId: string) {
    setDrafts((currentDrafts) =>
      currentDrafts.filter((draft) => draft.id !== draftId),
    );
    setErrorMessage(null);
  }

  async function handleSave() {
    const validationMessage = validateDrafts(drafts);

    if (validationMessage) {
      setErrorMessage(validationMessage);
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const response = await fetch(
        `/api/payments/${paymentDetails.id}/manual?paymentMonth=${paymentMonthKey}`,
        {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          records: drafts.map((draft) => ({
            paymentDate: draft.paymentDate,
            receiptNo: draft.receiptNo,
            description: draft.description.trim() || "bayaran",
            amount: parseAmount(draft.amount) ?? 0,
          })),
        }),
        },
      );
      const payload = (await response.json().catch(() => null)) as
        | ManualPaymentResponse
        | null;

      if (!response.ok || !payload?.success || !payload.data?.result) {
        throw new Error(payload?.message ?? "Gagal menyimpan bayaran manual.");
      }

      onSaved(payload.data.result);
      onClose();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Gagal menyimpan bayaran manual.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div
      className="fixed top-0 left-55 right-0 bottom-0 z-50 bg-black/40 p-12 backdrop-blur-md flex items-start justify-center"
      onClick={onClose}
    >
      <section
        className="relative w-full rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-full bg-light-blue"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-payment-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-center justify-between bg-dark-blue p-6 text-white">
          <div>
            <h2 id="add-payment-title" className="text-lg font-bold">
              TAMBAH BAYARAN
            </h2>
            <p className="text-xs font-extralight text-light-grey">
              SUNTING MAKLUMAT PEMBAYARAN SEMASA
            </p>
          </div>
          <button
            type="button"
            className="hover:scale-96 active:scale-92 text-white"
            aria-label="Tutup tambah bayaran"
            onClick={onClose}
          >
            <Icon icon="close" size={20} />
          </button>
        </header>

        <div className="overflow-y-auto bg-light-blue p-6">
          <div className="flex flex-col gap-8">
            <section className="flex flex-col gap-4">
              <div className="flex items-center justify-between gap-4">
                <Topic content="BAYARAN DITAMBAH" />
                <button
                  type="button"
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-surface-muted px-4 py-2 text-xs font-bold uppercase text-dark-blue transition hover:bg-dark-blue hover:text-white"
                  onClick={handleAddDraft}
                >
                  <Icon icon="add" size={17} />
                  Tambah Bayaran Baru
                </button>
              </div>

              {drafts.length === 0 ? (
                <div className="rounded-lg border border-dashed border-light-grey/50 bg-surface/70 px-5 py-8 text-center text-sm font-semibold text-grey">
                  Tiada bayaran ditambah.
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="grid grid-cols-[184px_226px_1fr_184px_36px] gap-4 px-1 text-[10px] font-bold uppercase tracking-widest text-content-muted">
                    <div>Tarikh</div>
                    <div>No. Resit</div>
                    <div>Catatan</div>
                    <div className="text-right">Amaun (RM)</div>
                    <div />
                  </div>

                  {drafts.map((draft) => (
                    <PaymentDraftRow
                      key={draft.id}
                      draft={draft}
                      disabled={isSaving}
                      onChange={handleDraftChange}
                      onDelete={handleDeleteDraft}
                    />
                  ))}
                </div>
              )}
            </section>

            <section className="flex flex-col gap-4">
              <Topic content="MAKLUMAT BAYARAN" />
              <div className="flex flex-col gap-3 relative overflow-hidden rounded-lg bg-dark-blue p-4 text-white shadow-[0_24px_40px_rgba(23,31,111,0.18)]">
                {/* Arrears Currently */}
                <div className="flex items-center justify-between gap-4">
                  <div className="text-xs font-bold uppercase text-light-grey">TUNGGAKAN SEMASA</div>
                  <div className="text-sm font-bold">RM {formatMoney(currentArrears)}</div>
                </div>

                <hr className="border-white/20" />

                {/* Total Payment */}
                <div className="flex items-center justify-between gap-4">
                  <div className="text-xs font-bold uppercase text-light-grey">AMAUN BAYAR</div>
                  <div className="text-sm font-bold">RM {formatMoney(totalPaid)}</div>
                </div>

                <hr className="border-white/20" />

                <div className="flex items-center justify-between">
                  {/* Arrears Left */}
                  <div className="flex flex-col gap-1">
                    <div className="text-xs font-bold uppercase text-light-grey">BAKI TUNGGAKAN</div>
                    <div className="text-2xl font-bold text-info">{formatSignedMoney(remainingBalance)}</div>
                  </div>

                  {/* Icon */}
                  <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white/10">
                    <Icon
                      icon={remainingBalance <= 0 ? "check_circle" : "priority_high"}
                      size={40}
                      filled
                    />
                  </div>
                </div>
              </div>
            </section>

            {errorMessage ? (
              <div className="rounded-lg border border-red/20 bg-surface px-4 py-3 text-sm font-semibold text-red">
                {errorMessage}
              </div>
            ) : null}

            <footer className="flex items-center justify-between">
              <div className="flex flex-row gap-1 items-center justify-center text-grey/80">
                <Icon icon="edit" size={13} className=""></Icon>
                <div className="text-xs">Sedang menambah bayaran rekod...</div>
              </div>
              <div className="flex gap-3 w-xs">
                <button
                  className="flex flex-1 items-center justify-center gap-1 whitespace-nowrap font-bold text-xs text-white bg-red px-5 py-3 rounded-md hover:bg-red/90 disabled:opacity-50 disabled:cursor-not-allowed"
                  type="button"
                  disabled={isSaving}
                  onClick={onClose}
                >
                  <Icon icon={commonIcons.close} size={16} />
                  Batal
                </button>
                <button
                  className="flex flex-1 items-center justify-center gap-1 whitespace-nowrap font-bold text-xs text-white bg-green px-5 py-3 rounded-md hover:bg-green/90 disabled:opacity-50 disabled:cursor-not-allowed"
                  type="button"
                  disabled={isSaving || drafts.length === 0}
                  onClick={handleSave}
                >
                  <Icon icon={commonIcons.save} size={16} />
                  {isSaving ? "Sedang Simpan..." : "Simpan Rekod"}
                </button>
              </div>
            </footer>
          </div>
        </div>
      </section>
    </div>
  );
}

function PaymentDraftRow({
  disabled,
  draft,
  onChange,
  onDelete,
}: {
  disabled: boolean;
  draft: PaymentDraft;
  onChange: (
    draftId: string,
    field: keyof Omit<PaymentDraft, "id">,
    value: string,
  ) => void;
  onDelete: (draftId: string) => void;
}) {
  return (
    <div className="grid grid-cols-[184px_226px_1fr_184px_36px] items-start gap-4">
      <DateField
          label="Tarikh"
          showLabel={false}
          value={draft.paymentDate}
          placeholder="Pilih Tarikh"
          state={disabled ? "inactive" : "active"}
          onChange={(value) => onChange(draft.id, "paymentDate", value)}
      />

      <InputField
        label="No. Resit"
        showLabel={false}
        value={draft.receiptNo}
        placeholder="RES-"
        state={disabled ? "inactive" : "active"}
        onChange={(value) => onChange(draft.id, "receiptNo", value)}
      />

      <InputField
        label="Catatan"
        showLabel={false}
        value={draft.description}
        placeholder="bayaran"
        state={disabled ? "inactive" : "active"}
        onChange={(value) => onChange(draft.id, "description", value)}
      />

      <div
        onBlurCapture={() => {
          const parsedAmount = parseAmount(draft.amount);

          if (parsedAmount !== null) {
            onChange(draft.id, "amount", parsedAmount.toFixed(2));
          }
        }}
      >
        <InputField
          label="Amaun"
          showLabel={false}
          value={draft.amount}
          placeholder="0.00"
          state={disabled ? "inactive" : "active"}
          textAlign="right"
          onChange={(value) => onChange(draft.id, "amount", value)}
        />
      </div>

      <button
        type="button"
        className="mt-1 inline-flex h-10 w-10 items-center justify-center rounded-lg text-red transition-colors hover:bg-red/10 disabled:cursor-not-allowed disabled:opacity-50"
        aria-label="Padam rekod bayaran"
        title="Padam rekod bayaran"
        disabled={disabled}
        onClick={() => onDelete(draft.id)}
      >
        <Icon icon={commonIcons.delete} size={18} />
      </button>
    </div>
  );
}

function validateDrafts(drafts: PaymentDraft[]) {
  if (drafts.length === 0) {
    return "Sila tambah sekurang-kurangnya satu rekod bayaran.";
  }

  for (const [index, draft] of drafts.entries()) {
    if (!draft.paymentDate) {
      return `Sila pilih tarikh untuk rekod bayaran #${index + 1}.`;
    }

    const amount = parseAmount(draft.amount);

    if (amount === null || amount <= 0) {
      return `Amaun untuk rekod bayaran #${index + 1} mesti lebih daripada 0.`;
    }
  }

  return null;
}

function parseAmount(value: string) {
  const normalizedValue = value.replace(/,/g, "").trim();

  if (!/^\d+(\.\d{0,2})?$/.test(normalizedValue)) {
    return null;
  }

  const amount = Number(normalizedValue);

  return Number.isFinite(amount) ? amount : null;
}

function formatMoney(value: number) {
  return value.toLocaleString("ms-MY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatSignedMoney(value: number) {
  const prefix = value < 0 ? "- RM " : "RM ";

  return `${prefix}${formatMoney(Math.abs(value))}`;
}

function createClientId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
