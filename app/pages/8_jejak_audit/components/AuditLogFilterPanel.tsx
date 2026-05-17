"use client";

import type { Ref } from "react";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import Icon from "@/app/components/Icon/Icon";
import ToolbarIconButton from "@/app/components/Icon/ToolbarIconButton";
import type { AuditLogFilters } from "@/lib/audit-logs";

type AuditLogFilterPanelProps = {
  filters: AuditLogFilters;
  hasActiveFilters: boolean;
  options: {
    actionTypes: {
      value: string;
      label: string;
    }[];
    admins: {
      id: string;
      name: string;
    }[];
  };
};

export default function AuditLogFilterPanel({
  filters,
  hasActiveFilters,
  options,
}: AuditLogFilterPanelProps) {
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const firstFieldRef = useRef<HTMLButtonElement | null>(null);
  const [hasSubmittedFilters, setHasSubmittedFilters] = useState(false);
  const [isOpen, setIsOpen] = useState(hasActiveFilters);
  const isFilterButtonActive =
    isOpen || hasActiveFilters || hasSubmittedFilters;

  useEffect(() => {
    if (isOpen) {
      firstFieldRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      if (panelRef.current?.contains(target)) {
        return;
      }

      setIsOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isOpen]);

  return (
    <div ref={panelRef} className="relative">
      <ToolbarIconButton
        icon="filter"
        label="Tapis rekod audit"
        isActive={isFilterButtonActive}
        activeBadge={hasActiveFilters ? countActiveFilters(filters) : undefined}
        onClick={() => setIsOpen((currentState) => !currentState)}
      />

      {isOpen ? (
        <form
          action="/pages/8_jejak_audit"
          className="absolute right-0 top-full z-20 mt-2 w-[min(44rem,calc(100vw-18rem))] rounded-2xl border border-light-grey/20 bg-white p-4 shadow-[0_18px_45px_rgba(13,47,86,0.16)]"
          onSubmit={(event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const hasFilterValues = formHasFilterValues(form);

            setHasSubmittedFilters(hasFilterValues);
            setIsOpen(false);
            router.push(buildFilterHref(form));
          }}
        >
          <div className="grid gap-4 lg:grid-cols-12 lg:items-end">
            <DatePickerField
              className="lg:col-span-3"
              label="Tarikh Mula"
              name="dateFrom"
              defaultValue={filters.dateFrom}
              buttonRef={firstFieldRef}
            />
            <DatePickerField
              className="lg:col-span-3"
              label="Tarikh Tamat"
              name="dateTo"
              defaultValue={filters.dateTo}
            />
            <SelectField
              className="lg:col-span-3"
              label="Jenis Tindakan"
              name="actionType"
              defaultValue={filters.actionType ?? ""}
              options={[
                { value: "", label: "Semua tindakan" },
                ...options.actionTypes,
              ]}
            />
            <SelectField
              className="lg:col-span-3"
              label="Admin"
              name="adminId"
              defaultValue={filters.adminId ?? ""}
              options={[
                { value: "", label: "Semua admin" },
                ...options.admins.map((admin) => ({
                  value: admin.id,
                  label: admin.name,
                })),
              ]}
            />
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
            <Link
              href="/pages/8_jejak_audit"
              className="inline-flex min-h-10 items-center rounded-xl border border-light-grey/25 bg-white px-4 py-2 text-sm font-semibold text-grey transition-colors hover:border-dark-blue hover:text-dark-blue"
              onClick={() => {
                setHasSubmittedFilters(false);
                setIsOpen(false);
              }}
            >
              Kosongkan
            </Link>
            <button
              type="submit"
              className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-dark-blue px-4 py-2 text-sm font-extrabold text-white transition-opacity hover:opacity-90"
            >
              <Icon icon="filter" size={18} />
              Tapis
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}

function DatePickerField({
  label,
  name,
  defaultValue,
  className = "",
  buttonRef,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  className?: string;
  buttonRef?: Ref<HTMLButtonElement>;
}) {
  const initialDate = parseDateInput(defaultValue);
  const [selectedValue, setSelectedValue] = useState(defaultValue ?? "");
  const [isOpen, setIsOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(
    initialDate ?? startOfDay(new Date()),
  );
  const days = buildCalendarDays(visibleMonth);

  return (
    <label className={`block ${className}`}>
      <span className="mb-2 block text-xs font-extrabold uppercase tracking-[0.18em] text-grey">
        {label}
      </span>
      <div className="relative">
        <input type="hidden" name={name} value={selectedValue} />
        <button
          ref={buttonRef}
          type="button"
          className={`flex min-h-11 w-full items-center gap-3 rounded-2xl border bg-white py-2 pl-3 pr-4 text-left text-sm font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_3px_10px_rgba(15,23,42,0.04)] outline-none transition-colors ${
            isOpen
              ? "border-dark-blue text-dark-blue"
              : "border-light-grey/25 text-dark-grey hover:border-dark-blue/30"
          }`}
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          onClick={() => setIsOpen((currentState) => !currentState)}
        >
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-xl bg-light-blue text-dark-blue">
            <Icon icon="calendar_month" size={17} />
          </span>
          <span className={selectedValue ? "truncate" : "truncate text-grey"}>
            {selectedValue ? formatDateLabel(selectedValue) : "Pilih tarikh"}
          </span>
        </button>

        {isOpen ? (
          <div
            className="absolute left-0 top-full z-40 mt-2 w-72 rounded-3xl border border-light-grey/20 bg-white p-3 shadow-[0_18px_45px_rgba(13,47,86,0.16)]"
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
                const value = formatDateInput(day.date);
                const isSelected = value === selectedValue;
                const isVisibleMonth =
                  day.date.getMonth() === visibleMonth.getMonth();

                return (
                  <button
                    key={value}
                    type="button"
                    className={`grid h-9 place-items-center rounded-xl text-sm font-bold transition-colors ${
                      isSelected
                        ? "bg-dark-blue text-white"
                        : isVisibleMonth
                          ? "text-dark-grey hover:bg-light-blue hover:text-dark-blue"
                          : "text-light-grey hover:bg-light-blue"
                    }`}
                    onClick={() => {
                      setSelectedValue(value);
                      setIsOpen(false);
                    }}
                  >
                    {day.date.getDate()}
                  </button>
                );
              })}
            </div>

            {selectedValue ? (
              <button
                type="button"
                className="mt-3 w-full rounded-xl border border-light-grey/25 px-3 py-2 text-sm font-semibold text-grey transition-colors hover:border-dark-blue hover:text-dark-blue"
                onClick={() => {
                  setSelectedValue("");
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

function SelectField({
  label,
  name,
  defaultValue,
  options,
  className = "",
}: {
  label: string;
  name: string;
  defaultValue: string;
  options: {
    value: string;
    label: string;
  }[];
  className?: string;
}) {
  const [selectedValue, setSelectedValue] = useState(defaultValue);
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption =
    options.find((option) => option.value === selectedValue) ?? options[0];

  return (
    <label className={`block ${className}`}>
      <span className="mb-2 block text-xs font-extrabold uppercase tracking-[0.18em] text-grey">
        {label}
      </span>
      <div className="relative">
        <input type="hidden" name={name} value={selectedValue} />
        <button
          type="button"
          className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-2xl border bg-white py-2 pl-4 pr-3 text-left text-sm font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_3px_10px_rgba(15,23,42,0.04)] outline-none transition-colors ${
            isOpen
              ? "border-dark-blue text-dark-blue"
              : "border-light-grey/25 text-dark-grey hover:border-dark-blue/30"
          }`}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          onClick={() => setIsOpen((currentState) => !currentState)}
        >
          <span className="truncate">{selectedOption?.label}</span>
          <span
            className={`grid h-7 w-7 shrink-0 place-items-center rounded-xl bg-light-blue text-dark-blue transition-transform ${
              isOpen ? "rotate-180" : ""
            }`}
          >
            <Icon icon="keyboard_arrow_down" size={18} />
          </span>
        </button>

        {isOpen ? (
          <div
            className="absolute left-0 right-0 top-full z-30 mt-2 max-h-60 overflow-auto rounded-2xl border border-light-grey/20 bg-white p-2 shadow-[0_18px_45px_rgba(13,47,86,0.16)]"
            role="listbox"
          >
            {options.map((option) => {
              const isSelected = option.value === selectedValue;

              return (
                <button
                  key={option.value}
                  type="button"
                  className={`flex min-h-10 w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-semibold transition-colors ${
                    isSelected
                      ? "bg-dark-blue text-white"
                      : "text-dark-grey hover:bg-light-blue"
                  }`}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    setSelectedValue(option.value);
                    setIsOpen(false);
                  }}
                >
                  <span className="truncate">{option.label}</span>
                  {isSelected ? <Icon icon="done" size={16} /> : null}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    </label>
  );
}

function countActiveFilters(filters: AuditLogFilters) {
  return [
    filters.dateFrom,
    filters.dateTo,
    filters.actionType,
    filters.adminId,
  ].filter(Boolean).length;
}

function formHasFilterValues(form: HTMLFormElement) {
  const formData = new FormData(form);

  return ["dateFrom", "dateTo", "actionType", "adminId"].some((key) =>
    String(formData.get(key) ?? "").trim(),
  );
}

function buildFilterHref(form: HTMLFormElement) {
  const formData = new FormData(form);
  const params = new URLSearchParams();

  for (const key of ["dateFrom", "dateTo", "actionType", "adminId"]) {
    const value = String(formData.get(key) ?? "").trim();

    if (value) {
      params.set(key, value);
    }
  }

  const queryString = params.toString();

  return queryString
    ? `/pages/8_jejak_audit?${queryString}`
    : "/pages/8_jejak_audit";
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

  return new Intl.DateTimeFormat("ms-MY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatMonthLabel(date: Date) {
  return new Intl.DateTimeFormat("ms-MY", {
    month: "long",
    year: "numeric",
  }).format(date);
}
