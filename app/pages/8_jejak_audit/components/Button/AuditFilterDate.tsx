"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import FilterDate from "@/app/components/FIlter/FilterDate";
import { commonIcons } from "@/app/components/Icon/Icon";
import ToolbarIconButton from "@/app/components/ToolbarIconButton";
import {
	buildAuditLogQueryString,
	type AuditLogFilters,
} from "../auditLogClient";

type AuditFilterDateProps = {
	filters: AuditLogFilters;
	onBeforeOpen?: () => void;
};

export default function AuditFilterDate({
	filters,
	onBeforeOpen,
}: AuditFilterDateProps) {
	const router = useRouter();
	const panelRef = useRef<HTMLDivElement | null>(null);
	const [isOpen, setIsOpen] = useState(false);

	// Normalize URL date filters into the shape expected by the date picker UI.
	const dateValue = useMemo(
		() => ({
			startDate: filters.dateFrom ?? "",
			endDate: filters.dateTo ?? "",
		}),
		[filters.dateFrom, filters.dateTo],
	);

	// Close the panel when the user clicks outside of this component.
	useEffect(() => {
		if (!isOpen) {
			return;
		}

		function handlePointerDown(event: PointerEvent) {
			const target = event.target;

			if (!(target instanceof Node)) {
				return;
			}

			// FilterDate calendar is rendered in a portal; clicks inside it
			// should not be treated as outside-click for this panel.
			if (target instanceof Element && target.closest("[data-filter-date-calendar]")) {
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

	// Persist selected filters into URL params and reset table pagination.
	function pushFilters(nextFilters: AuditLogFilters) {
		router.replace(
			`/pages/8_jejak_audit${buildAuditLogQueryString(nextFilters, { page: 1 })}`,
		);
	}

	const isActive = isOpen || Boolean(filters.dateFrom || filters.dateTo);

	return (
		<div ref={panelRef} className="relative">
			<ToolbarIconButton
				icon={commonIcons.calendar}
				label="Tapis tarikh rekod audit"
				isActive={isActive}
				onClick={() => {
					const nextIsOpen = !isOpen;
					if (nextIsOpen) {
						onBeforeOpen?.();
					}
					setIsOpen(nextIsOpen);
				}}
			/>

			{isOpen ? (
				<FilterDate
					title="Tarikh"
					description="Pilih julat tarikh rekod yang ingin dipaparkan."
					ariaLabel="Tapisan tarikh rekod audit"
					value={dateValue}
					onApply={(nextValue) => {
						pushFilters({
							...filters,
							dateFrom: nextValue.startDate || undefined,
							dateTo: nextValue.endDate || undefined,
						});
					}}
					onClear={() => {
						pushFilters({
							...filters,
							dateFrom: undefined,
							dateTo: undefined,
						});
						setIsOpen(false);
					}}
				/>
			) : null}
		</div>
	);
}