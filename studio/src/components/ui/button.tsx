// File: studio/src/components/ui/button.tsx

import type * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "~/lib/utils";

const buttonVariants = cva(
	"inline-flex items-center justify-center gap-2 rounded-2xl text-sm font-medium transition-[transform,background-color,border-color,color,opacity] duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--background)] disabled:pointer-events-none disabled:opacity-50",
	{
		variants: {
			variant: {
				default:
					"border border-transparent bg-[color:var(--accent)] text-[color:var(--accent-foreground)] shadow-[0_18px_40px_rgba(126,156,216,0.2)] hover:-translate-y-0.5 hover:opacity-95",
				secondary:
					"border border-[color:var(--border)] bg-[color:var(--surface-soft)] text-[color:var(--foreground)] hover:-translate-y-0.5 hover:border-[color:var(--border-strong)] hover:bg-[color:var(--surface-strong)]",
				ghost:
					"text-[color:var(--muted-foreground)] hover:bg-[color:var(--surface-soft)] hover:text-[color:var(--foreground)]",
			},
			size: {
				default: "h-11 px-4 py-2.5",
				sm: "h-9 px-3",
				lg: "h-12 px-5 text-sm",
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

