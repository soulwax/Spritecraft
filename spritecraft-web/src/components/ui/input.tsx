// File: spritecraft-web/src/components/ui/input.tsx

import type * as React from "react";

import { cn } from "~/lib/utils";

function Input({ className, type = "text", ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
	return (
		<input
			className={cn(
				"flex h-11 w-full rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-4 py-2 text-sm text-[color:var(--foreground)] shadow-sm outline-none transition focus-visible:ring-2 focus-visible:ring-[color:var(--ring)] placeholder:text-[color:var(--muted-foreground)] disabled:cursor-not-allowed disabled:opacity-50",
				className,
			)}
			type={type}
			{...props}
		/>
	);
}

export { Input };
