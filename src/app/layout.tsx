import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NavBar } from "@/components/ui/nav-bar";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "World Cup 2026 Bracket — Archive",
  description:
    "Final results and league leaderboards from the FIFA World Cup 2026 bracket game.",
  icons: {
    icon: "/soccer-ball.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <NavBar />
        <div className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-center text-xs text-amber-500">
          Tournament archive — the 2026 World Cup is over. Final standings are
          frozen; predictions and leagues are read-only.
        </div>
        <main className="flex flex-1 flex-col">{children}</main>
      </body>
    </html>
  );
}
