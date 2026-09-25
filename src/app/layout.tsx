import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Salish Sea Ferry Map",
  description:
    "An interactive map of every ferry route across the Salish Sea — Washington State Ferries, BC Ferries, Black Ball Ferry Line, Kitsap Transit, Victoria Clipper, Puget Sound Express, and regional county and community ferries.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f4ed" },
    { media: "(prefers-color-scheme: dark)", color: "#0d1b17" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
