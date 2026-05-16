"use client";

import { useState } from "react";

import Icon from "@/app/components/Icon";
import {
  InputBox,
  InputField,
  InputFieldFormat,
  Topic,
} from "@/app/pages/6_penghuni/components/InputField";
import type { ExtractedPenghuniRecord } from "../../../../components/extract-review-shared";

type PenghuniReviewDetailProps = {
  resident: ExtractedPenghuniRecord;
  onClose: () => void;
  onSave: (resident: ExtractedPenghuniRecord) => void | Promise<void>;
  onDelete: (resident: ExtractedPenghuniRecord) => void | Promise<void>;
  onNotice?: (tone: "success" | "error" | "info", message: string) => void;
};

export default function PenghuniReviewDetail({
  resident,
  onClose,
  onSave,
  onDelete,
  onNotice,
}: PenghuniReviewDetailProps) {
  const [kemasKini, setKemasKini] = useState(false);
  const [formData, setFormData] = useState(resident);
  const [originalData, setOriginalData] = useState(resident);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const inputState = kemasKini ? "active" : "inactive";
  const isInactive = inputState === "inactive";

  const displayValue = (value: string | null | undefined) => {
    if (value == null || value === "") {
      return isInactive ? "N/A" : "";
    }

    return value;
  };

  const updateField = (field: keyof ExtractedPenghuniRecord, value: string) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const showNotice = (tone: "success" | "error" | "info", message: string) => {
    onNotice?.(tone, message);
  };

  const handleSave = async () => {
    if (isSaving) {
      return;
    }

    if (!formData.nama.trim() || !formData.noKadPengenalan.trim()) {
      showNotice("error", "Nama dan No. K/P perlu diisi.");
      return;
    }

    if (formData.gmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.gmail)) {
      showNotice("error", "Format Gmail tidak sah.");
      return;
    }

    setIsSaving(true);

    try {
      await onSave(formData);
      setOriginalData(formData);
      setKemasKini(false);
      showNotice("success", "Perubahan penghuni berjaya disimpan.");
    } catch (error) {
      showNotice(
        "error",
        error instanceof Error ? error.message : "Gagal menyimpan perubahan penghuni.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (isDeleting) {
      return;
    }

    setIsDeleting(true);

    try {
      await onDelete(resident);
      onClose();
    } catch (error) {
      showNotice(
        "error",
        error instanceof Error ? error.message : "Gagal memadam rekod penghuni.",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div>
      <div className="fixed top-0 left-55 right-0 bottom-0 z-50 bg-black/40 backdrop-blur-sm p-12 flex items-start justify-center">
        <div className="relative w-full rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-full">
          <div className="bg-dark-blue p-6 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-lg text-white">MAKLUMAT PENGHUNI</h2>
              <p className="font-extralight text-xs text-light-grey">
                REKOD SEMAKAN PENGHUNI KUARTERS KERAJAAN
              </p>
            </div>

            <button
              aria-label="Close"
              className="hover:scale-96 active:scale-92 text-white"
              onClick={onClose}
            >
              <Icon icon="close" />
            </button>
          </div>

          <nav className="flex items-center justify-center gap-6 bg-white">
            <button
              type="button"
              className="py-4 text-sm font-medium -mb-px border-b-4 border-dark-blue text-dark-blue"
            >
              <span className="font-bold">MAKLUMAT PENGHUNI</span>
            </button>
          </nav>

          <div className="p-6 bg-light-blue overflow-y-auto">
            <div className="flex flex-col gap-8">
              <section className="flex flex-col gap-4">
                <Topic content="MAKLUMAT PERIBADI" />
                <div className="grid grid-cols-2 gap-4">
                  <InputField
                    label="NAMA"
                    value={displayValue(formData.nama)}
                    state={inputState}
                    onChange={(value) => updateField("nama", value)}
                    className="col-span-1"
                  />
                  {kemasKini ? (
                    <InputFieldFormat
                      label="NO. K/P"
                      format="######-##-####"
                      value={displayValue(formData.noKadPengenalan)}
                      state={inputState}
                      onChange={(value) => updateField("noKadPengenalan", value)}
                      className="col-span-1"
                    />
                  ) : (
                    <InputField
                      label="NO. K/P"
                      value={displayValue(formData.noKadPengenalan)}
                      state="inactive"
                      className="col-span-1"
                    />
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <InputFieldFormat
                    label="NO. TELEFON"
                    format="###-#### ####"
                    value={displayValue(formData.perhubungan)}
                    state={inputState}
                    onChange={(value) => updateField("perhubungan", value)}
                    className="col-span-1"
                  />
                  <InputField
                    label="GMAIL"
                    value={displayValue(formData.gmail)}
                    state={inputState}
                    onChange={(value) => updateField("gmail", value)}
                    className="col-span-1"
                  />
                </div>
              </section>

              <section className="flex flex-col gap-4">
                <Topic content="MAKLUMAT PEKERJAAN" />
                <div className="grid grid-cols-2 gap-4">
                  <InputField
                    label="JAWATAN"
                    value={displayValue(formData.pekerjaan)}
                    state={inputState}
                    onChange={(value) => updateField("pekerjaan", value)}
                    className="col-span-1"
                  />
                  <InputField
                    label="JABATAN"
                    value={displayValue(formData.jabatan)}
                    state={inputState}
                    onChange={(value) => updateField("jabatan", value)}
                    className="col-span-1"
                  />
                  <InputField
                    label="TARAF PERKHIDMATAN"
                    value={displayValue(formData.tarafPerkhidmatan)}
                    state={inputState}
                    onChange={(value) => updateField("tarafPerkhidmatan", value)}
                    className="col-span-1"
                  />
                </div>
              </section>

              <section className="flex flex-col gap-4">
                <Topic content="MAKLUMAT KUARTERS" />
                <div className="grid grid-cols-2 gap-4">
                  <InputField
                    label="KATEGORI"
                    value={displayValue(formData.kuarters)}
                    state={inputState}
                    onChange={(value) => updateField("kuarters", value)}
                    className="col-span-1"
                  />
                  <InputField
                    label="UNIT KUARTERS"
                    value={displayValue(formData.unit)}
                    state={inputState}
                    onChange={(value) => updateField("unit", value)}
                    className="col-span-1"
                  />
                  <InputField
                    label="ALAMAT KUARTERS"
                    value={displayValue(formData.alamatKuarters)}
                    state={inputState}
                    onChange={(value) => updateField("alamatKuarters", value)}
                    className="col-span-2"
                  />
                  {kemasKini ? (
                    <>
                      <DatePickerField
                        label="TARIKH MASUK"
                        value={formData.tarikhMasuk ?? ""}
                        onChange={(value) => updateField("tarikhMasuk", value)}
                        className="col-span-1"
                      />
                      <DatePickerField
                        label="TARIKH KELUAR"
                        value={formData.tarikhKeluar ?? ""}
                        onChange={(value) => updateField("tarikhKeluar", value)}
                        className="col-span-1"
                      />
                    </>
                  ) : (
                    <>
                      <InputField
                        label="TARIKH MASUK"
                        value={displayValue(formatDateLabel(formData.tarikhMasuk ?? ""))}
                        state="inactive"
                        className="col-span-1"
                      />
                      <InputField
                        label="TARIKH KELUAR"
                        value={displayValue(formatDateLabel(formData.tarikhKeluar ?? ""))}
                        state="inactive"
                        className="col-span-1"
                      />
                    </>
                  )}
                </div>
              </section>

              <section className="flex flex-col gap-4">
                <Topic content="LAIN-LAIN" />
                <InputBox
                  label="CATATAN"
                  value={displayValue(formData.catatan)}
                  state={inputState}
                  onChange={(value) => updateField("catatan", value)}
                  className="col-span-2"
                />
              </section>

              {!kemasKini ? (
                <div className="flex items-center justify-between">
                  <div className="flex flex-row gap-1 items-center justify-center text-grey/80">
                    <Icon icon="fact_check" size={13} />
                    <div className="text-xs">
                      Rekod ini masih dalam semakan dokumen muat naik.
                    </div>
                  </div>
                  <div className="flex gap-3 w-xs">
                    <button
                      className="flex flex-1 items-center justify-center gap-1 whitespace-nowrap font-bold text-xs text-white bg-red px-5 py-3 rounded-md hover:bg-red/90 disabled:cursor-not-allowed disabled:opacity-60"
                      type="button"
                      onClick={handleDelete}
                      disabled={isDeleting}
                    >
                      <Icon icon="delete" size={16} />
                      {isDeleting ? "Sedang Padam..." : "Padam Rekod"}
                    </button>
                    <button
                      className="flex flex-1 items-center justify-center gap-1 whitespace-nowrap font-bold text-xs text-white bg-dark-blue px-5 py-3 rounded-md hover:bg-dark-blue/90 disabled:cursor-not-allowed disabled:opacity-60"
                      type="button"
                      disabled={isDeleting}
                      onClick={() => {
                        setKemasKini(true);
                      }}
                    >
                      <Icon icon="edit" size={16} />
                      Kemas Kini
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex flex-row gap-1 items-center justify-center text-grey/80">
                    <Icon icon="edit" size={13} />
                    <div className="text-xs">Sedang menyunting rekod ini...</div>
                  </div>
                  <div className="flex gap-3 w-xs">
                    <button
                      className="flex flex-1 items-center justify-center gap-1 whitespace-nowrap font-bold text-xs text-white bg-red px-5 py-3 rounded-md hover:bg-red/90"
                      type="button"
                      disabled={isSaving}
                      onClick={() => {
                        setFormData(originalData);
                        setKemasKini(false);
                      }}
                    >
                      <Icon icon="close" size={16} />
                      Batal
                    </button>
                    <button
                      className="flex flex-1 items-center justify-center gap-1 whitespace-nowrap font-bold text-xs text-white bg-green px-5 py-3 rounded-md hover:bg-dark-blue/90 disabled:cursor-not-allowed disabled:opacity-60"
                      type="button"
                      disabled={isSaving}
                      onClick={handleSave}
                    >
                      <Icon icon={isSaving ? "progress_activity" : "save"} size={16} />
                      {isSaving ? "Menyimpan..." : "Simpan Rekod"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DatePickerField({
  label,
  value,
  onChange,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  const initialDate = parseDateInput(value);
  const [isOpen, setIsOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(
    initialDate ?? startOfDay(new Date()),
  );
  const days = buildCalendarDays(visibleMonth);

  return (
    <label className={`block tracking-widest ${className}`}>
      <span className="mb-2 block pl-1 font-bold text-gray-500 text-[10px]">
        {label}
      </span>
      <div className="relative">
        <button
          type="button"
          className={`flex min-h-12 w-full items-center gap-3 rounded-md border border-light-grey/40 bg-white p-3 text-left text-sm outline-none transition-colors ${
            isOpen ? "text-dark-blue" : "text-dark-grey hover:border-dark-blue/30"
          }`}
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          onClick={() => setIsOpen((currentState) => !currentState)}
        >
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-xl bg-light-blue text-dark-blue">
            <Icon icon="calendar_month" size={17} />
          </span>
          <span className={value ? "truncate" : "truncate text-grey"}>
            {value ? formatDateLabel(value) : "Pilih tarikh"}
          </span>
        </button>

        {isOpen ? (
          <div
            className="absolute left-0 top-full z-60 mt-2 w-72 rounded-3xl border border-light-grey/20 bg-white p-3 shadow-[0_18px_45px_rgba(13,47,86,0.16)]"
            role="dialog"
            aria-label={`Pilih ${label}`}
          >
            <div className="mb-3 flex items-center justify-between">
              <button
                type="button"
                className="grid h-9 w-9 place-items-center rounded-xl text-grey transition-colors hover:bg-light-blue hover:text-dark-blue"
                aria-label="Bulan sebelumnya"
                onClick={() =>
                  setVisibleMonth((currentDate) => addMonths(currentDate, -1))
                }
              >
                <Icon icon="chevron_left" size={20} />
              </button>
              <div className="text-sm font-extrabold text-dark-grey">
                {formatMonthLabel(visibleMonth)}
              </div>
              <button
                type="button"
                className="grid h-9 w-9 place-items-center rounded-xl text-grey transition-colors hover:bg-light-blue hover:text-dark-blue"
                aria-label="Bulan seterusnya"
                onClick={() =>
                  setVisibleMonth((currentDate) => addMonths(currentDate, 1))
                }
              >
                <Icon icon="chevron_right" size={20} />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-extrabold uppercase tracking-[0.12em] text-grey">
              {["A", "I", "S", "R", "K", "J", "S"].map((dayLabel, index) => (
                <div key={`${dayLabel}-${index}`} className="py-1.5">
                  {dayLabel}
                </div>
              ))}
            </div>

            <div className="mt-1 grid grid-cols-7 gap-1">
              {days.map((day) => {
                const dateValue = formatDateInput(day.date);
                const isSelected = dateValue === value;
                const isVisibleMonth =
                  day.date.getMonth() === visibleMonth.getMonth();

                return (
                  <button
                    key={dateValue}
                    type="button"
                    className={`grid h-9 place-items-center rounded-xl text-sm font-bold transition-colors ${
                      isSelected
                        ? "bg-dark-blue text-white"
                        : isVisibleMonth
                          ? "text-dark-grey hover:bg-light-blue hover:text-dark-blue"
                          : "text-light-grey hover:bg-light-blue"
                    }`}
                    onClick={() => {
                      onChange(dateValue);
                      setIsOpen(false);
                    }}
                  >
                    {day.date.getDate()}
                  </button>
                );
              })}
            </div>

            {value ? (
              <button
                type="button"
                className="mt-3 w-full rounded-xl border border-light-grey/25 px-3 py-2 text-sm font-semibold text-grey transition-colors hover:border-dark-blue hover:text-dark-blue"
                onClick={() => {
                  onChange("");
                  setIsOpen(false);
                }}
              >
                Kosongkan tarikh
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </label>
  );
}

function parseDateInput(value: string | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const date = new Date(`${value}T00:00:00`);

  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function buildCalendarDays(monthDate: Date) {
  const firstDayOfMonth = new Date(
    monthDate.getFullYear(),
    monthDate.getMonth(),
    1,
  );
  const firstCalendarDate = new Date(firstDayOfMonth);
  firstCalendarDate.setDate(
    firstCalendarDate.getDate() - firstCalendarDate.getDay(),
  );

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(firstCalendarDate);
    date.setDate(firstCalendarDate.getDate() + index);

    return { date };
  });
}

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDateLabel(value: string) {
  const date = parseDateInput(value);

  if (!date) {
    return value;
  }

  return [
    String(date.getDate()).padStart(2, "0"),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getFullYear()),
  ].join("/");
}

function formatMonthLabel(date: Date) {
  return new Intl.DateTimeFormat("ms-MY", {
    month: "long",
    year: "numeric",
  }).format(date);
}
