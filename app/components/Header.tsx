"use client";

import { useRouter } from "next/navigation";

export default function Header() {
    const router = useRouter();

    // Helper function to handle logout by calling the API route and then redirecting to the login page.
    async function handleLogout() {
        try {
            await fetch("/api/auth/logout", {
                method: "POST",
            });

            // Redirect to login page after logout.
            router.push("/pages/0_authentication");
        } catch (error) {
            console.error("Logout failed:", error);
        }
    }

    return (
        <header className="flex flex-row justify-end gap-5 p-4">
            <span className="material-symbols-outlined text-grey">notifications</span>
            <span className="material-symbols-outlined text-grey">help</span>
            <button
                type="button"
                className="material-symbols-outlined text-red hover:cursor-pointer hover:text-dark-blue"
                onClick={handleLogout}
                title="Logout"
            >
                logout
            </button>
        </header>
    );
}