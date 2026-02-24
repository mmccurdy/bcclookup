import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Baltimore County Councilmanic District Lookup",
  description:
    "Find your current and future (2026) Baltimore County Council district by address.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-slate-50 text-slate-900">
        {children}
      </body>
    </html>
  );
}
