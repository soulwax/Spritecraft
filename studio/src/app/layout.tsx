// File: studio/src/app/layout.tsx

import "~/styles/globals.css";

import type { Metadata } from "next";
import { Geist } from "next/font/google";

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
				{children}
			</body>
		</html>
	);
}


