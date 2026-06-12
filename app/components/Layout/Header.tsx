"use client";

import { useEffect, useState } from "react";
import Icon from "@/app/components/Icon/Icon";
import ButtonHelp from "@/app/components/Layout/ButtonHelp";
import ButtonLogout from "@/app/components/Layout/ButtonLogout";
import ButtonTheme from "@/app/components/Layout/ButtonTheme";

export default function Header() {
    const [mounted, setMounted] = useState(false);
    const [formattedDate, setFormattedDate] = useState<string>("");
    const [formattedTime, setFormattedTime] = useState<string>("");

    useEffect(() => {
        const updateTime = () => {
            const now = new Date();
            const dateString = now.toLocaleDateString("ms-MY", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
            });
            const timeString = now.toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: true,
            });
            setFormattedDate(dateString);
            setFormattedTime(timeString);
        };

        updateTime();
        setMounted(true);
        const interval = setInterval(updateTime, 1000);

        return () => clearInterval(interval);
    }, []);

    return (
        <header className="app-header flex flex-row items-center justify-end gap-5 p-4">
            <div className={`mr-auto flex items-center gap-3 transition-opacity duration-300 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
                {/* Portal target for back button */}
                <div id="header-back-portal" className="flex items-center" />

                <div className="flex items-center gap-3 rounded-full border border-light-grey/20 bg-light-grey/10 px-4 py-1.5 text-xs font-medium text-grey">
                    <div className="flex items-center gap-1.5 text-dark-blue">
                        <Icon icon="schedule" size={16} className="animate-pulse" />
                        <span className="font-bold text-dark-blue">{formattedTime || "00:00:00"}</span>
                    </div>
                    <div className="h-3 w-px bg-light-grey/40" />
                    <div className="flex items-center gap-1.5 text-grey/80">
                        <Icon icon="calendar" size={16} />
                        <span className="font-semibold">{formattedDate || "Hari, 00 Bulan 0000"}</span>
                    </div>
                </div>
            </div>
            <ButtonTheme />
            <ButtonHelp />
            <ButtonLogout />
        </header>
    );
}
