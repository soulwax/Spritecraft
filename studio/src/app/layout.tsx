// File: studio/src/app/layout.tsx

import "~/styles/globals.css";

import type { Metadata } from "next";
import { Geist } from "next/font/google";

import { SpriteCraftBrand } from "~/app/_components/spritecraft-brand";
import { StudioNav } from "~/app/_components/studio-nav";
import { StudioToastCenter } from "~/app/_components/studio-toast-center";
import { StudioThemeController } from "~/app/_components/studio-theme-controller";

export const metadata: Metadata = {
	title: "SpriteCraft Studio",
	description:
		"Sprite-first creation workspace for layered characters, export-ready spritesheets, and AI-assisted planning.",
	icons: [
		{ rel: "icon", url: "/favicon.svg", type: "image/svg+xml" },
		{ rel: "icon", url: "/favicon.ico" },
	],
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
				<StudioToastCenter />
				<div className="studio-shell mx-auto flex min-h-screen w-full max-w-[1400px] flex-col px-5 py-6 sm:px-8 lg:px-10 lg:py-8">
					<header className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
						<SpriteCraftBrand />
						<StudioNav />
					</header>
					{children}
				</div>
			</body>
		</html>
	);
}


