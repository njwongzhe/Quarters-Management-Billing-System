"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { buildDiceBearAvatarUrl } from "@/lib/profile/avatar";

import { PROFILE_ROUTES, ROUTES, SIDEBAR_ROUTES } from "../../constants/routes"; 

type SidebarProfile = {
    fullName: string;
    gender: string | null;
    sessionLoginAt: string | null;
};

function isRouteActive(pathname: string, href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
}

export default function Sidebar() {
    const pathname = usePathname();
    const [profile, setProfile] = useState<SidebarProfile | null>(null);

    useEffect(() => {
        let isMounted = true;

        async function loadProfile() {
            try {
                const response = await fetch("/api/profile", {
                    cache: "no-store",
                });
                const result = await response.json();

                if (!response.ok || !result.success) {
                    return;
                }

                if (isMounted) {
                    setProfile(result.data.profile as SidebarProfile);
                }
            } catch {
                if (isMounted) {
                    setProfile(null);
                }
            }
        }

        loadProfile();

        return () => {
            isMounted = false;
        };
    }, []);

    const profileName = profile?.fullName || "Admin";
    const avatarUrl = buildDiceBearAvatarUrl(profileName, profile?.gender);
    const loginTime = formatLoginTime(profile?.sessionLoginAt ?? null);

    return (
        <aside className="h-full bg-dark-grey px-4 pt-6 pb-4">
            <nav className="flex h-full flex-col gap-4">
                <div className="flex flex-col gap-6">
                    {/* Logo */}
                    <Link href={ROUTES.lamanUtama} className="flex flex-row gap-2 justify-center items-center hover:opacity-80 transition-opacity cursor-pointer">
                        <img src="/favicon.ico" alt="logo" className="w-10 h-10" />
                        <div className="flex flex-col">
                            <span className="text-sm font-bold text-white tracking-wider">KERAJAAN</span>
                            <span className="text-sm font-bold text-white tracking-wider">NEGERI JOHOR</span>
                            <span className="text-[8.5px] text-light-grey">System Pengurusan Kuarters</span>
                        </div>
                    </Link>

                    {/* Normal Routes */}
                    <div className="flex flex-col gap-1">
                        {SIDEBAR_ROUTES.map((route) => {
                            const active = isRouteActive(pathname, route.href);

                            return (
                                <Link
                                    key={route.href}
                                    href={route.href}
                                    className={`group flex items-center gap-2 rounded-md px-4 py-3 text-sm transition-colors ${
                                        active
                                        ? "bg-white/10 text-white border-l-5 border-l-blue-500"
                                        : "hover:bg-white/10 hover:text-white text-light-grey hover:border-l-5 hover:border-l-grey"
                                    }`}
                                >
                                    {/* Icon */}
                                    <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>{route.icon}</span>

                                    {/* Name */}
                                    <span className="text-xs font-medium">{route.label}</span>
                                </Link>
                            );
                        })}
                    </div>
                </div>

                <div className="flex flex-col gap-4 mt-auto ">
                    {/* Separator */}
                    <hr className="border-grey/40" />

                    {/* Profile */}
                    <div>
                        {PROFILE_ROUTES.map((route) => {
                            const active = isRouteActive(pathname, route.href);

                            return (
                                <Link
                                    key={route.href}
                                    href={route.href}
                                    className={`group flex min-w-0 items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                                        active
                                            ? "bg-white/10 text-white"
                                            : "text-light-grey hover:bg-white/10 hover:text-white"
                                    }`}
                                >
                                    <span
                                        className="h-9 w-9 shrink-0 rounded-md bg-cover bg-center bg-no-repeat ring-1 ring-white/10"
                                        style={{ backgroundImage: `url("${avatarUrl}")` }}
                                        aria-label={`Avatar ${profileName}`}
                                        role="img"
                                    />
                                    <div className="flex min-w-0 flex-col">
                                        <span className="truncate text-xs font-bold text-white">{profileName}</span>
                                        <span className="text-light-grey/80 font-extralight text-[10px]">Log Masuk:</span>
                                        <span className="text-light-grey/80 font-extralight text-[10px]">{loginTime}</span>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </nav>
        </aside>
    );
}

function formatLoginTime(value: string | null) {
    if (!value) {
        return "---";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "---";
    }

    return new Intl.DateTimeFormat("ms-MY", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    }).format(date);
}
