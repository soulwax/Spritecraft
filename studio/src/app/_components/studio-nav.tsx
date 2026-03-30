"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "~/lib/utils";

const navItems = [
  { href: "/", label: "Overview" },
  { href: "/projects", label: "Projects" },
  { href: "/builder", label: "Builder" },
] as const;

export function StudioNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="flex flex-wrap items-center gap-2 rounded-full border border-[color:var(--border)] bg-[color:var(--surface-soft)]/80 p-1.5 backdrop-blur-md"
    >
      {navItems.map((item) => {
        const isActive =
          pathname === item.href ||
          (item.href !== "/" && pathname.startsWith(item.href));

        return (
          <Link
            className={cn(
              "rounded-full px-4 py-2 text-sm font-medium transition-colors duration-200",
              isActive
                ? "bg-[color:var(--accent)] text-[color:var(--accent-foreground)]"
                : "text-[color:var(--muted-foreground)] hover:bg-[color:var(--surface-strong)] hover:text-[color:var(--foreground)]",
            )}
            href={item.href}
            key={item.href}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
