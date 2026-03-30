// File: studio/src/app/layout.tsx

import "~/styles/globals.css";

import type { Metadata } from "next";
import { Geist } from "next/font/google";

import { Badge } from "~/components/ui/badge";
import { StudioNav } from "~/app/_components/studio-nav";
import { StudioThemeController } from "~/app/_components/studio-theme-controller";

export const metadata: Metadata = {
	title: "SpriteCraft Studio",
	description: "Kanagawa-themed Next.js frontend for the primary SpriteCraft creator experience.",
	icons: [{ rel: "icon", url: "/favicon.svg", type: "image/svg+xml" }],
};

const geist = Geist({
	subsets: ["latin"],
	variable: "--font-geist-sans",
});

export default function RootLayout({
	children,
}: Readonly<{ children: React.ReactNode }>) {
	return (
		<html className={`${geist.variable}`} lang="en">
			<body className="antialiased">
				<StudioThemeController />
				<div className="studio-shell mx-auto flex min-h-screen w-full max-w-[1400px] flex-col px-5 py-6 sm:px-8 lg:px-10 lg:py-8">
					<header className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
						<div className="flex items-center gap-4">
							<div className="flex size-12 items-center justify-center rounded-2xl border border-[color:var(--border-strong)] bg-[color:var(--surface-strong)] text-lg font-semibold text-[color:var(--accent)] shadow-[0_12px_32px_rgba(0,0,0,0.2)]">
								SC
							</div>
							<div>
								<div className="flex flex-wrap items-center gap-2">
									<p className="text-lg font-semibold text-[color:var(--foreground)]">
										SpriteCraft
									</p>
									<Badge variant="success">Studio</Badge>
								</div>
								<p className="text-sm text-[color:var(--muted-foreground)]">
									LPC character creator, project browser, and export workspace.
								</p>
							</div>
						</div>
						<StudioNav />
					</header>
					{children}
				</div>
			</body>
		</html>
	);
}


