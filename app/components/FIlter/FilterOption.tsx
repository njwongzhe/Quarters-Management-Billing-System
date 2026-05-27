"use client";

import Icon from "@/app/components/Icon/Icon";
import { useEffect, useState } from "react";

export type FilterOption<T extends string> = {
  value: T;
  label: string;
  dotColor?: string;
};

export type FilterOptionSet<T extends string> = {
  title: string;
  options: FilterOption<T>[];
  selectedValues: T[];
};

// Helper functions to normalize and check selected values against options.
export function normalizeSelectedValuesForOptions<T extends string>(
  options: FilterOption<T>[],
  selectedValues: T[],
) {
  const validOptionValues = new Set(options.map((option) => option.value));
  const uniqueValues = Array.from(new Set(selectedValues));
  return uniqueValues.filter((value) => validOptionValues.has(value));
}

// Helper function to check if all options are selected.
export function areAllFilterOptionsSelected<T extends string>(
  options: FilterOption<T>[],
  selectedValues: T[],
) {
  if (options.length === 0) {
    return false;
  }

  const normalizedSelectedValues = normalizeSelectedValuesForOptions(
    options,
    selectedValues,
  );

  return options.every((option) => normalizedSelectedValues.includes(option.value));
}

/*
FilterOption Rules

"Semua" Button Logic:
1. When "Semua" is active, all options under the option set are active.
2. When "Semua" is inactive, all options under the option set are inactive.

Option Logic:
1. When all options in a set are active, the corresponding "Semua" is active.
2. When any option in a set is inactive, the corresponding "Semua" is inactive.
3. When an option is active, it will be set as inactive when the user clicks on it or vice versa.
4. Multiple options can be active at the same time.
*/

type FilterProps<T extends string> = {
  ariaLabel: string;
  defaultLabel?: string;
  optionSets: FilterOptionSet<T>[];
  onChange: (sets: FilterOptionSet<T>[]) => void; // The onChange callback now receives the entire updated sets array.
};

export default function FilterOption<T extends string>({
  ariaLabel,
  defaultLabel = "Semua",
  optionSets,
  onChange,
}: FilterProps<T>) {
  // Local state to manage the current selection of options. 
  const [sets, setSets] = useState(optionSets);

  // Whenever the optionSets prop changes, we need to normalize the selected values and update our local state.
  useEffect(() => {
    setSets(
      optionSets.map((set) => ({
        ...set,
        selectedValues: normalizeSelectedValuesForOptions(set.options, set.selectedValues),
      })),
    );
  }, [optionSets]);

  // Handler for toggling individual options. 
  // It updates the selected values for the specific set and then calls onChange with the updated sets.
  function handleToggle(setIdx: number, value: T) {
    const newSets = sets.map((set, idx) => {
      if (idx !== setIdx) return set;

      const normalizedSelectedValues = normalizeSelectedValuesForOptions(set.options, set.selectedValues);
      const isSelected = normalizedSelectedValues.includes(value);
      const nextSelected = isSelected
        ? normalizedSelectedValues.filter((v) => v !== value)
        : [...normalizedSelectedValues, value];

      return {
        ...set,
        selectedValues: normalizeSelectedValuesForOptions(set.options, nextSelected),
      };
    });
    setSets(newSets);
    onChange(newSets);
  }

  // Handler for toggling the "Semua" option. 
  // It checks if all options are currently selected and either selects all or deselects all accordingly.
  function handleSelectAll(setIdx: number) {
    const newSets = sets.map((set, idx) => {
      if (idx !== setIdx) return set;
      const isAllSelected = areAllFilterOptionsSelected(set.options, set.selectedValues);
      return {
        ...set,
        selectedValues: isAllSelected ? [] : (set.options.map((opt) => opt.value) as T[]),
      };
    });
    setSets(newSets);
    onChange(newSets);
  }

  return (
    <div
      className="absolute right-0 top-full flex flex-col gap-2 z-20 mt-2 rounded-2xl border border-light-grey/20 bg-white p-2 shadow-lg"
      aria-label={ariaLabel}
    >
      {/* Description Section */}
      <div className="px-2 pt-2">
        <p className="text-xs font-extrabold uppercase text-grey">Penapis</p>
        <p className="mt-1 text-sm text-grey whitespace-nowrap">Tapis data yang ingin dipaparkan.</p>
      </div>

      {/* Divider */}
      <hr className="border-t border-light-grey/20" />

      {/* Options Section */}
      <div className="flex flex-row gap-4">
        {sets.map((set, setIdx) => {
          const isAllSelected = areAllFilterOptionsSelected(set.options, set.selectedValues);
          const normalizedSelectedValues = normalizeSelectedValuesForOptions(set.options, set.selectedValues);

          return (
            <div key={setIdx} className="flex flex-col gap-2 w-full">
              {/* Set Title */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-grey">{set.title}</span>
              </div>

              {/* "Select All" Option */}
              <button
                type="button"
                role="option"
                aria-selected={isAllSelected}
                className={`flex w-full items-center justify-between rounded-xl border px-2 py-1 text-left text-sm font-bold transition-colors ${
                  isAllSelected
                    ? "border-dark-blue bg-dark-blue text-white"
                    : "border-light-grey/40 text-dark-grey hover:bg-light-blue"
                }`}
                onClick={() => handleSelectAll(setIdx)}
              >
                <span className="truncate items-center justify-center text-center w-full">{defaultLabel}</span>
              </button>

              {/* Divider */}
              <hr className="border-t border-light-grey/20" />

              {/* Individual Options */}
              <div className="flex flex-col gap-1">
                {set.options.map((option) => {
                  const isSelected = normalizedSelectedValues.includes(option.value);

                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      className={`flex gap-2 w-full items-center justify-between rounded-xl px-2 py-1 text-left text-sm font-semibold transition-colors ${
                        isSelected
                          ? "bg-dark-blue text-white"
                          : "text-dark-grey hover:bg-light-blue"
                      }`}
                      onClick={() => handleToggle(setIdx, option.value)}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        {/* Colored Dot */}
                        {option.dotColor ? (
                          <span className={`size-2 shrink-0 rounded-full ${option.dotColor}`} />
                        ) : null}

                        {/* Option Label */}
                        <span className="truncate">{option.label}</span>
                      </span>

                      {/* Check Icon */}
                      {isSelected ? <Icon icon="done" size={16} /> : null}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}