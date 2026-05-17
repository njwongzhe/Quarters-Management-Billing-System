"use client";

import ButtonHelp from "@/app/components/Layout/ButtonHelp";
import ButtonLogout from "@/app/components/Layout/ButtonLogout";

export default function Header() {
    return (
        <header className="flex flex-row justify-end gap-5 p-4">
            <ButtonHelp />
            <ButtonLogout />
        </header>
    );
}