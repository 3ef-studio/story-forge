import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ToastProvider } from "@/app/components/ui/toast";
import Footer from "@/app/components/footer";


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
  title: "Story Forge - AI-Powered Superhero RPG",
  description:
    "Become a powered individual in a world of heroes and villains. Every decision shapes your destiny in this AI-powered text RPG.",
  keywords: ["RPG", "text game", "superhero", "AI", "interactive fiction"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ToastProvider>{children}</ToastProvider>
        <Footer />
      </body>
    </html>
  );
}
