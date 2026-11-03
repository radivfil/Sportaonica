import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Sportaonica — sportska škola za djecu",
    short_name: "Sportaonica",
    start_url: "/",
    display: "standalone",
    background_color: "#FFFCF3",
    theme_color: "#FCE8FB",
    lang: "hr",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
