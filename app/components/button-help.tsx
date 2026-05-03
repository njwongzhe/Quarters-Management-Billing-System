"use client";

import { useState, useRef, useEffect } from "react";
import Icon from "./Icon";


export default function ButtonHelp() {
    const [isHelpOpen, setIsHelpOpen] = useState(false);
    const helpRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        function handleClickOutside(event: MouseEvent | TouchEvent) {
            if (helpRef.current && !helpRef.current.contains(event.target as Node)) {
                setIsHelpOpen(false);
            }
        }

        if (isHelpOpen) {
            document.addEventListener("mousedown", handleClickOutside, true);
            document.addEventListener("touchstart", handleClickOutside, true);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside, true);
            document.removeEventListener("touchstart", handleClickOutside, true);
        };
    }, [isHelpOpen]);

    return (
        <div className="relative" ref={helpRef}>
            <button
                type="button"
                className="flex text-grey hover:cursor-pointer hover:text-dark-blue hover:scale-[0.98] active:scale-[0.86]"
                onClick={() => setIsHelpOpen((value) => !value)}
                aria-expanded={isHelpOpen}
                aria-label="Bantuan"
                title="Bantuan"
            >
                <Icon icon="help" size={24} />
            </button>

            {isHelpOpen ? (
                <div className="flex flex-col absolute right-0 top-full z-100 w-max whitespace-nowrap border border-light-blue rounded-lg bg-white p-4 text-sm shadow-2xl mt-2">
                    <div className="font-medium text-grey mb-1">Sebarang Kemusykilan & Pertanyaan, Sila Hubungi:</div>
                    <div className="flex flex-row gap-1 font-bold text-dark-blue">
                        <Icon icon="email" size={16} />
                        <a href="mailto:helpdeskict@johor.gov.my" className="hover:underline">Emel: helpdeskict@johor.gov.my</a>
                    </div>
                    <div className="flex flex-row gap-1 font-bold text-dark-blue">
                        <Icon icon="phone" size={16} />
                        <a href="tel:+6072667777" className="hover:underline">Nombor Hotline: +607 266 7777</a>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
