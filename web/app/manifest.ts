import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Monitor de albahaca",
    short_name: "Albahaca",
    start_url: "/",
    display: "standalone",
    background_color: "#16211b",
    theme_color: "#16211b",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
