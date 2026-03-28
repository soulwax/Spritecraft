// File: spritecraft-web/src/components/ui/badge.tsx

import type * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "~/lib/utils";

const badgeVariants = cva(
	"inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium",
	{
		variants: {
			variant: {
				default:
					"border-[color:var(--border)] bg-white/5 text-[color:var(--foreground)]",
				success:
					"border-emerald-400/30 bg-emerald-400/10 text-emerald-100",
				warning:
					"border-amber-400/30 bg-amber-400/10 text-amber-100",
				destructive:
					"border-rose-400/30 bg-rose-400/10 text-rose-100",
			},
		},
		defaultVariants: {
			variant: "default",
		},
	},
);

type BadgeProps = React.HTMLAttributes<HTMLDivElement> &
	VariantProps<typeof badgeVariants>;

function Badge({ className, variant, ...props }: BadgeProps) {
	return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
