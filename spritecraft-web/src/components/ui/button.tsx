// File: spritecraft-web/src/components/ui/button.tsx

import Link from "next/link";
import type * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "~/lib/utils";

const buttonVariants = cva(
	"inline-flex items-center justify-center rounded-xl text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ring)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
	{
		variants: {
			variant: {
				default:
					"bg-[color:var(--accent)] text-[color:var(--accent-foreground)] hover:opacity-90",
				secondary:
					"border border-[color:var(--border)] bg-white/5 text-[color:var(--foreground)] hover:bg-white/10",
				ghost:
					"text-[color:var(--muted-foreground)] hover:bg-white/10 hover:text-[color:var(--foreground)]",
			},
			size: {
				default: "h-10 px-4 py-2",
				sm: "h-9 px-3",
				lg: "h-11 px-5",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	},
);

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
	VariantProps<typeof buttonVariants> & {
		asChild?: boolean;
	};

function Button({
	className,
	variant,
	size,
	asChild = false,
	...props
}: ButtonProps) {
	const Comp = asChild ? Slot : "button";

	return (
		<Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />
	);
}

export { Button, buttonVariants };
