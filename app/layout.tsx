import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Soundrobe",
  description: "Music-to-fashion translator MVP",
  keywords: ["soundrobe", "music fashion", "awin"],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full bg-[#c7c7c7] text-[#111111]">{children}</body>
    </html>
  );
}
