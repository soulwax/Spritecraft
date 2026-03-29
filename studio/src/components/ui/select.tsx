// File: studio/src/components/ui/select.tsx

import type * as React from "react";

import { cn } from "~/lib/utils";

function Select({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "flex h-11 w-full rounded-2xl border border-(--border) bg-(--surface-soft) px-4 py-2 text-sm text-(--foreground) shadow-sm outline-none transition focus-visible:ring-2 focus-visible:ring-(--ring) disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export { Select };

