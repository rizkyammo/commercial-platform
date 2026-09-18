import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { BRAND } from "@/lib/constants/brand";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: BRAND.name,
  description: BRAND.description,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-[#F6F6F7] text-[#1D1D1F] antialiased">
        {children}
      </body>
    </html>
  );
}