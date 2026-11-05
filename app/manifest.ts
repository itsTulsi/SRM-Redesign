import type { MetadataRoute } from "next";

/** Lets phones add the site to the home screen; the service worker (public/sw.js) keeps key pages working offline. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SRM Institute of Science and Technology",
    short_name: "SRMIST",
    description: "Programmes, fees, campuses and admissions at SRMIST. Key pages work offline.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#0B1B4D",
    theme_color: "#0B1B4D",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
