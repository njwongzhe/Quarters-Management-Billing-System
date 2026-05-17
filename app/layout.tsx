"use client";

import "./globals.css";
import { usePathname } from "next/navigation";
import Header from "./components/Layout/Header";
import Sidebar from "./components/Layout/Sidebar";
import { ROUTES, SHELL_ROUTES, SHELL_ROUTE_PREFIXES } from "./constants/routes";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();

  // Shell Route is those pages that should show the shell (Sidebar + Header).
  const isAuthRoute = pathname?.startsWith(ROUTES.auth);
  const isShellRoute = 
    (pathname ? SHELL_ROUTES.has(pathname as any) : false) ||
    (pathname ? SHELL_ROUTE_PREFIXES.some((route) => pathname === route || pathname.startsWith(`${route}/`))
              : false);
  const shouldShowShell = !isAuthRoute && isShellRoute;

  return (
    <html lang="en">
      {/* Import Google Manrope font for headings and UI elements and Google Material Symbols font for icons. */}
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;700;800&amp;display=swap"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
        />
      </head>
      
      <body className="h-screen overflow-hidden">
        {shouldShowShell 
          ? ( // Show the shell (Sidebar + Header) if user not on auth route. (User already logged in.)
            <div className="grid h-full grid-cols-[220px_minmax(0,1fr)]">
              <Sidebar />
              <div className="grid h-full min-w-0 grid-rows-[auto_minmax(0,1fr)] overflow-hidden">
                <Header />
                <main className="min-h-0 overflow-y-auto p-6">{children}</main>
              </div>
            </div>
          ) 
          : ( // Otherwise just show the page content (e.g. for auth route when user not logged in yet).
            children
          )}
      </body>
    </html>
  );
}
