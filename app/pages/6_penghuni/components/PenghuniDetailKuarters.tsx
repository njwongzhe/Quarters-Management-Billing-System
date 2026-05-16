"use client";

import { useState, useEffect } from "react";
import { InputField, Topic } from "./InputField";
import CalenderField from "../../../components/CalenderField";

type FieldState = "active" | "inactive";

type PenghuniDetailKuartersProps = {
    quarters: {
        quarterName: string;
        unitCode: string;
        address: string | null;
        moveInDate: string | null;
        moveOutDate: string | null;
    } | null;
    totalArrearsAmount: {
        totalArrearsAmount: number | null;
    } | null;
    kemasKini?: boolean;
    unitId?: string;
    quarterId?: string;
};

type UnitOccupancy = {
    id: string;
    moveInDate: string;
    moveOutDate: string | null;
    resident: {
        fullName: string;
    };
};

function getArrearsTextClass(amount: number) {
    if (amount < 0)
        return "text-green";

    if (amount > 0)
        return "text-red";

    return "";
}

function formatDateInputValue(dateString: string | null | undefined) {
    if (!dateString) {
        return "";
    }

    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) {
        return "";
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function formatDateDisplayValue(dateInput: string) {
    if (!dateInput) {
        return "";
    }

    const date = new Date(`${dateInput}T00:00:00`);

    if (Number.isNaN(date.getTime())) {
        return "";
    }

    return date.toLocaleDateString("ms-MY", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).split("/").join("/");
}

function displayValue(value: string | null | undefined) {
    if (value == null || value === "") {
        return "N/A";
    }

    return value;
}

function getDatesBetween(startDate: string, endDate: string): string[] {
    const dates: string[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        dates.push(`${year}-${month}-${day}`);
    }

    return dates;
}

export default function PenghuniDetailKuarters(props: PenghuniDetailKuartersProps) {
    const { quarters, totalArrearsAmount, kemasKini = false, unitId, quarterId } = props;
    const fieldState: FieldState = kemasKini ? "active" : "inactive";
    const [moveInDate, setMoveInDate] = useState(formatDateInputValue(quarters?.moveInDate));
    const [moveOutDate, setMoveOutDate] = useState(formatDateInputValue(quarters?.moveOutDate));
    const [occupancies, setOccupancies] = useState<UnitOccupancy[]>([]);
    const [disabledDatesForMoveIn, setDisabledDatesForMoveIn] = useState<string[]>([]);
    const [disabledDatesForMoveOut, setDisabledDatesForMoveOut] = useState<string[]>([]);

    useEffect(() => {
        setMoveInDate(formatDateInputValue(quarters?.moveInDate));
        setMoveOutDate(formatDateInputValue(quarters?.moveOutDate));
    }, [quarters?.moveInDate, quarters?.moveOutDate]);

    useEffect(() => {
        async function fetchOccupancies() {
            if (!unitId || !quarterId) return;

            try {
                const response = await fetch(`/api/residents-quarters/${quarterId}/${unitId}`);
                const data = await response.json();

                if (data.success && data.data?.unit?.occupancies) {
                    setOccupancies(data.data.unit.occupancies);
                }
            } catch (error) {
                console.error("Failed to fetch occupancies:", error);
            }
        }

        fetchOccupancies();
    }, [unitId, quarterId]);

    useEffect(() => {
        const allDisabledDates: string[] = [];

        occupancies.forEach((occupancy) => {
            const start = occupancy.moveInDate;
            const end = occupancy.moveOutDate || new Date().toISOString().split("T")[0];

            const datesBetween = getDatesBetween(start, end);
            allDisabledDates.push(...datesBetween);
        });

        setDisabledDatesForMoveIn(allDisabledDates);

        if (moveInDate) {
            const moveOutDisabledDates: string[] = [];

            occupancies.forEach((occupancy) => {
                const start = occupancy.moveInDate;
                const end = occupancy.moveOutDate || new Date().toISOString().split("T")[0];

                const datesBetween = getDatesBetween(start, end);
                moveOutDisabledDates.push(...datesBetween);
            });

            setDisabledDatesForMoveOut(moveOutDisabledDates);
        }
    }, [occupancies, moveInDate]);

    function handleMoveInDateChange(newDate: string) {
        setMoveInDate(newDate);
        if (moveOutDate && newDate > moveOutDate) {
            setMoveOutDate("");
        }
    }

    function handleMoveOutDateChange(newDate: string) {
        if (moveInDate && newDate < moveInDate) {
            return;
        }

        setMoveOutDate(newDate);
    }

    return (
        <section className="flex flex-col gap-4">
            <Topic content="MAKLUMAT KUARTERS" />
            <div className="grid grid-cols-2 gap-4">
                <InputField label="KATEGORI" value={displayValue(quarters?.quarterName)} state="inactive" className="col-span-1"/>
                <InputField label="UNIT KUARTERS" value={displayValue(quarters?.unitCode)} state="inactive" className="col-span-1"/>
                <InputField label="ALAMAT KUARTERS" value={displayValue(quarters?.address)} state="inactive" className="col-span-2"/>
                <div className="col-span-1 grid grid-cols-2 gap-4">
                    <CalenderField
                        label="TARIKH MASUK"
                        value={moveInDate}
                        state={fieldState}
                        required
                        disabledDates={disabledDatesForMoveIn}
                        onChange={handleMoveInDateChange}
                        className="col-span-1"
                    />
                    <CalenderField
                        label="TARIKH KELUAR"
                        value={moveOutDate}
                        state={fieldState}
                        disabledDates={disabledDatesForMoveOut}
                        minDate={moveInDate || undefined}
                        onChange={handleMoveOutDateChange}
                        className="col-span-1"
                    />
                </div>
                <InputField label="TUNGGAKAN (RM)" value={totalArrearsAmount?.totalArrearsAmount != null ? `${Number(totalArrearsAmount.totalArrearsAmount).toFixed(2).toString()}` : displayValue("")} state="inactive" className={`col-span-1 ${totalArrearsAmount?.totalArrearsAmount != null ? getArrearsTextClass(Number(totalArrearsAmount.totalArrearsAmount)) : ""}`}/>
            </div>
        </section>
    );
}