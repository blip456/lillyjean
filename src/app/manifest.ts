import type { MetadataRoute } from "next";

import messages from "../../messages/en.json";

/** Web app manifest: installable on the home screen (PWA basics, Sprint 2). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: messages.app.name,
    short_name: messages.app.name,
    description: messages.app.tagline,
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fbf9f4",
    theme_color: "#1f1d1a",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
