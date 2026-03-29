// File: studio/src/components/ui/card.tsx

import type * as React from "react";

import { cn } from "~/lib/utils";

function Card({
	className,
	...props
}: React.HTMLAttributes<HTMLDivElement>) {
	return (
		<div
			className={cn(
				"rounded-[28px] border border-[color:var(--border)] bg-[color:var(--card)] shadow-[0_20px_80px_rgba(0,0,0,0.18)]",
				className,
			)}
			{...props}
		/>
	);
}

function CardHeader({
	className,
	...props
}: React.HTMLAttributes<HTMLDivElement>) {
	return <div className={cn("flex flex-col gap-2 p-6", className)} {...props} />;
}

function CardTitle({
	className,
	...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
	return (
		<h3
			className={cn("text-balance font-semibold text-xl tracking-tight", className)}
			{...props}
		/>
	);
}

function CardDescription({
	className,
	...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
	return (
		<p
			className={cn("text-sm text-[color:var(--muted-foreground)]", className)}
			{...props}
		/>
	);
}

function CardContent({
	className,
	...props
}: React.HTMLAttributes<HTMLDivElement>) {
	return <div className={cn("p-6 pt-0", className)} {...props} />;
}

export { Card, CardContent, CardDescription, CardHeader, CardTitle };

