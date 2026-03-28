// File: spritecraft-web/src/app/layout.tsx

import "~/styles/globals.css";

import type { Metadata } from "next";
import { Geist } from "next/font/google";

export const metadata: Metadata = {
	title: "SpriteCraft Web",
	description: "Kanagawa-themed Next.js shell for the SpriteCraft Studio migration.",
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
				{children}
			</body>
		</html>
	);
}
