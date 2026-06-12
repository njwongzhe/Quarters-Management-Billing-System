"use client";

import { useEffect, useMemo, useState } from "react";

import Icon, { commonIcons } from "@/app/components/Icon/Icon";
import { DateField, InputField, Topic } from "@/app/components/InputField";
import type { BulkUpdateTunggakanResult } from "@/lib/arrears/arrears";

type RowItem = {
  id: string;
  tarikh: string;
  catatan: string;
  amaun: string;
};

type FeedbackState = {
  type: "success" | "error";
  message: string;
};

type KemasKiniModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (result: BulkUpdateTunggakanResult) => void | Promise<void>;
  chargeMonth: string;
  selectedCount: number;
  selectedIds: string[];
};

function createClientId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createEmptyRow() {
  return {
    id: createClientId(),
    tarikh: "",
    catatan: "",
    amaun: "",
  };
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

function normalizeRowsForPayload(rows: RowItem[]) {
  return rows
    .filter((row) => row.tarikh || row.catatan.trim() || row.amaun.trim())
    .map((row) => ({
      tarikh: row.tarikh,
      catatan: row.catatan,
      amaun: row.amaun,
    }));
}

function RowEditor({
  title,
  rows,
  disabled,
  addButtonLabel,
  amountToneClass,
  onAdd,
  onRemove,
  onChange,
}: {
  title: string;
  rows: RowItem[];
  disabled: boolean;
  addButtonLabel: string;
  amountToneClass: string;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onChange: (id: string, field: keyof Omit<RowItem, "id">, value: string) => void;
}) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <Topic content={title} />
        <button
          type="button"
          disabled={disabled}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-surface-muted px-4 py-2 text-xs font-bold uppercase text-dark-blue transition hover:bg-dark-blue hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          onClick={onAdd}
        >
          <Icon icon="add" size={17} />
          {addButtonLabel}
        </button>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-light-grey/50 bg-surface/70 px-5 py-8 text-center text-sm font-semibold text-grey">
          Tiada rekod ditambah.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-[184px_1fr_184px_36px] gap-4 px-1 text-[10px] font-bold uppercase tracking-widest text-content-muted">
            <div>Tarikh</div>
            <div>Catatan</div>
            <div className="text-right">Amaun (RM)</div>
            <div />
          </div>

          {rows.map((row) => (
            <div key={row.id} className="grid grid-cols-[184px_1fr_184px_36px] items-start gap-4">
              <DateField
                label="Tarikh"
                showLabel={false}
                value={row.tarikh}
                placeholder="Pilih Tarikh"
                state={disabled ? "inactive" : "active"}
                onChange={(value) => onChange(row.id, "tarikh", value)}
              />

              <InputField
                label="Catatan"
                showLabel={false}
                value={row.catatan}
                placeholder="Catatan"
                state={disabled ? "inactive" : "active"}
                onChange={(value) => onChange(row.id, "catatan", value)}
              />

              <div
                onBlurCapture={() => {
                  const parsedAmount = parseAmount(row.amaun);

                  if (parsedAmount !== null) {
                    onChange(row.id, "amaun", parsedAmount.toFixed(2));
                  }
                }}
              >
                <InputField
                  label="Amaun"
                  showLabel={false}
                  value={row.amaun}
                  placeholder="0.00"
                  state={disabled ? "inactive" : "active"}
                  textAlign="right"
                  activeBackgroundClass={`bg-surface ${amountToneClass}`}
                  inactiveBackgroundClass={`bg-surface-muted ${amountToneClass}`}
                  onChange={(value) => onChange(row.id, "amaun", value)}
                />
              </div>

              <button
                type="button"
                className="mt-1 inline-flex h-10 w-10 items-center justify-center rounded-lg text-red transition-colors hover:bg-red/10 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Padam rekod"
                title="Padam rekod"
                disabled={disabled}
                onClick={() => onRemove(row.id)}
              >
                <Icon icon={commonIcons.delete} size={18} />
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default function KemasKiniModal({
  isOpen,
  onClose,
  onSaved,
  chargeMonth,
  selectedCount,
  selectedIds,
}: KemasKiniModalProps) {
  const [cajSenggaraEnabled, setCajSenggaraEnabled] = useState(false);
  const [cajTambahan, setCajTambahan] = useState<RowItem[]>([]);
  const [rebat, setRebat] = useState<RowItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setCajSenggaraEnabled(false);
      setCajTambahan([]);
      setRebat([]);
      setIsSaving(false);
      setFeedback(null);
    }
  }, [isOpen, selectedIds]);

  const totalTambahan = useMemo(
    () => cajTambahan.reduce((sum, row) => sum + (parseAmount(row.amaun) ?? 0), 0),
    [cajTambahan],
  );
  const totalRebat = useMemo(
    () => rebat.reduce((sum, row) => sum + (parseAmount(row.amaun) ?? 0), 0),
    [rebat],
  );
  const netCharge = totalTambahan - totalRebat;

  if (!isOpen) {
    return null;
  }

  function handleUpdateRow(
    setter: React.Dispatch<React.SetStateAction<RowItem[]>>,
    id: string,
    field: keyof Omit<RowItem, "id">,
    value: string,
  ) {
    setter((previousRows) =>
      previousRows.map((row) => (row.id === id ? { ...row, [field]: value } : row)),
    );
    setFeedback(null);
  }

  async function handleSave() {
    setIsSaving(true);
    setFeedback(null);

    try {
      const response = await fetch("/api/arrear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          residentIds: selectedIds,
          chargeMonth,
          cajSenggaraEnabled,
          cajTambahan: normalizeRowsForPayload(cajTambahan),
          rebat: normalizeRowsForPayload(rebat),
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | {
            ok: boolean;
            message?: string;
            data?: BulkUpdateTunggakanResult;
          }
        | null;

      if (!response.ok || !payload?.ok) {
        setFeedback({
          type: "error",
          message: payload?.message ?? "Ralat semasa menyimpan kemas kini tunggakan.",
        });
        return;
      }

      setFeedback({
        type: "success",
        message: payload.message ?? "Kemas kini berjaya disimpan.",
      });

      if (payload.data) {
        await onSaved?.(payload.data);
      }
      onClose();
    } catch {
      setFeedback({
        type: "error",
        message: "Ralat tidak dijangka berlaku. Sila cuba lagi.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div
      className="fixed bottom-0 left-55 right-0 top-0 z-50 flex items-start justify-center bg-black/40 p-12 backdrop-blur-md"
      onClick={onClose}
    >
      <section
        className="flex max-h-full w-full flex-col overflow-hidden rounded-lg bg-light-blue shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="arrears-update-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-center justify-between bg-dark-blue p-6 text-white">
          <div>
            <h2 id="arrears-update-title" className="text-lg font-bold">
              KEMAS KINI TUNGGAKAN
            </h2>
            <p className="text-xs font-extralight text-light-grey">
              SUNTING REKOD TUNGGAKAN UNTUK {selectedCount} PENGHUNI
            </p>
          </div>
          <button
            type="button"
            className="hover:scale-96 active:scale-92 text-white"
            aria-label="Tutup kemas kini tunggakan"
            onClick={onClose}
          >
            <Icon icon="close" size={20} />
          </button>
        </header>

        {selectedCount === 0 ? (
          <div className="flex min-h-96 items-center justify-center h-full">
            <div className="flex-1 w-full max-w-md h-full rounded-xl border border-red/20 bg-surface p-6 text-center">
              <h3 className="text-lg font-extrabold text-content">Tiada Rekod Dipilih</h3>
              <p className="mt-2 text-sm leading-6 text-grey">
                Pilih sekurang-kurangnya satu penghuni pada jadual sebelum kemas kini tunggakan.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-8 overflow-y-auto bg-light-blue p-6">
            {feedback ? (
              <div
                className={`rounded-lg border px-4 py-3 text-sm font-semibold ${
                  feedback.type === "success"
                    ? "border-green/20 bg-surface text-green"
                    : "border-red/20 bg-surface text-red"
                }`}
              >
                {feedback.message}
              </div>
            ) : null}

            <section className="flex flex-col gap-4">
              <Topic content="PERINCIAN KEWANGAN" />
              <div className="rounded-lg border border-light-grey/30 bg-surface p-4">
                <label className="flex items-center gap-4">
                  <button
                    type="button"
                    disabled={isSaving}
                    aria-label="Togol caj penyelenggaraan"
                    aria-pressed={cajSenggaraEnabled}
                    className={`relative h-6 w-12 rounded-full transition-colors ${
                      cajSenggaraEnabled ? "bg-dark-blue" : "bg-border"
                    } disabled:cursor-not-allowed disabled:opacity-50`}
                    onClick={() => setCajSenggaraEnabled((value) => !value)}
                  >
                    <span
                      className={`absolute top-1 h-4 w-4 rounded-full bg-static-white transition-all ${
                        cajSenggaraEnabled ? "left-7" : "left-1"
                      }`}
                    />
                  </button>
                  <span className="text-sm font-bold uppercase tracking-wide text-content">
                    Caj Penyelenggaraan
                  </span>
                </label>
              </div>
            </section>

            <RowEditor
              title="CAJ TAMBAHAN DITAMBAH"
              rows={cajTambahan}
              disabled={isSaving}
              addButtonLabel="Tambah Caj Baru"
              amountToneClass="text-red"
              onAdd={() => {
                setCajTambahan((currentRows) => [...currentRows, createEmptyRow()]);
                setFeedback(null);
              }}
              onRemove={(id) => {
                setCajTambahan((currentRows) => currentRows.filter((row) => row.id !== id));
                setFeedback(null);
              }}
              onChange={(id, field, value) => handleUpdateRow(setCajTambahan, id, field, value)}
            />

            <RowEditor
              title="REBAT DITAMBAH"
              rows={rebat}
              disabled={isSaving}
              addButtonLabel="Tambah Rebat Baru"
              amountToneClass="text-green"
              onAdd={() => {
                setRebat((currentRows) => [...currentRows, createEmptyRow()]);
                setFeedback(null);
              }}
              onRemove={(id) => {
                setRebat((currentRows) => currentRows.filter((row) => row.id !== id));
                setFeedback(null);
              }}
              onChange={(id, field, value) => handleUpdateRow(setRebat, id, field, value)}
            />

            <section className="flex flex-col gap-4">
              <Topic content="RINGKASAN KEMAS KINI" />
              <div className="flex flex-col gap-3 overflow-hidden rounded-lg bg-dark-blue p-4 text-white shadow-[0_24px_40px_rgba(23,31,111,0.18)]">
                <div className="flex items-center justify-between gap-4">
                  <div className="text-xs font-bold uppercase text-light-grey">JUMLAH CAJ TAMBAHAN</div>
                  <div className="text-sm font-bold text-red">RM {formatMoney(totalTambahan)}</div>
                </div>

                <hr className="border-white/20" />

                <div className="flex items-center justify-between gap-4">
                  <div className="text-xs font-bold uppercase text-light-grey">JUMLAH REBAT</div>
                  <div className="text-sm font-bold text-green">RM {formatMoney(totalRebat)}</div>
                </div>

                <hr className="border-white/20" />

                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-1">
                    <div className="text-xs font-bold uppercase text-light-grey">KESAN BERSIH</div>
                    <div className={`text-2xl font-bold ${netCharge > 0 ? "text-red" : "text-green"}`}>
                      RM {formatMoney(Math.abs(netCharge))}
                    </div>
                  </div>

                  <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white/10">
                    <Icon
                      icon={netCharge > 0 ? "trending_up" : "check_circle"}
                      size={40}
                      filled
                    />
                  </div>
                </div>
              </div>
            </section>

            <footer className="flex items-center justify-between">
              <div className="flex flex-row items-center justify-center gap-1 text-grey/80">
                <Icon icon="edit" size={13} />
                <div className="text-xs">Sedang menyunting rekod tunggakan...</div>
              </div>
              <div className="flex w-xs gap-3">
                <button
                  className="flex flex-1 items-center justify-center gap-1 whitespace-nowrap rounded-md bg-red px-5 py-3 text-xs font-bold text-white hover:bg-red/90 disabled:cursor-not-allowed disabled:opacity-50"
                  type="button"
                  disabled={isSaving}
                  onClick={onClose}
                >
                  <Icon icon={commonIcons.close} size={16} />
                  Batal
                </button>
                <button
                  className="flex flex-1 items-center justify-center gap-1 whitespace-nowrap rounded-md bg-green px-5 py-3 text-xs font-bold text-white hover:bg-green/90 disabled:cursor-not-allowed disabled:opacity-50"
                  type="button"
                  disabled={isSaving}
                  onClick={handleSave}
                >
                  <Icon
                    icon={isSaving ? "progress_activity" : commonIcons.save}
                    size={16}
                    className={isSaving ? "animate-spin" : ""}
                  />
                  {isSaving ? "Sedang Simpan..." : "Simpan Rekod"}
                </button>
              </div>
            </footer>
          </div>
        )}
      </section>
    </div>
  );
}
