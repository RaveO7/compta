"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import ThemeToggle from "./ThemeToggle";

const liens = [
  { href: "/", label: "Vue d'ensemble", icon: "M3 13h8V3H3v10Zm0 8h8v-6H3v6Zm10 0h8V11h-8v10Zm0-18v6h8V3h-8Z" },
  { href: "/suivi", label: "Suivi mensuel", icon: "M7 2v2M17 2v2M3 8h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm3 9h2v2H8v-2Zm6 0h2v2h-2v-2Z" },
  { href: "/stock", label: "Stock & bilan", icon: "M3 3h18v4H3V3Zm2 4v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V7M9 11h6" },
  { href: "/boutiques", label: "Boutiques", icon: "M3 9l1-5h16l1 5M4 9v11h16V9M9 13h6v7H9v-7Z" },
  { href: "/articles", label: "Articles", icon: "M20 7L12 3 4 7m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex md:w-64 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--surface)] p-4 sticky top-0 h-screen">
      <div className="flex items-center gap-3 px-2 py-3 mb-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--primary)] text-white font-bold">
          €
        </div>
        <div>
          <p className="font-bold leading-tight">Ma Compta</p>
          <p className="text-xs text-[var(--muted)]">Ventes &amp; envois</p>
        </div>
      </div>

      <nav className="flex flex-col gap-1">
        {liens.map((lien) => {
          const active =
            lien.href === "/"
              ? pathname === "/"
              : pathname.startsWith(lien.href);
          return (
            <Link
              key={lien.href}
              href={lien.href}
              className={`nav-link ${active ? "active" : ""}`}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d={lien.icon} />
              </svg>
              {lien.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto px-2 pt-4">
        <ThemeToggle />
        <p className="mt-3 text-xs text-[var(--muted)]">
          Données enregistrées en local
        </p>
      </div>
    </aside>
  );
}
