import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Salish Sea Ferry Map",
    short_name: "Ferry Map",
    description: "An interactive map of every ferry route across the Salish Sea.",
    start_url: "/",
    display: "standalone",
    background_color: "#f5f4ed",
    theme_color: "#176b4a",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
