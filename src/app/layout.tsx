import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NavBar } from "@/components/ui/nav-bar";
import { RealtimeProvider } from "@/components/realtime-provider";
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
  title: "World Cup 2026 Bracket",
  description: "Predict scores, compete with friends, and follow the FIFA World Cup 2026 live.",
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
        <RealtimeProvider>
          <main className="flex flex-1 flex-col">{children}</main>
        </RealtimeProvider>
      </body>
    </html>
  );
}
