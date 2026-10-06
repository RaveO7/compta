"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import ThemeToggle from "./ThemeToggle";

const liens = [
  { href: "/", label: "Vue d'ensemble" },
  { href: "/suivi", label: "Suivi" },
  { href: "/stock", label: "Stock" },
  { href: "/boutiques", label: "Boutiques" },
  { href: "/articles", label: "Articles" },
];

export default function MobileNav() {
  const pathname = usePathname();
  return (
    <header className="md:hidden sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--surface)]">
      <div className="flex items-center gap-2 px-4 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--primary)] text-white font-bold">
          €
        </div>
        <p className="font-bold">Ma Compta</p>
        <div className="ml-auto">
          <ThemeToggle />
        </div>
      </div>
      <nav className="flex gap-1 overflow-x-auto px-3 pb-2">
        {liens.map((lien) => {
          const active =
            lien.href === "/"
              ? pathname === "/"
              : pathname.startsWith(lien.href);
          return (
            <Link
              key={lien.href}
              href={lien.href}
              className={`nav-link whitespace-nowrap ${active ? "active" : ""}`}
            >
              {lien.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
