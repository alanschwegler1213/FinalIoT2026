import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Monitor de albahaca",
    short_name: "Albahaca",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f7f2",
    theme_color: "#2f7d32",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
