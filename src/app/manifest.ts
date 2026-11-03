import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Pop Corn Mexa · Ventas",
    short_name: "Pop Corn Mexa",
    description: "Punto de venta de Pop Corn Mexa",
    start_url: "/venta",
    display: "standalone",
    orientation: "any",
    background_color: "#fff6e6",
    theme_color: "#fbd651",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
