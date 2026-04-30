"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const routesNormal = [
    { href: "/pages/1_laman_utama", label: "Laman Utama", icon: "home" },
    { href: "/pages/2_muat_naik", label: "Muat Naik", icon: "upload" },
    { href: "/pages/3_bayaran", label: "Bayaran", icon: "payment" },
    { href: "/pages/4_tunggakan", label: "Tunggakan", icon: "warning" },
    { href: "/pages/5_transaksi", label: "Transaksi", icon: "receipt" },
    { href: "/pages/6_penghuni", label: "Pengurusan Penghuni", icon: "group" },
    { href: "/pages/7_kuarters", label: "Pengurusan Kuarters", icon: "apartment" },
    { href: "/pages/8_jejak_audit", label: "Jejak Audit", icon: "history" },
];

const routeProfile = [
    { href: "/pages/9_profile", label: "Profile", icon: "person" },
];

function isRouteActive(pathname: string, href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
}

export default function Sidebar() {
    const pathname = usePathname();

    return (
        <aside className="h-full bg-dark-grey px-4 pt-6 pb-4">
            <nav className="flex h-full flex-col gap-4">
                <div className="flex flex-col gap-6">
                    {/* Logo */}
                    <div className="flex flex-row gap-2 justify-center items-center">
                        <img src="/favicon.ico" alt="logo" className="w-10 h-10" />
                        <div className="flex flex-col">
                            <span className="text-sm font-bold text-white tracking-wider">KERAJAAN</span>
                            <span className="text-sm font-bold text-white tracking-wider">NEGERI JOHOR</span>
                            <span className="text-[8.5px] text-light-grey">System Pengurusan Kuarters</span>
                        </div>
                    </div>

                    {/* Normal Routes */}
                    <div className="flex flex-col gap-1">
                        {routesNormal.map((route) => {
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
                        {routeProfile.map((route) => {
                            const active = isRouteActive(pathname, route.href);

                            return (
                                <Link
                                    key={route.href}
                                    href={route.href}
                                    className={`group flex min-w-0 items-center gap-3 px-3 py-2 text-sm transition-colors ${
                                        active
                                            ? "bg-white/10 text-white"
                                            : "text-light-grey hover:bg-white/10 hover:text-white"
                                    }`}
                                >
                                    <span className="material-symbols-outlined bg-[#2D367D] text-white rounded-md p-2" style={{ fontSize: "18px" }}>{route.icon}</span>
                                    <div className="flex min-w-0 flex-col">
                                        <span className="truncate text-xs font-bold text-white">Username</span>
                                        <span className="text-light-grey/80 font-extralight text-[10px]">Log Masuk: ---</span>
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