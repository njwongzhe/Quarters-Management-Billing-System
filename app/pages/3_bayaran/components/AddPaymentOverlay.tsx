"use client";

import { useMemo, useRef, useState } from "react";

import Calender from "@/app/components/Calender/Calender";
import Icon, { commonIcons } from "@/app/components/Icon/Icon";
import { Topic } from "@/app/components/InputField";
import type { BayaranDetail } from "@/lib/payments/bayaran-types";

type AddPaymentOverlayProps = {
  paymentDetails: BayaranDetail;
  onClose: () => void;
  onSaved: () => void;
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
  onClose,
  onSaved,
}: AddPaymentOverlayProps) {
  const [drafts, setDrafts] = useState<PaymentDraft[]>([]);
  const [activeDatePickerId, setActiveDatePickerId] = useState<string | null>(
    null,
  );
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
      const response = await fetch(`/api/payments/${paymentDetails.id}/manual`, {
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
      });
      const payload = (await response.json().catch(() => null)) as
        | ManualPaymentResponse
        | null;

      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message ?? "Gagal menyimpan bayaran manual.");
      }

      onSaved();
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
      className="fixed bottom-0 left-55 right-0 top-0 z-50 flex items-center justify-center bg-black/45 p-8 backdrop-blur-sm"
      onClick={onClose}
    >
      <section
        className="flex max-h-full w-full max-w-6xl flex-col overflow-hidden rounded-lg bg-light-blue shadow-2xl"
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
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-white/80 transition hover:bg-white/10 hover:text-white"
            aria-label="Tutup tambah bayaran"
            onClick={onClose}
          >
            <Icon icon={commonIcons.close} size={22} />
          </button>
        </header>

        <div className="overflow-y-auto bg-light-blue p-6">
          <div className="flex flex-col gap-8">
            <section className="flex flex-col gap-4">
              <div className="flex items-center justify-between gap-4">
                <Topic content="BAYARAN DITAMBAH" />
                <button
                  type="button"
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-[#E5ECFA] px-4 py-2 text-xs font-bold uppercase text-dark-blue transition hover:bg-dark-blue hover:text-white"
                  onClick={handleAddDraft}
                >
                  <Icon icon="add" size={17} />
                  Tambah Bayaran Baru
                </button>
              </div>

              {drafts.length === 0 ? (
                <div className="rounded-lg border border-dashed border-light-grey/50 bg-white/70 px-5 py-8 text-center text-sm font-semibold text-grey">
                  Tiada bayaran ditambah.
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="grid grid-cols-[184px_226px_1fr_184px_36px] gap-4 px-1 text-[10px] font-bold uppercase tracking-widest text-gray-500">
                    <div>Tarikh</div>
                    <div>No. Resit</div>
                    <div>Catatan</div>
                    <div className="text-right">Amaun (RM)</div>
                    <div />
                  </div>

                  {drafts.map((draft) => (
                    <PaymentDraftRow
                      key={draft.id}
                      activeDatePickerId={activeDatePickerId}
                      draft={draft}
                      disabled={isSaving}
                      onChange={handleDraftChange}
                      onDelete={handleDeleteDraft}
                      onDatePickerChange={setActiveDatePickerId}
                    />
                  ))}
                </div>
              )}
            </section>

            <section className="relative overflow-hidden rounded-lg bg-dark-blue p-6 text-white shadow-[0_24px_40px_rgba(23,31,111,0.18)]">
              <div className="flex items-center justify-between gap-4 border-b border-white/15 pb-5">
                <div className="text-xs font-bold uppercase text-light-grey">
                  Tunggakan Semasa
                </div>
                <div className="text-sm font-bold">
                  RM {formatMoney(currentArrears)}
                </div>
              </div>
              <div className="flex items-center justify-between gap-4 border-b border-white/15 py-5">
                <div className="text-xs font-bold uppercase text-light-grey">
                  Amaun Bayar
                </div>
                <div className="text-sm font-bold">RM {formatMoney(totalPaid)}</div>
              </div>
              <div className="pt-6">
                <div className="mb-2 text-xs font-bold uppercase text-light-grey">
                  Baki Tunggakan
                </div>
                <div className="text-lg font-bold text-[#70A9FF]">
                  {formatSignedMoney(remainingBalance)}
                </div>
              </div>
              <div className="absolute bottom-6 right-6 grid h-18 w-18 place-items-center rounded-2xl bg-white/10">
                <Icon icon="priority_high" size={44} filled />
              </div>
            </section>

            {errorMessage ? (
              <div className="rounded-lg border border-red/20 bg-white px-4 py-3 text-sm font-semibold text-red">
                {errorMessage}
              </div>
            ) : null}

            <footer className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs text-grey">
                <Icon icon="edit_note" size={18} />
                <span>Sedang menambah bayaran rekod...</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="inline-flex min-h-11 min-w-32 items-center justify-center gap-2 rounded-md bg-red px-5 py-3 text-xs font-bold text-white transition hover:bg-red/90 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={isSaving}
                  onClick={onClose}
                >
                  <Icon icon={commonIcons.close} size={16} />
                  Batal
                </button>
                <button
                  type="button"
                  className="inline-flex min-h-11 min-w-52 items-center justify-center gap-2 rounded-md bg-green px-5 py-3 text-xs font-bold text-white transition hover:bg-green/90 disabled:cursor-not-allowed disabled:opacity-50"
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
  activeDatePickerId,
  disabled,
  draft,
  onChange,
  onDatePickerChange,
  onDelete,
}: {
  activeDatePickerId: string | null;
  disabled: boolean;
  draft: PaymentDraft;
  onChange: (
    draftId: string,
    field: keyof Omit<PaymentDraft, "id">,
    value: string,
  ) => void;
  onDatePickerChange: (draftId: string | null) => void;
  onDelete: (draftId: string) => void;
}) {
  const datePickerRef = useRef<HTMLDivElement | null>(null);
  const isDatePickerOpen = activeDatePickerId === draft.id;

  return (
    <div className="grid grid-cols-[184px_226px_1fr_184px_36px] items-start gap-4">
      <div ref={datePickerRef} className="relative">
        <button
          type="button"
          className="flex min-h-12 w-full items-center justify-between rounded-md border border-light-grey/40 bg-white px-3 py-3 text-left text-sm font-semibold text-dark-grey outline-none transition-colors hover:border-dark-blue disabled:cursor-not-allowed disabled:opacity-50"
          disabled={disabled}
          onClick={() => onDatePickerChange(isDatePickerOpen ? null : draft.id)}
        >
          <span className={draft.paymentDate ? "" : "text-light-grey"}>
            {formatDateForDisplay(draft.paymentDate) || "Pilih Tarikh"}
          </span>
          <Icon icon={commonIcons.calendar} size={18} className="text-grey" />
        </button>
        <Calender
          containerRef={datePickerRef}
          isOpen={isDatePickerOpen}
          value={draft.paymentDate}
          onChange={(value) => onChange(draft.id, "paymentDate", value)}
          onClose={() => onDatePickerChange(null)}
          scale={0.95}
        />
      </div>

      <input
        type="text"
        value={draft.receiptNo}
        disabled={disabled}
        placeholder="RES-"
        className="min-h-12 rounded-md border border-light-grey/40 bg-white px-3 py-3 text-sm font-semibold text-dark-grey outline-none transition-colors placeholder:text-light-grey focus:border-dark-blue disabled:cursor-not-allowed disabled:opacity-50"
        onChange={(event) =>
          onChange(draft.id, "receiptNo", event.target.value)
        }
      />

      <input
        type="text"
        value={draft.description}
        disabled={disabled}
        placeholder="bayaran"
        className="min-h-12 rounded-md border border-light-grey/40 bg-white px-3 py-3 text-sm font-semibold text-dark-grey outline-none transition-colors placeholder:text-light-grey focus:border-dark-blue disabled:cursor-not-allowed disabled:opacity-50"
        onChange={(event) =>
          onChange(draft.id, "description", event.target.value)
        }
      />

      <input
        type="text"
        inputMode="decimal"
        value={draft.amount}
        disabled={disabled}
        placeholder="0.00"
        className="min-h-12 rounded-md border border-light-grey/40 bg-white px-3 py-3 text-right text-sm font-semibold text-dark-grey outline-none transition-colors placeholder:text-light-grey focus:border-dark-blue disabled:cursor-not-allowed disabled:opacity-50"
        onChange={(event) => onChange(draft.id, "amount", event.target.value)}
        onBlur={() => {
          const parsedAmount = parseAmount(draft.amount);

          if (parsedAmount !== null) {
            onChange(draft.id, "amount", parsedAmount.toFixed(2));
          }
        }}
      />

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

function formatDateForDisplay(value: string) {
  if (!value) {
    return "";
  }

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("ms-MY", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function createClientId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
