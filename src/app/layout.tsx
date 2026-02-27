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
      <body className="antialiased min-h-screen text-slate-50">
        <div
          className="min-h-screen bg-cover bg-center"
          style={{ backgroundImage: "url('/maryland-flag.jpg')" }}
        >
          <div className="min-h-screen bg-slate-950/75 backdrop-blur-xl">
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
