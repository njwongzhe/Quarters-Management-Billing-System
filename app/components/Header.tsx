"use client";

import ButtonHelp from "@/app/components/button-help";
import ButtonLogout from "@/app/components/button-logout";

export default function Header() {
    return (
        <header className="flex flex-row justify-end gap-5 p-4">
            <ButtonHelp />
            <ButtonLogout />
        </header>
    );
}