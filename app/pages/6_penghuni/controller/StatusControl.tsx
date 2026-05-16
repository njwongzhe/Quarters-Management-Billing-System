import { calculateAgeByIc } from "@/app/utils/resident";
import type { DropdownOption } from "../../../components/InputField";

export type ResidentStatusRuleResult = {
    options: DropdownOption[];
    state: "active" | "inactive";
    forcedStatus?: string;
    allowedStatuses: string[];
};

export function resolveResidentStatusRules(
    originalStatus: string,
    currentIcNumber: string,
    editing: boolean,
    statusOptions: DropdownOption[],
): ResidentStatusRuleResult {
    const age = currentIcNumber ? calculateAgeByIc(currentIcNumber) : null;

    if (originalStatus === "DATA_TIDAK_LENGKAP") {
        return {
            options: [{ label: "Data Tidak Lengkap", color: "text-x-lengkap" }],
            state: "inactive",
            forcedStatus: "DATA_TIDAK_LENGKAP",
            allowedStatuses: ["DATA_TIDAK_LENGKAP"],
        };
    }

    if (Number(age) >= 60) {
        return {
            options: [{ label: "Tidak Layak", color: "text-x-layak" }],
            state: "inactive",
            forcedStatus: "TIDAK_LAYAK",
            allowedStatuses: ["TIDAK_LAYAK"],
        };
    }

    if (Number(age) === 59) {
        return {
            options: [
                { label: "Pencen Mendatang", color: "text-pencen-datang" },
                { label: "Tidak Layak", color: "text-x-layak" },
            ],
            state: editing ? "active" : "inactive",
            forcedStatus: "PENCEN_MENDATANG",
            allowedStatuses: ["PENCEN_MENDATANG", "TIDAK_LAYAK"],
        };
    }

    if (originalStatus === "AKTIF") {
        return {
            options: [
                { label: "Aktif", color: "text-aktif" },
                { label: "Tidak Layak", color: "text-x-layak" },
            ],
            state: editing ? "active" : "inactive",
            allowedStatuses: ["AKTIF", "TIDAK_LAYAK"],
        };
    }

    if (originalStatus === "TIDAK_LAYAK") {
        return {
            options: [
                { label: "Aktif", color: "text-aktif" },
                { label: "Tidak Layak", color: "text-x-layak" },
            ],
            state: editing ? "active" : "inactive",
            allowedStatuses: ["TIDAK_LAYAK", "AKTIF"],
        };
    }

    if (originalStatus === "PENCEN_MENDATANG") {
        return {
            options: [
                { label: "Pencen Mendatang", color: "text-pencen-datang" },
                { label: "Tidak Layak", color: "text-x-layak" },
            ],
            state: editing ? "active" : "inactive",
            allowedStatuses: ["PENCEN_MENDATANG", "TIDAK_LAYAK"],
        };
    }

    return {
        options: statusOptions,
        state: editing ? "active" : "inactive",
        allowedStatuses: ["AKTIF", "TIDAK_LAYAK", "PENCEN_MENDATANG", "DATA_TIDAK_LENGKAP"],
    };
}