import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "SpriteCraft Web",
  description:
    "Parallel T3 migration shell for SpriteCraft's browser studio workflow.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
