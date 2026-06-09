"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "@/app/components/Icon/Icon";
import { InputField } from "@/app/components/InputField";
import ToolbarIconButton from "@/app/components/ToolbarIconButton";

// ─── Search Utilities ─────────────────────────────────────────────────────────

/**
 * Normalizes a string for consistent, accent-insensitive comparison.
 * Trims whitespace, lowercases, and strips diacritics (e.g. é → e).
 */
export function normalizeSearchValue(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/** Strips all hyphens from a string (used for IC number comparison). */
function stripHyphens(value: string): string {
  return value.replace(/-/g, "");
}

type SearchRecordsOptions = {
  /**
   * When `true`, hyphens are stripped from both the search query and every
   * field value before comparing. This lets users search IC numbers with or
   * without dashes (e.g. "9501011234" will match "950101-12-3456").
   *
   * @default false
   */
  icSearch?: boolean;
};

/**
 * Filters an array of records based on a search query.
 *
 * @param records   - The full list of items to search.
 * @param query     - The raw search string typed by the user.
 * @param getFields - A function that receives one record and returns the list
 *                   of string fields to match against. `null` / `undefined`
 *                   values in the array are ignored automatically.
 * @param options   - Optional feature flags (see `SearchRecordsOptions`).
 *
 * @returns The filtered subset of records that match the query.
 *
 * @example
 * // Basic usage
 * const results = searchRecords(residents, query, (r) => [
 *   r.fullName,
 *   r.icNumber,
 *   r.email,
 *   r.quarters?.unitCode,
 * ]);
 *
 * @example
 * // With IC search (hyphens stripped before comparing)
 * const results = searchRecords(residents, query, (r) => [
 *   r.fullName,
 *   r.icNumber,
 * ], { icSearch: true });
 */
export function searchRecords<T>(
  records: T[],
  query: string,
  getFields: (record: T) => (string | null | undefined)[],
  options: SearchRecordsOptions = {},
): T[] {
  const { icSearch = false } = options;

  const normalizedQuery = normalizeSearchValue(query);

  // Empty query → return everything unchanged
  if (normalizedQuery.length === 0) {
    return records;
  }

  // When icSearch is on, also prepare a hyphen-stripped version of the query
  // so that "950101141234" can match the stored value "950101-14-1234".
  const strippedQuery = icSearch ? stripHyphens(normalizedQuery) : null;

  return records.filter((record) => {
    const fields = getFields(record).filter(Boolean) as string[];

    return fields.some((field) => {
      const normalizedField = normalizeSearchValue(field);

      // Standard match
      if (normalizedField.includes(normalizedQuery)) {
        return true;
      }

      // IC match: compare with hyphens removed from both sides
      if (strippedQuery) {
        const strippedField = stripHyphens(normalizedField);
        if (strippedField.includes(strippedQuery)) {
          return true;
        }
      }

      return false;
    });
  });
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

type UseSearchBarLogicProps = {
  /** The current search query value (controlled by the parent). */
  value: string;
  /** Called whenever the query changes, including when it is cleared. */
  onChange: (value: string) => void;
};

/**
 * Encapsulates open/close state, auto-focus, and clear/toggle handlers for a
 * search bar. Returns everything the parent needs to wire up the toggle button
 * and the `<SearchBar>` panel.
 *
 * @example
 * const { isOpen, isSearchActive, searchInputRef, handleToggleSearch, handleClearSearch } =
 *   useSearchBarLogic({ value: query, onChange: setQuery });
 */
export function useSearchBarLogic({ value, onChange }: UseSearchBarLogicProps) {
  const searchInputRef = useRef<HTMLDivElement | null>(null);

  // Keep the panel open if a query already exists (e.g. on re-mount)
  const [isOpen, setIsOpen] = useState(value.trim().length > 0);

  /** True when the query is non-empty — useful for highlighting the toggle button. */
  const isSearchActive = value.trim().length > 0;

  // Auto-focus the text input whenever the panel opens
  useEffect(() => {
    if (!isOpen) return;
    searchInputRef.current?.querySelector("input")?.focus();
  }, [isOpen]);

  /** Toggles the search panel open or closed. Closing it also clears the query. */
  function handleToggleSearch() {
    if (isOpen) {
      onChange("");
      setIsOpen(false);
      return;
    }
    setIsOpen(true);
  }

  /** Clears the query string and collapses the search panel. */
  function handleClearSearch() {
    onChange("");
    setIsOpen(false);
  }

  return {
    isOpen,
    isSearchActive,
    /** Attach this ref to the wrapper `<div>` that contains the `<input>`. */
    searchInputRef,
    handleToggleSearch,
    handleClearSearch,
  };
}

// ─── Toolbar Toggle Button ────────────────────────────────────────────────────

type SearchBarToggleButtonProps = {
  /** Accessible label / tooltip for the icon button. @default "Cari" */
  label?: string;
  /** Whether the search panel is currently open. */
  isOpen: boolean;
  /** Called when the button is clicked. */
  onToggle: () => void;
};

/**
 * A pre-styled toolbar icon button that opens and closes the search panel.
 * Renders in the "active" (highlighted) state when `isOpen` is true.
 */
export function SearchBarToggleButton({
  label = "Cari",
  isOpen,
  onToggle,
}: SearchBarToggleButtonProps) {
  return (
    <ToolbarIconButton
      icon="search"
      label={label}
      isActive={isOpen}
      onClick={onToggle}
    />
  );
}

// ─── Search Panel ─────────────────────────────────────────────────────────────

type SearchBarProps = {
  /** Current controlled search query value. */
  value: string;
  /** Called on every keystroke with the new value. */
  onChange: (value: string) => void;
  /** Called when the "Kosongkan" (clear) button is clicked. */
  onClear: () => void;
  /**
   * Label rendered above the input field.
   * @default "CARIAN"
   */
  label?: string;
  /**
   * Placeholder text shown inside the input when empty.
   * @default "Masukkan kata kunci carian..."
   */
  placeholder?: string;
  /**
   * Ref forwarded to the `<div>` wrapping the input so that
   * `useSearchBarLogic` can auto-focus the `<input>` on open.
   */
  inputRef?: React.RefObject<HTMLDivElement | null>;
};

/**
 * A reusable search panel consisting of a labelled text input and a
 * "Kosongkan" (clear) button.
 *
 * Use together with `useSearchBarLogic`, `SearchBarToggleButton`, and
 * `searchRecords` to build a complete, normalised search experience.
 *
 * @example
 * ```tsx
 * // 1. State & logic
 * const [query, setQuery] = useState("");
 * const { isOpen, searchInputRef, handleToggleSearch, handleClearSearch } =
 *   useSearchBarLogic({ value: query, onChange: setQuery });
 *
 * // 2. Filtered data (in a useMemo)
 * const filtered = useMemo(
 *   () => searchRecords(items, query, (item) => [item.name, item.code]),
 *   [items, query],
 * );
 *
 * // 3. Toolbar
 * <SearchBarToggleButton label="Cari rekod" isOpen={isOpen} onToggle={handleToggleSearch} />
 *
 * // 4. Panel (below the toolbar)
 * {isOpen && (
 *   <SearchBar
 *     value={query}
 *     onChange={setQuery}
 *     onClear={handleClearSearch}
 *     label="CARIAN MENGIKUT NAMA ATAU NO. KAD PENGENALAN"
 *     placeholder="Cth: Ahmad atau 950101-14-1234"
 *     inputRef={searchInputRef}
 *   />
 * )}
 * ```
 */
export default function SearchBar({
  value,
  onChange,
  onClear,
  label = "CARIAN",
  placeholder = "Masukkan kata kunci carian...",
  inputRef,
}: SearchBarProps) {
  const isSearchActive = value.trim().length > 0;

  return (
    <div className="rounded-lg bg-white p-4 shadow">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        {/* Input field */}
        <div ref={inputRef} className="flex-1">
          <InputField
            label={label}
            value={value}
            state="active"
            onChange={onChange}
            placeholder={placeholder}
            showLabel
            leadingIcon={
              <Icon icon="search" size={18} className="text-light-grey" />
            }
            className="w-full"
            activeBackgroundClass="bg-light-blue"
            inputFontSize={12}
            inputMinHeight={40}
          />
        </div>

        {/* Clear button */}
        <div className="flex items-center gap-3 self-start lg:self-end">
          <button
            type="button"
            className="inline-flex min-h-10 items-center rounded-xl border border-light-grey/25 bg-white px-4 py-2 text-sm font-semibold text-grey transition-colors hover:border-dark-blue hover:text-dark-blue disabled:cursor-not-allowed disabled:opacity-40"
            disabled={!isSearchActive}
            onClick={onClear}
          >
            Kosongkan
          </button>
        </div>
      </div>
    </div>
  );
}
