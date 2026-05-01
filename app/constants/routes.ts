// Edit the ROUTES object to add/remove/update routes in the application. 
// Make sure to also update the SHELL_ROUTES, SHELL_ROUTE_PREFIXES, SIDEBAR_ROUTES and PROFILE_ROUTES accordingly to ensure the new/updated routes are properly handled in the layout and navigation.
export const ROUTES = {
  home: "/",
  pagesRoot: "/pages",
  auth: "/pages/0_authentication",
  authApi: "/api/auth",
  lamanUtama: "/pages/1_laman_utama",
  muatNaik: "/pages/2_muat_naik",
  bayaran: "/pages/3_bayaran",
  tunggakan: "/pages/4_tunggakan",
  transaksi: "/pages/5_transaksi",
  penghuni: "/pages/6_penghuni",
  kuarters: "/pages/7_kuarters",
  jejakAudit: "/pages/8_jejak_audit",
  profile: "/pages/9_profile",
} as const;

// Shell Routes are those routes that should show the shell (Sidebar + Header).
export const SHELL_ROUTES = new Set([
  ROUTES.home,
  ROUTES.pagesRoot,
  ROUTES.lamanUtama,
  ROUTES.muatNaik,
  ROUTES.bayaran,
  ROUTES.tunggakan,
  ROUTES.transaksi,
  ROUTES.penghuni,
  ROUTES.kuarters,
  ROUTES.jejakAudit,
  ROUTES.profile,
]);

// Shell Route Prefixes are those route prefixes that should show the shell (Sidebar + Header).
// However, since we have dynamic routes under /pages (e.g. /pages/1_laman_utama/:id), we can't list them all in SHELL_ROUTES. 
// Instead, we can use SHELL_ROUTE_PREFIXES to specify the prefixes of those routes that should show the shell.
export const SHELL_ROUTE_PREFIXES = [ROUTES.kuarters] as const; 

// Sidebar routes are those routes that should be shown in the sidebar navigation.
export const SIDEBAR_ROUTES = [
  { href: ROUTES.lamanUtama, label: "Laman Utama", icon: "home" },
  { href: ROUTES.muatNaik, label: "Muat Naik", icon: "upload" },
  { href: ROUTES.bayaran, label: "Bayaran", icon: "payment" },
  { href: ROUTES.tunggakan, label: "Tunggakan", icon: "warning" },
  { href: ROUTES.transaksi, label: "Transaksi", icon: "receipt" },
  { href: ROUTES.penghuni, label: "Pengurusan Penghuni", icon: "group" },
  { href: ROUTES.kuarters, label: "Pengurusan Kuarters", icon: "apartment" },
  { href: ROUTES.jejakAudit, label: "Jejak Audit", icon: "history" },
] as const;

// Profile routes are those routes that should be shown in the profile dropdown in the header.
export const PROFILE_ROUTES = [
  { href: ROUTES.profile, label: "Profile", icon: "person" },
] as const;
